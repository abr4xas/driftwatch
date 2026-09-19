/**
 * `--migrate-config`: the way off the formats
 * [ADR-0013](../../docs/adr/0013-a-config-is-data-not-a-program.md) withdrew.
 *
 * Withdrawing a format without a route off it buys the project a property at
 * its users' expense, so this is not an accessory to that decision — it is half
 * of it.
 *
 * It is also the **only** place left that imports a config module, and that is
 * deliberate rather than an oversight. The ADR's objection is to driftwatch
 * executing code it finds while auditing, which is what a discovery corpus of
 * two thousand strangers' repositories makes concrete. A user naming this
 * command, in their own repository, to convert their own file, once, is the
 * case that was never the problem.
 */
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { findConfig, validateConfig, type Config } from '../core/config.ts'
import { messageOf, UserError } from '../core/errors.ts'

/** What was converted into what. The caller prints it. */
export type Migration = {
  /** The config that was read, relative to the repo root. */
  from: string
  /** The config that was written, relative to the repo root. */
  written: string
}

const TARGET = 'driftwatch.config.yaml'

const WITHDRAWN = ['driftwatch.config.ts', 'driftwatch.config.js'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * The import the tool's own documentation told people to write.
 *
 * `docs/guide/usage.md` taught `import { defineConfig } from 'driftwatch'`
 * until 2026-09-18, and that import cannot resolve in the situation the
 * migration exists for. The advertised way to run driftwatch is `npx`, which
 * installs nothing in the target repository, so the specifier has nothing to
 * resolve *to* — and once ADR-0013 withdrew `defineConfig` from the public API,
 * it fails even where the package is installed.
 *
 * A type-only import is not affected: type stripping erases it before Node
 * resolves anything, which `ROADMAP.md` already records. Only the value import
 * breaks, which is why this pattern requires the braces to name `defineConfig`.
 */
const DEFINE_CONFIG_IMPORT =
  /^[^\S\n]*import\s*\{[^}]*\bdefineConfig\b[^}]*\}\s*from\s*['"](?:driftwatch|@abr4xas\/driftwatch)['"];?[^\S\n]*$/mu

/**
 * Replaces that import with the function it was importing.
 *
 * `defineConfig` is `(config) => config` and always was — its whole purpose is
 * to attach a type to an object literal. So substituting it locally changes
 * nothing about what the config evaluates to, which is the only reason this is
 * a legitimate transformation rather than a guess about somebody's code.
 *
 * Text substitution on a source file is exactly the fragile technique this
 * project avoids, and it is bounded here in a way that matters: the pattern
 * matches one import of one name from two known specifiers, and when it does
 * not match, **nothing is rewritten** and the import fails with its own error.
 * There is no silent half-transformation.
 */
function neutraliseImport(source: string): string | undefined {
  if (!DEFINE_CONFIG_IMPORT.test(source)) return undefined
  return source.replace(DEFINE_CONFIG_IMPORT, 'const defineConfig = (value) => value')
}

/**
 * Imports the module and takes its default export.
 *
 * When the config imports `defineConfig` from the package, a neutralised copy
 * is written **beside the original** and imported instead. Beside, not in a
 * temp directory, because a config is allowed to import its own siblings and
 * moving it would break those specifiers — `./shared.ts` has to keep meaning
 * what it meant.
 *
 * Everything this can throw is the user's file failing, not ours, so it all
 * arrives as a `UserError` with the underlying message attached. A stack trace
 * from inside somebody's config is noise to the person who has to fix it.
 */
async function importConfig(path: string, where: string): Promise<unknown> {
  const source = await readFile(path, 'utf8')
  const neutralised = neutraliseImport(source)

  let target = path
  if (neutralised !== undefined) {
    // The extension has to survive: Node decides whether to strip types by it.
    target = path.replace(/(\.[cm]?[jt]s)$/u, `.driftwatch-migrate-${process.pid}$1`)
    await writeFile(target, neutralised, 'utf8')
  }

  try {
    const module: unknown = await import(pathToFileURL(target).href)
    if (isRecord(module) && 'default' in module) return module.default
    return module
  } catch (error) {
    throw new UserError(`${where} could not be loaded`, messageOf(error))
  } finally {
    // Whatever happened, the copy does not outlive the call.
    if (target !== path) await rm(target, { force: true })
  }
}

/**
 * YAML for a validated config, written by hand rather than by `yaml`'s
 * stringifier.
 *
 * The shape is small and closed — three optional lists of strings, one map of
 * string to string, one integer — so serialising it is a dozen lines, and
 * every value is quoted. Quoting is not cosmetic: `'off'` is the severity most
 * likely to appear here and an unquoted `off` is a **boolean** to a YAML 1.1
 * parser, which is the trap `INIT_TEMPLATE` already warns about in prose.
 *
 * The output is validated by the caller before it is written, so the promise
 * this makes — that what comes out is what `loadConfig` reads back in — is
 * checked rather than asserted.
 */
function toYaml(config: Config): string {
  const lines: string[] = [
    '# driftwatch configuration',
    '# Converted from a module config by `driftwatch --migrate-config`.',
    '# The original is still there; delete it once this file looks right.',
    '',
  ]

  const list = (key: string, values: readonly string[] | undefined): void => {
    if (values === undefined) return
    if (values.length === 0) {
      lines.push(`${key}: []`)
      return
    }
    lines.push(`${key}:`)
    for (const value of values) lines.push(`  - '${value.replaceAll("'", "''")}'`)
  }

  list('sources', config.sources)
  list('ignore', config.ignore)
  list('knownPaths', config.knownPaths)

  if (config.checks !== undefined) {
    const entries = Object.entries(config.checks)
    if (entries.length === 0) lines.push('checks: {}')
    else {
      lines.push('checks:')
      // Both sides quoted: the id carries a slash and the value `off` is a
      // boolean unquoted.
      for (const [id, severity] of entries) lines.push(`  '${id}': '${severity}'`)
    }
  }

  if (config.staleThreshold !== undefined) {
    lines.push(`staleThreshold: ${config.staleThreshold}`)
  }

  return `${lines.join('\n')}\n`
}

/**
 * Converts the repo's module config to YAML beside it.
 *
 * Order matters and each step earns its place: find the module config, refuse
 * early if the destination is taken, import, **validate**, and only then write.
 * Validating before writing is what keeps a broken config from being converted
 * into a broken config in a new format — the failure would otherwise land on
 * the next run, in a file the user did not write.
 *
 * The original is left alone. Deleting a file as a side effect of a conversion
 * is a larger promise than this needs to make, and the result is a repo with
 * two configs where the withdrawn one still wins the lookup — so the caller's
 * message has to say "now delete it", and it does.
 */
export async function migrateConfig(root: string): Promise<Migration> {
  const found = await findConfig(root)
  const from = WITHDRAWN.find((name) => found?.where === name)
  if (from === undefined) {
    throw new UserError(
      'there is no .ts or .js config to migrate',
      found === undefined
        ? 'run `driftwatch --init` to create one'
        : `the config in this repo is ${found.where}, which driftwatch already reads`,
    )
  }

  const target = join(root, TARGET)
  const existing = await findConfig(root, { skip: WITHDRAWN })
  if (existing !== undefined) {
    throw new UserError(
      `${existing.where} already exists`,
      `delete ${from} instead — ${existing.where} is the config driftwatch would read once it is gone`,
    )
  }

  const raw = await importConfig(join(root, from), from)
  const config = validateConfig(raw, from)

  await writeFile(target, toYaml(config), 'utf8')
  return { from, written: TARGET }
}
