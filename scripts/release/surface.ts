/**
 * The surface `1.0.0` freezes, derived from the code rather than typed.
 *
 * `.scratch/v1-contract-freeze/spec.md` names eight of them: the exit codes,
 * the check ids, the CLI flags, the `--json` contract, the shapes `github` and
 * `sarif` emit, the config's accepted keys, the names the package exports, and
 * the Node floor. Removing or reshaping any of them is a major version, and
 * the point of writing them into one committed file is that the question
 * "did we break the contract?" becomes a diff somebody accepted rather than a
 * thing somebody noticed afterwards.
 *
 *   pnpm surface
 *
 * It writes `CONTRACT.md` and nothing else. `test/surface.test.ts` regenerates
 * it and fails when the committed copy and the code disagree.
 *
 * Two decisions shape what is in here.
 *
 * **It records the surface as it stands, defects included.** A flag that is
 * advertised and refuses to run is listed with the refusal on it, and a config
 * key nothing reads is listed as accepted. The tickets that close those
 * defects are verified by the diff they make here, so tidying anything on the
 * way past would erase the evidence they are checked against.
 *
 * **The output shapes are observed from a real run**, over a repository this
 * script builds in a temporary directory, rather than read off the reporters.
 * An artifact transcribed from the code it describes records what somebody
 * intended; this one records what came out. It is the lesson of
 * `site/corpus-data.js`, which was written by hand once and then published a
 * measurement nobody recomputed for two rounds.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { FORMATS, OPTIONS, parseCliArgs } from '../../src/cli/args.ts'
import { HELP } from '../../src/cli/help.ts'
import { UNIMPLEMENTED_BOOLEANS } from '../../src/cli/main.ts'
import { KNOWN_KEYS, validateConfig } from '../../src/core/config.ts'
import { EXIT } from '../../src/core/exit-codes.ts'
import { applyFixes } from '../../src/fix/session.ts'
import { renderGithub } from '../../src/report/github.ts'
import { renderJson } from '../../src/report/json.ts'
import { renderSarif } from '../../src/report/sarif.ts'
import * as api from '../../src/index.ts'
import { run, type RunOptions } from '../../src/run.ts'
import { CHECKS } from '../../src/verify/checks/index.ts'
import { REPO_ROOT } from '../lib/paths.ts'

/** The committed artifact, at the repository root where a reviewer meets it. */
export const ARTIFACT = 'CONTRACT.md'

// ---------------------------------------------------------------------------
// The surfaces that are read from the modules
// ---------------------------------------------------------------------------

/**
 * The exit codes, with the meaning `--help` publishes for each.
 *
 * The number and the promise come from two places on purpose: `EXIT` is what
 * the code returns and the help text is what a caller read before writing the
 * `if` in their workflow. A contract that froze only the first would be frozen
 * around the half nobody reads.
 */
function exitCodes(): string[] {
  const meanings = new Map<number, string>()
  const block = HELP.split('\nExit codes\n')[1] ?? ''
  for (const line of block.split('\n')) {
    const match = /^ {2}(\d)\s{2}(.+)$/u.exec(line)
    if (match?.[1] === undefined || match[2] === undefined) continue
    meanings.set(Number(match[1]), match[2].trim())
  }

  return Object.entries(EXIT).map(([name, code]) => {
    const meaning = meanings.get(code)
    if (meaning === undefined) throw new Error(`--help documents no exit code ${code}`)
    return `- \`${code}\` \`${name}\` — ${meaning}`
  })
}

/**
 * The check ids, with the two facts the version policy branches on: a tier 1
 * check defaults to error and can turn a green run red, so adding one is a
 * major; a tier 2 check defaults to warning and cannot, so adding one is a
 * minor.
 */
function checkIds(): string[] {
  return CHECKS.map((check) => check)
    .toSorted((a, b) => a.id.localeCompare(b.id))
    .map((check) => `- \`${check.id}\` — tier ${check.tier}, defaults to ${check.defaultSeverity}`)
}

/** What `node:util`'s parser is handed for one flag. */
type OptionSpec = { type: 'boolean' | 'string'; short?: string }

/**
 * The flags, as three separate facts about each one.
 *
 * **Accepted** is the parser: it is what decides whether a command line is
 * rejected as unknown. **Advertised** is `--help`: it is what a caller read
 * before typing it. **Refused** is `UNIMPLEMENTED_BOOLEANS`, the to-do list
 * the entry point keeps — a flag that parses and then exits 2 saying it is not
 * implemented yet.
 *
 * The three disagree today, which is the defect ticket `03` closes and the
 * reason they are three columns rather than one line.
 */
function cliFlags(): string[] {
  const specs: Record<string, OptionSpec> = OPTIONS
  const refused = new Set(UNIMPLEMENTED_BOOLEANS.map(([, flag]) => flag))

  const flags = Object.entries(specs)
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([name, spec]) => {
      const flag = `--${name}`
      const value = spec.type === 'string' ? ' <value>' : ''
      const short = spec.short === undefined ? '' : `, -${spec.short}`
      const notes = [
        HELP.includes(flag) ? 'advertised' : 'undocumented',
        refused.has(flag) ? 'refused at runtime' : 'implemented',
      ]
      return `- \`${flag}${short}${value}\` — ${notes.join(', ')}`
    })

  // Positionals are not a flag and they are part of the same contract: a
  // pre-commit hook passing the staged files depends on them being accepted.
  const positionals = parseCliArgs(['docs', 'README.md']).paths
  if (positionals.length !== 2) throw new Error('positional paths are no longer accepted')
  return [...flags, '', 'Positional arguments narrow the run to those paths. Any number of them.']
}

/** The formats `--format` takes, and the one a bare run gets. */
function formats(): string[] {
  const fallback = parseCliArgs([]).format
  return FORMATS.map((format) => `- \`${format}\`${format === fallback ? ' (the default)' : ''}`)
}

/**
 * The config's accepted keys, the severities a check can be set to, and the
 * one behaviour that matters as much as the list: an unknown key is an error
 * rather than a key that silently does nothing.
 *
 * The severities and the refusal are **observed** by calling the validator,
 * because both are promises about what happens to somebody's file and neither
 * is visible in a type at runtime.
 */
function configFormat(): string[] {
  const accepts = (raw: unknown): boolean => {
    try {
      validateConfig(raw, ARTIFACT)
      return true
    } catch {
      return false
    }
  }

  const severities = ['error', 'warning', 'off'].filter((severity) =>
    accepts({ checks: { 'path/missing': severity } }),
  )
  if (severities.length === 0) throw new Error('the config accepts no severity at all')

  return [
    ...KNOWN_KEYS.toSorted((a, b) => a.localeCompare(b)).map((key) => `- \`${key}\``),
    '',
    `Severities a check can be set to: ${severities.map((one) => `\`${one}\``).join(', ')}.`,
    '',
    accepts({ 'not-a-key': true })
      ? 'An unknown key is accepted and ignored.'
      : 'An unknown key is refused: the run fails rather than silently doing nothing.',
  ]
}

/**
 * The names the package entry point exports.
 *
 * The values are read from the module, which is the only way to observe them;
 * the types are parsed out of its source, which is the only way to see them at
 * all, since nothing of a type survives to runtime. The two are cross-checked
 * against each other so a value that stops being exported cannot pass as a
 * type that was never there.
 */
function exportedNames(): string[] {
  const source = readFileSync(join(REPO_ROOT, 'src', 'index.ts'), 'utf8')
  const exported = new Map<string, 'value' | 'type'>()

  for (const match of source.matchAll(/export\s+(type\s+)?\{([^}]*)\}/gu)) {
    const typeOnly = match[1] !== undefined
    for (const entry of (match[2] ?? '').split(',')) {
      const name = entry.trim()
      if (name.length === 0) continue
      const isType = typeOnly || name.startsWith('type ')
      exported.set(name.replace(/^type\s+/u, ''), isType ? 'type' : 'value')
    }
  }

  const declared = [...exported].filter(([, kind]) => kind === 'value').map(([name]) => name)
  const actual = Object.keys(api)
  const missing = declared.filter((name) => !actual.includes(name))
  const extra = actual.filter((name) => !declared.includes(name))
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `src/index.ts parses to values [${declared.join(', ')}] and exports [${actual.join(', ')}]`,
    )
  }

  return [...exported]
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([name, kind]) => `- \`${name}\` (${kind})`)
}

/** The Node floor: raising it breaks an install, so it is part of the contract. */
function nodeFloor(): string {
  const manifest: unknown = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8'))
  const engines =
    typeof manifest === 'object' && manifest !== null && 'engines' in manifest
      ? manifest.engines
      : undefined
  const node =
    typeof engines === 'object' && engines !== null && 'node' in engines ? engines.node : undefined
  if (typeof node !== 'string') throw new Error('package.json declares no engines.node')
  return node
}

// ---------------------------------------------------------------------------
// The surfaces that are observed from a run
// ---------------------------------------------------------------------------

/**
 * The repository the shapes are read off.
 *
 * It is built to produce one of everything the formats can carry, because a
 * key that no finding happened to have is a key the artifact would not freeze:
 *
 * - a finding with a suggestion the fixer will act on (`src/lib/auth.ts`, with
 *   a single namesake one directory over),
 * - a finding with no suggestion at all (`src/parse/gone.ts`, whose basename
 *   nothing in the repository shares), so that `suggestion` is recorded as the
 *   optional key it is,
 * - a source git lists and the working tree does not have, so that the
 *   `skipped` block is not an empty array.
 */
function observationRepo(withDanglingSource: boolean): string {
  const files: Record<string, string> = {
    'CLAUDE.md': [
      '# Fixture',
      '',
      'Auth lives in `src/lib/auth.ts`.',
      '',
      'The parser is `src/parse/gone.ts`.',
      '',
    ].join('\n'),
    'src/auth/auth.ts': 'export const auth = 1\n',
  }

  const root = mkdtempSync(join(tmpdir(), 'driftwatch-surface-'))
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content, 'utf8')
  }

  if (withDanglingSource) {
    // The shape an uninitialised submodule leaves behind: in the index, absent
    // from the working tree. See `SkipReason`.
    symlinkSync('vendor/not-checked-out/AGENTS.md', join(root, 'AGENTS.md'))
  }

  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root })
  execFileSync('git', ['add', '-A'], { cwd: root })
  return root
}

/** The documents the fixtures produce, in each format. */
type Observed = {
  /** One per run: with a skipped source and without one. */
  json: unknown[]
  /** The same documents from a `--fix --dry-run`, which carry the edits. */
  jsonWithFixes: unknown[]
  github: string
  sarif: unknown[]
}

/**
 * One run of one fixture, in every format.
 *
 * Two of them are taken, differing only in whether a source was skipped,
 * because a key that a single run happens to carry would be recorded as one
 * that is always there. SARIF's `invocations` is the case: it is emitted only
 * when there is something to report about the run itself, and one observation
 * cannot tell "always present" from "present this time".
 */
async function observeRepo(withDanglingSource: boolean): Promise<{
  json: unknown
  jsonWithFixes: unknown
  github: string
  sarif: unknown
}> {
  const root = observationRepo(withDanglingSource)
  try {
    const options: RunOptions = { cwd: root, config: false }
    const result = await run(options)

    // A fixture that stopped producing one of these would quietly shrink the
    // contract, and a shrunken contract is the failure this file exists to
    // make impossible. It fails loudly instead.
    const withSuggestion = result.findings.filter((finding) => finding.suggestion !== undefined)
    const withoutSuggestion = result.findings.filter((finding) => finding.suggestion === undefined)
    if (withSuggestion.length === 0) throw new Error('the fixture produced no suggestion')
    if (withoutSuggestion.length === 0) throw new Error('the fixture produced no bare finding')
    if (result.fixable === 0) throw new Error('the fixture produced nothing fixable')
    if (withDanglingSource === (result.skipped.length === 0)) {
      throw new Error(
        `the fixture skipped ${result.skipped.length} sources, which is the wrong way`,
      )
    }

    const { after, outcome } = await applyFixes(result, options, {
      dryRun: true,
      warn: () => {},
    })
    if (outcome.entries.length === 0) throw new Error('the dry run planned no edit')

    return {
      json: JSON.parse(renderJson(result)),
      jsonWithFixes: JSON.parse(renderJson(after, { fixes: outcome })),
      github: renderGithub(result),
      sarif: JSON.parse(renderSarif(result)),
    }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

async function observe(): Promise<Observed> {
  const skipped = await observeRepo(true)
  const clean = await observeRepo(false)
  return {
    json: [skipped.json, clean.json],
    jsonWithFixes: [skipped.jsonWithFixes, clean.jsonWithFixes],
    // The annotation line is the same shape in both; one is enough for it.
    github: skipped.github,
    sarif: [skipped.sarif, clean.sarif],
  }
}

/**
 * Every key path in a document, with `[]` for an array and `$` for the root.
 *
 * A key is **optional** when some instance of the object holding it did not
 * carry it — one finding has a `suggestion` and another does not. That is the
 * distinction a consumer needs and the one a single example loses, so it is
 * counted rather than assumed: `present` counts the times a key was seen,
 * `instances` the times its container was.
 */
function keyPaths(documents: readonly unknown[]): string[] {
  const instances = new Map<string, number>()
  const present = new Map<string, number>()

  const walk = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item, `${path}[]`)
      return
    }
    if (typeof node !== 'object' || node === null) return

    instances.set(path, (instances.get(path) ?? 0) + 1)
    for (const [key, value] of Object.entries(node)) {
      const child = `${path}.${key}`
      present.set(child, (present.get(child) ?? 0) + 1)
      walk(value, child)
    }
  }
  for (const document of documents) walk(document, '$')

  return [...present.keys()]
    .toSorted((a, b) => a.localeCompare(b))
    .map((path) => {
      const container = path.slice(0, path.lastIndexOf('.'))
      const optional = (present.get(path) ?? 0) < (instances.get(container) ?? 0)
      return `- \`${path}\`${optional ? ' (optional)' : ''}`
    })
}

/**
 * The `--json` contract: the keys of an ordinary run, plus the ones only a
 * `--fix --dry-run` adds. The split is the contract's own — the per-finding
 * `fix` and the top-level `fixes` are offered for a dry run and withheld after
 * a real one, because the offsets index a file that has since been rewritten.
 */
function jsonContract(observed: Observed): string[] {
  const plain = keyPaths(observed.json)
  const dry = keyPaths(observed.jsonWithFixes).filter((path) => !plain.includes(path))

  const versions = new Set(
    observed.json.map((document) => JSON.stringify((document as { version?: unknown }).version)),
  )
  if (versions.size !== 1) throw new Error('two runs emitted two different JSON versions')
  return [
    `The document's own \`version\` is \`${[...versions][0]}\`. It counts the contract, not the`,
    'package: the two are separate clocks, and both reading 1 is a coincidence.',
    '',
    ...plain,
    '',
    'Only under `--fix --dry-run`:',
    '',
    ...dry,
  ]
}

/**
 * The `github` format is one line per finding and nothing else, so what is
 * frozen is the line: the workflow command, the properties it carries, and
 * their order. The runner parses it positionally enough that a reordering is a
 * breaking change.
 */
function githubShape(observed: Observed): string[] {
  const first = observed.github.split('\n')[0] ?? ''
  const match = /^::(?<kind>[a-z]+) (?<properties>[^:]*)::/u.exec(first)
  const kind = match?.groups?.kind
  const properties = match?.groups?.properties
  if (kind === undefined || properties === undefined) {
    throw new Error(`the github format emitted no annotation: ${JSON.stringify(first)}`)
  }

  const names = properties.split(',').map((property) => property.split('=')[0] ?? '')
  return [
    '```',
    `::<level> ${names.map((name) => `${name}=<${name}>`).join(',')}::<message>`,
    '```',
    '',
    'One annotation per finding, and no other output: the job log is the transport.',
  ]
}

// ---------------------------------------------------------------------------
// The artifact
// ---------------------------------------------------------------------------

const PREAMBLE = `# The frozen surface

**Generated by \`pnpm surface\`. Do not edit.** \`test/surface.test.ts\` regenerates it and fails
when this file and the code disagree.

This is what the released tool promises not to remove or reshape without a major version: the
exit codes, the check ids, the CLI flags, the \`--json\` contract, the shapes \`--format github\`
and \`--format sarif\` emit, the config's accepted keys, the names the package exports, and the
Node floor. Anything not listed here is free to change.

It records the surface **as it stands, defects included** — a flag that is advertised and
refuses to run is listed with the refusal on it. Closing one of those is a change to this file,
which is the point: the question "did we break the contract?" is a diff somebody accepted
rather than something somebody noticed afterwards.

The output shapes are observed from a real run over a temporary repository, so this file
records what is emitted rather than what was intended.`

function section(title: string, body: readonly string[]): string {
  return `## ${title}\n\n${body.join('\n')}`
}

export async function frozenSurface(): Promise<string> {
  const observed = await observe()
  const parts = [
    PREAMBLE,
    section('Node floor', [`\`${nodeFloor()}\`, from \`engines.node\`.`]),
    section('Exit codes', exitCodes()),
    section('Check ids', checkIds()),
    section('CLI flags', cliFlags()),
    section('Output formats', formats()),
    section('`--json`', jsonContract(observed)),
    section('`--format github`', githubShape(observed)),
    section('`--format sarif`', keyPaths(observed.sarif)),
    section('Config keys', configFormat()),
    section('Exported names', exportedNames()),
  ]
  return `${parts.join('\n\n')}\n`
}

export async function main(): Promise<number> {
  const text = await frozenSurface()
  writeFileSync(join(REPO_ROOT, ARTIFACT), text, 'utf8')
  process.stderr.write(`wrote ${ARTIFACT}: ${text.split('\n').length} lines\n`)
  return 0
}

if (process.argv[1] === import.meta.filename) {
  process.exitCode = await main()
}
