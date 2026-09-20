/**
 * The optional config file (`docs/spec/SPEC.md` § 7).
 *
 * `sources` and `checks` reach the pipeline. `ignore`, `knownPaths` and
 * `staleThreshold` are validated and carried anyway, because a config written
 * against the specification should not fail against an incomplete
 * implementation — an unknown key is an error, and a key that exists in the
 * spec is not unknown. `src/cli/init.ts` is where that split is visible to the
 * user: what is inert is written commented out.
 */
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { messageOf, UserError } from './errors.ts'

/** What a check can be set to from the config. */
export type CheckSeverity = 'error' | 'warning' | 'off'

export type Config = {
  /** Extra sources beyond the ones discovery finds. Literal paths or globs. */
  sources?: readonly string[]
  /**
   * Directories whose children are skill directories, on top of the built-in
   * ones. `skills`, `.flue/skills`, `packages/x/skills`.
   *
   * Additive on purpose: a typo costs the entry and nothing else. A list that
   * *replaced* the built-ins would let one misspelling silence the check
   * across a whole repository, and silence is the failure mode this key exists
   * to fix — an install root nobody has heard of is a repository audited to a
   * green run that means nothing. Ticket `12`.
   */
  skillRoots?: readonly string[]
  ignore?: readonly string[]
  checks?: Readonly<Record<string, CheckSeverity>>
  knownPaths?: readonly string[]
  staleThreshold?: number
}

/**
 * Lookup order, from `SPEC.md` § 7. The first one found wins and the search
 * stops: two configs in the same repo is a mistake we would rather surface as
 * "the other one is being ignored" than silently merge.
 */
const CONFIG_FILENAMES: readonly string[] = [
  // The withdrawn formats keep their place: found, refused, and never loaded.
  // See `refuseModuleConfig`.
  'driftwatch.config.ts',
  'driftwatch.config.js',
  'driftwatch.config.json',
  'driftwatch.config.yaml',
  'driftwatch.config.yml',
]

export const KNOWN_KEYS: readonly string[] = [
  'sources',
  'ignore',
  'checks',
  'knownPaths',
  'staleThreshold',
  // Last on purpose: the unknown-key message lists these in order and the
  // older entries are what a reader recognises first.
  'skillRoots',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalid(where: string, problem: string): UserError {
  return new UserError(`invalid config in ${where}: ${problem}`)
}

function stringArray(value: unknown, key: string, where: string): readonly string[] {
  if (!Array.isArray(value)) throw invalid(where, `${key} has to be an array of strings`)
  const items: readonly unknown[] = value
  if (items.some((item) => typeof item !== 'string')) {
    throw invalid(where, `${key} has to be an array of strings`)
  }
  return items.filter((item): item is string => typeof item === 'string')
}

function severityMap(value: unknown, where: string): Readonly<Record<string, CheckSeverity>> {
  if (!isRecord(value)) throw invalid(where, 'checks has to be an object')
  const out: Record<string, CheckSeverity> = {}
  for (const [id, severity] of Object.entries(value)) {
    if (severity !== 'error' && severity !== 'warning' && severity !== 'off') {
      // `off` is a severity here and a boolean in YAML 1.1, where `off`, `no`
      // and `n` all read as false. The `yaml` package implements 1.2, so an
      // unquoted `off` arrives as the string and works — but a file edited
      // with a 1.1 parser somewhere else does not, and the value that shows up
      // is `false`. Naming the quotes is the difference between a fix that
      // takes a second and an afternoon spent doubting the check ids.
      const hint =
        typeof severity === 'boolean'
          ? "quote it: in YAML, an unquoted off, no or false is a boolean, and 'off' is the severity"
          : undefined
      throw new UserError(
        `invalid config in ${where}: checks['${id}'] has to be 'error', 'warning' or 'off'`,
        hint,
      )
    }
    out[id] = severity
  }
  return out
}

/**
 * Validates whatever the config exported.
 *
 * An unknown key **fails** instead of being ignored. A typo in `ignore` that
 * silently disables the ignore list is worse than a red run: the tool would
 * keep working and stop doing what the file says.
 */
export function validateConfig(raw: unknown, where: string): Config {
  if (raw === undefined || raw === null) return {}
  if (!isRecord(raw)) throw invalid(where, 'it has to export an object')

  for (const key of Object.keys(raw)) {
    if (!KNOWN_KEYS.includes(key)) {
      throw invalid(where, `unknown key '${key}'; the known ones are ${KNOWN_KEYS.join(', ')}`)
    }
  }

  const config: Config = {}
  if (raw.sources !== undefined) config.sources = stringArray(raw.sources, 'sources', where)
  if (raw.skillRoots !== undefined) {
    config.skillRoots = stringArray(raw.skillRoots, 'skillRoots', where)
  }
  if (raw.ignore !== undefined) config.ignore = stringArray(raw.ignore, 'ignore', where)
  if (raw.knownPaths !== undefined) {
    config.knownPaths = stringArray(raw.knownPaths, 'knownPaths', where)
  }
  if (raw.checks !== undefined) config.checks = severityMap(raw.checks, where)
  if (raw.staleThreshold !== undefined) {
    const threshold = raw.staleThreshold
    if (typeof threshold !== 'number' || !Number.isInteger(threshold) || threshold <= 0) {
      throw invalid(where, 'staleThreshold has to be a positive integer')
    }
    config.staleThreshold = threshold
  }
  return config
}

async function readJson(path: string, where: string): Promise<unknown> {
  const text = await readFile(path, 'utf8')
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new UserError(`${where} is not valid JSON`, messageOf(error))
  }
}

/**
 * The formats withdrawn by
 * [ADR-0013](../../docs/adr/0013-a-config-is-data-not-a-program.md), and the
 * reason they are named here rather than simply absent.
 *
 * A config in one of these keeps its place in the lookup order and **fails**.
 * Skipping it silently would load the next candidate and leave the author
 * believing the `.ts` is in effect, which is the two-configs-in-one-repo case
 * the order exists to surface — only worse, because nothing would say so.
 */
const WITHDRAWN_EXTENSIONS: readonly string[] = ['.ts', '.js', '.mjs', '.cjs']

/**
 * Refuses a module config, without loading it.
 *
 * Not loading it is the whole point rather than an implementation detail: a
 * `.ts` config is a program, and until this function existed driftwatch ran it.
 * The corpus work in `.scratch/corpus-adjudication-at-scale/` is what made that
 * visible — a discovery corpus executes the configs of two thousand strangers —
 * and `PRODUCT.md`'s "deterministic, offline, no network, no API key" wants
 * "and it runs no code it finds in your repository" next to it.
 *
 * The error carries the way out. Withdrawing a format and leaving the user to
 * work out the conversion buys us a property at their expense.
 */
function refuseModuleConfig(path: string, where: string): never {
  throw new UserError(
    `${where} is a ${extname(path)} config, which driftwatch no longer loads`,
    'a config is data, not a program (ADR-0013). Run `driftwatch --migrate-config` ' +
      'to convert it to YAML, then delete the original',
  )
}

/**
 * Reads a YAML config.
 *
/**
 * Reads a YAML config.
 *
 * `yaml` is already a runtime dependency — `src/parse/frontmatter.ts` needs it
 * for `frontmatter/invalid` and `skill/frontmatter` — but it is imported here
 * **lazily**, because that path only runs when a document actually has
 * frontmatter and this one would otherwise run on every invocation. The
 * cold-start budget is 80 ms and `AGENTS.md` § Dependencies is explicit that it
 * is part of the product.
 */
async function readYaml(path: string, where: string): Promise<unknown> {
  const [{ parse }, text] = await Promise.all([import('yaml'), readFile(path, 'utf8')])
  try {
    return parse(text)
  } catch (error) {
    throw new UserError(`${where} is not valid YAML`, messageOf(error))
  }
}

async function loadFrom(path: string, where: string): Promise<Config> {
  const extension = extname(path)
  if (extension === '.json') return validateConfig(await readJson(path, where), where)
  if (extension === '.yaml' || extension === '.yml') {
    return validateConfig(await readYaml(path, where), where)
  }
  if (WITHDRAWN_EXTENSIONS.includes(extension)) refuseModuleConfig(path, where)
  throw new UserError(
    `unsupported config extension: ${extension}`,
    'use a .yaml, .yml or .json file, or the driftwatch key in package.json',
  )
}

export type LoadConfigOptions = {
  /** The repo root: where the automatic lookup happens. */
  root: string
  /** Where an explicit `--config` is resolved from. */
  cwd: string
  /** `--config <path>`, `false` for `--no-config`, `undefined` to look it up. */
  explicit: string | false | undefined
}

export type LoadedConfig = {
  config: Config
  /** The file it came from, or `undefined` if there was none. */
  path: string | undefined
}

export type FoundConfig = {
  /** Absolute path of the file holding it. */
  path: string
  /** How it is named in messages: the filename, or `package.json#driftwatch`. */
  where: string
  /** Whether it is the `driftwatch` key inside package.json rather than a file of its own. */
  inManifest: boolean
}

export type FindConfigOptions = {
  /**
   * Filenames to pass over.
   *
   * `--migrate-config` needs to ask "what would the loader read **once the
   * module config is gone**", which is not a question the plain lookup can
   * answer: the module config is first in the order, so it always wins.
   */
  skip?: readonly string[]
}

/**
 * The first config the lookup order finds, without loading it.
 *
 * `loadConfig` uses it for the automatic lookup, `--init` uses it to refuse
 * rather than write a second config next to an existing one, and
 * `--migrate-config` uses it twice — once for what is there, once with the
 * withdrawn names skipped, for what would be there afterwards.
 */
export async function findConfig(
  root: string,
  options: FindConfigOptions = {},
): Promise<FoundConfig | undefined> {
  const skip = options.skip ?? []
  for (const name of CONFIG_FILENAMES) {
    if (skip.includes(name)) continue
    const path = join(root, name)
    if (existsSync(path)) return { path, where: name, inManifest: false }
  }

  // Last in the order: the `driftwatch` key in package.json. Absence of the
  // key is not an error, unlike absence of an explicitly requested file.
  const manifest = join(root, 'package.json')
  if (existsSync(manifest)) {
    const parsed = await readJson(manifest, 'package.json')
    if (isRecord(parsed) && parsed.driftwatch !== undefined) {
      return { path: manifest, where: 'package.json#driftwatch', inManifest: true }
    }
  }

  return undefined
}

export async function loadConfig(options: LoadConfigOptions): Promise<LoadedConfig> {
  if (options.explicit === false) return { config: {}, path: undefined }

  if (options.explicit !== undefined) {
    const path = resolve(options.cwd, options.explicit)
    if (!existsSync(path)) {
      throw new UserError(`config file does not exist: ${options.explicit}`)
    }
    return { config: await loadFrom(path, options.explicit), path }
  }

  const found = await findConfig(options.root)
  if (found === undefined) return { config: {}, path: undefined }

  if (found.inManifest) {
    // Read again rather than threaded through `findConfig`: the manifest is a
    // few kilobytes and one shape beats two return types.
    const parsed = await readJson(found.path, 'package.json')
    const raw = isRecord(parsed) ? parsed.driftwatch : undefined
    return { config: validateConfig(raw, found.where), path: found.path }
  }

  return { config: await loadFrom(found.path, found.where), path: found.path }
}
