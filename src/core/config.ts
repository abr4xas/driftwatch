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
import { pathToFileURL } from 'node:url'
import { messageOf, UserError } from './errors.ts'

/** What a check can be set to from the config. */
export type CheckSeverity = 'error' | 'warning' | 'off'

export type Config = {
  /** Extra sources beyond the ones discovery finds. Literal paths or globs. */
  sources?: readonly string[]
  ignore?: readonly string[]
  checks?: Readonly<Record<string, CheckSeverity>>
  knownPaths?: readonly string[]
  staleThreshold?: number
}

/** Identity, for the types. It exists so a `.ts` config gets completion. */
export function defineConfig(config: Config): Config {
  return config
}

/**
 * Lookup order, from `SPEC.md` § 7. The first one found wins and the search
 * stops: two configs in the same repo is a mistake we would rather surface as
 * "the other one is being ignored" than silently merge.
 */
const CONFIG_FILENAMES: readonly string[] = [
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
 * Imports a `.ts` or `.js` config.
 *
 * No transpiler is involved: Node strips the types itself, unflagged since
 * 22.18 and 23.6, and the floor is 24 (ADR-0002). That is why there is no
 * `jiti` dependency — see the note in `AGENTS.md` § Dependencies.
 *
 * The consequence is that a config using syntax type stripping cannot erase
 * (an `enum`, a `namespace`, a parameter property) fails. The error says so,
 * and no config in the specification needs any of it.
 */
async function importConfig(path: string, where: string): Promise<unknown> {
  let module: unknown
  try {
    module = await import(pathToFileURL(path).href)
  } catch (error) {
    throw new UserError(`${where} could not be loaded`, messageOf(error))
  }
  if (isRecord(module) && 'default' in module) return module.default
  return module
}

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
  if (extension === '.ts' || extension === '.js' || extension === '.mjs') {
    return validateConfig(await importConfig(path, where), where)
  }
  throw new UserError(
    `unsupported config extension: ${extension}`,
    'use a .yaml, .json, .ts or .js file, or the driftwatch key in package.json',
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

/**
 * The first config the lookup order finds, without loading it.
 *
 * `loadConfig` uses it for the automatic lookup, and `--init` uses it to refuse
 * rather than write a second config next to an existing one.
 */
export async function findConfig(root: string): Promise<FoundConfig | undefined> {
  for (const name of CONFIG_FILENAMES) {
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
