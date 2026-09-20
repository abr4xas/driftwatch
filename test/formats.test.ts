import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { main } from '../src/cli/main.ts'
import { EXIT } from '../src/core/exit-codes.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

/**
 * The three machine-readable formats of `SPEC.md` § 5 and § 6.
 *
 * They are asserted by **shape**, not by snapshot: a snapshot of one repo's
 * findings is a test of the checks, which are tested elsewhere, and it moves
 * every time a heuristic does. What these tests own is the contract — the
 * fields a consumer is promised, and the ones that must not appear.
 *
 * The types below are that contract written from the consumer's side. They are
 * declared here rather than imported from the reporter on purpose: a test that
 * imports the producer's type asserts that the code agrees with itself.
 */

type JsonFinding = {
  check: string
  severity: string
  file: string
  line: number
  column: number
  endLine: number
  endColumn: number
  text: string
  message: string
  suggestion?: { value: string; confidence: number; fixable: boolean }
  fix?: { start: number; end: number; replacement: string }
}

type JsonDocument = {
  version: number
  root: string
  durationMs: number
  summary: { sources: number; claims: number; errors: number; warnings: number; fixable: number }
  findings: JsonFinding[]
  fixes?: {
    applied: number
    files: number
    dryRun: boolean
    edits: { file: string; line: number; start: number; end: number; after: string }[]
  }
}

type SarifReplacement = {
  deletedRegion: { charOffset: number; charLength: number }
  insertedContent: { text: string }
}

type SarifResult = {
  ruleId: string
  level: string
  locations: {
    physicalLocation: {
      artifactLocation: { uri: string }
      region: { startLine: number; startColumn: number }
    }
  }[]
  fixes?: { artifactChanges: { replacements: SarifReplacement[] }[] }[]
}

type SarifDocument = {
  $schema: string
  version: string
  runs: {
    tool: {
      driver: {
        name: string
        semanticVersion: string
        rules: { id: string; fullDescription: { text: string } }[]
      }
    }
    originalUriBaseIds: Record<string, { uri: string }>
    results: SarifResult[]
  }[]
}

/** One fixable finding with a suggestion, one unfixable without. */
function repo(): string {
  return makeTempRepo({
    files: {
      'AGENTS.md': 'Entry `./src/util/date.ts`, and `src/nowhere/gone.ts`.\n',
      'src/helpers/date.ts': '',
    },
  })
}

function capture() {
  const out: string[] = []
  const err: string[] = []
  return {
    io: {
      out: (s: string) => out.push(s),
      err: (s: string) => err.push(s),
      isTty: false,
      env: {} as NodeJS.ProcessEnv,
    },
    stdout: () => out.join(''),
    stderr: () => err.join(''),
  }
}

async function render(argv: readonly string[], root: string) {
  const c = capture()
  const code = await main(argv, c.io, root)
  return { code, stdout: c.stdout(), stderr: c.stderr() }
}

async function json<T>(argv: readonly string[], root: string): Promise<T> {
  const { stdout } = await render(argv, root)
  return JSON.parse(stdout) as T
}

/** `noUncheckedIndexedAccess` is on: an empty array is a failed test, not a crash. */
function first<T>(items: readonly T[]): T {
  const head = items[0]
  if (head === undefined) throw new Error('expected at least one element')
  return head
}

/** The duration differs run to run; everything else must not. */
function stripDuration(document: string): string {
  return document.replace(/"durationMs": \d+/u, '"durationMs": 0')
}

function sarifRun(document: SarifDocument) {
  return first(document.runs)
}

describe('every format describes the same run', () => {
  it('the exit code does not depend on the format', async () => {
    const root = repo()
    for (const argv of [[], ['--json'], ['--format', 'github'], ['--format', 'sarif']]) {
      const { code } = await render(argv, root)
      expect(code).toBe(EXIT.findings)
    }
  })

  it('the four of them report the same number of findings', async () => {
    const root = repo()
    const document = await json<JsonDocument>(['--json'], root)
    const { stdout: annotations } = await render(['--format', 'github'], root)
    const sarif = await json<SarifDocument>(['--format', 'sarif'], root)

    const count = document.findings.length
    expect(count).toBeGreaterThan(0)
    expect(annotations.trimEnd().split('\n')).toHaveLength(count)
    expect(sarifRun(sarif).results).toHaveLength(count)
  })
})

/** The first fenced block in `SPEC.md` § 6, which is the whole document example. */
function documentedJsonExample(): Record<string, unknown> {
  const spec = readFileSync(join(import.meta.dirname, '..', 'docs', 'spec', 'SPEC.md'), 'utf8')
  const section = spec.split('\n## 6.')[1] ?? ''
  const block = /```jsonc\n([\s\S]*?)```/u.exec(section)?.[1]
  if (block === undefined) throw new Error('SPEC.md § 6 has no jsonc example')
  return JSON.parse(block) as Record<string, unknown>
}

function keysOfSummary(document: Record<string, unknown>): string[] {
  return Object.keys(document.summary as Record<string, unknown>).toSorted()
}

function keysOfFirstFinding(document: Record<string, unknown>): string[] {
  return Object.keys(first(document.findings as Record<string, unknown>[])).toSorted()
}

/**
 * The worked example in `SPEC.md` § 6, held to the emitter.
 *
 * It omitted `endLine` and the top-level `skipped` for two releases while the
 * prose two paragraphs below it described both — the specification is primary
 * source in this repository, so an example that disagrees with the code is the
 * more dangerous half of the disagreement, and nothing was checking it.
 *
 * Keys only. The values in the example are illustrative and are meant to be:
 * it shows a repository nobody has.
 */
describe("SPEC.md § 6's example", () => {
  it('carries the keys the reporter emits, and no others', async () => {
    const emitted = await json<Record<string, unknown>>(['--json'], repo())
    const example = documentedJsonExample()
    expect(Object.keys(example).toSorted()).toEqual(Object.keys(emitted).toSorted())
    expect(keysOfSummary(example)).toEqual(keysOfSummary(emitted))
    expect(keysOfFirstFinding(example)).toEqual(keysOfFirstFinding(emitted))
  })
})

describe('--format json', () => {
  it('carries every field SPEC.md § 6 documents', async () => {
    const root = repo()
    const document = await json<JsonDocument>(['--json'], root)

    expect(document.version).toBe(1)
    expect(document.root).toBe(root)
    expect(typeof document.durationMs).toBe('number')
    // Rounded: a float with fourteen decimals is noise in every diff a
    // consumer commits.
    expect(Number.isInteger(document.durationMs)).toBe(true)
    expect(document.summary).toMatchObject({
      sources: expect.any(Number),
      claims: expect.any(Number),
      errors: expect.any(Number),
      warnings: expect.any(Number),
      fixable: expect.any(Number),
    })

    const finding = first(document.findings)
    expect(finding).toMatchObject({
      check: 'path/missing',
      severity: 'error',
      file: 'AGENTS.md',
      line: 1,
      message: 'path does not exist',
    })
    expect(finding.column).toBeGreaterThan(0)
    expect(finding.endColumn).toBeGreaterThan(finding.column)
  })

  it('counts the claims it examined, not only the ones that failed', async () => {
    const root = makeTempRepo({
      files: { 'AGENTS.md': 'The entry point is `src/cli.ts`.\n', 'src/cli.ts': '' },
    })
    const document = await json<JsonDocument>(['--json'], root)
    // A clean run over 200 claims and a clean run over none are not the same
    // result, and this is the only number that tells them apart.
    expect(document.findings).toEqual([])
    expect(document.summary.claims).toBeGreaterThan(0)
  })

  it('an empty run is still a valid document', async () => {
    const root = makeTempRepo({ files: { 'README.md': 'nothing to audit here\n' } })
    const document = await json<JsonDocument>(['--json'], root)
    expect(document.findings).toEqual([])
    expect(document.summary.errors).toBe(0)
  })

  it('a suggestion is carried when there is one, and absent when there is not', async () => {
    const document = await json<JsonDocument>(['--json'], repo())
    const withSuggestion = document.findings.find((f) => f.suggestion !== undefined)
    const without = document.findings.find((f) => f.suggestion === undefined)

    expect(withSuggestion?.suggestion).toMatchObject({
      value: expect.any(String),
      confidence: expect.any(Number),
      fixable: true,
    })
    expect(without).toBeDefined()
  })

  it('--quiet is a pretty concept and does not change the document', async () => {
    const root = repo()
    const plain = await render(['--json'], root)
    const quiet = await render(['--json', '--quiet'], root)
    expect(stripDuration(quiet.stdout)).toBe(stripDuration(plain.stdout))
  })

  it('--format json and --json are the same flag', async () => {
    const root = repo()
    const a = await render(['--json'], root)
    const b = await render(['--format', 'json'], root)
    expect(a.stdout.length).toBeGreaterThan(0)
    expect(b.stdout.length).toBeGreaterThan(0)
  })
})

describe('--format json with the fix plan', () => {
  it('a dry run carries the byte range each fix would replace', async () => {
    const root = repo()
    const document = await json<JsonDocument>(['--fix', '--dry-run', '--json'], root)

    expect(document.fixes).toMatchObject({ applied: 1, files: 1, dryRun: true })
    expect(first(document.fixes?.edits ?? []).after).toBe('src/helpers/date.ts')

    const fix = document.findings.find((f) => f.fix !== undefined)?.fix
    expect(fix).toMatchObject({ replacement: 'src/helpers/date.ts' })
    // The offsets index the file as it is on disk, which is the only frame in
    // which they mean anything. Slice it and check.
    const content = readFileSync(join(root, 'AGENTS.md'), 'utf8')
    expect(content.slice(fix?.start, fix?.end)).toBe('src/util/date.ts')
  })

  it('a real fix run offers no per-finding range, because there is nothing left to offer', async () => {
    const root = repo()
    const document = await json<JsonDocument>(['--fix', '--json'], root)

    expect(document.fixes?.dryRun).toBe(false)
    expect(document.fixes?.applied).toBe(1)
    // What is reported afterwards comes from a second full run over files that
    // have already been rewritten; an offset from the old plan would index a
    // file that no longer exists in that form.
    expect(document.findings.every((f) => f.fix === undefined)).toBe(true)
  })

  it('an ordinary run carries no fixes block at all', async () => {
    const document = await json<JsonDocument>(['--json'], repo())
    expect(document.fixes).toBeUndefined()
  })

  it('stdout still parses when git has something to say on stderr', async () => {
    const root = makeTempRepo({
      files: {
        'AGENTS.md': 'Entry `./src/util/date.ts`.\n',
        'src/helpers/date.ts': '',
      },
    })
    // Make the file dirty after `git add`, so the warning fires.
    writeFileSync(join(root, 'AGENTS.md'), 'Entry `./src/util/date.ts` again.\n')

    const { stdout, stderr } = await render(['--fix', '--dry-run', '--json'], root)
    expect(stderr).toContain('uncommitted changes')
    expect(() => JSON.parse(stdout)).not.toThrow()
  })
})

describe('--format github', () => {
  it('emits one annotation per finding and nothing else', async () => {
    const { stdout } = await render(['--format', 'github'], repo())
    const lines = stdout.trimEnd().split('\n')
    expect(lines.length).toBeGreaterThan(0)
    for (const line of lines) expect(line.startsWith('::error ')).toBe(true)
    expect(stdout).toContain('file=AGENTS.md')
    expect(stdout).toContain('title=path/missing')
  })

  it('carries the suggestion in the message', async () => {
    const { stdout } = await render(['--format', 'github'], repo())
    expect(stdout).toContain('path does not exist → src/helpers/date.ts?')
  })

  it('a clean run emits nothing at all, not a blank line', async () => {
    const root = makeTempRepo({ files: { 'README.md': 'nothing here\n' } })
    const { stdout, code } = await render(['--format', 'github'], root)
    expect(stdout).toBe('')
    expect(code).toBe(EXIT.ok)
  })

  it('no fix diff reaches the log, because there is no workflow command for it', async () => {
    const { stdout } = await render(['--fix', '--dry-run', '--format', 'github'], repo())
    for (const line of stdout.trimEnd().split('\n')) {
      if (line.length > 0) expect(line.startsWith('::')).toBe(true)
    }
    expect(stdout).not.toContain('would fix')
  })
})

describe('--format sarif', () => {
  it('is a valid 2.1.0 document with its tool block', async () => {
    const document = await json<SarifDocument>(['--format', 'sarif'], repo())
    expect(document.version).toBe('2.1.0')
    expect(document.$schema).toContain('sarif')
    const driver = sarifRun(document).tool.driver
    expect(driver.name).toBe('driftwatch')
    expect(driver.semanticVersion).toMatch(/^\d+\.\d+\.\d+/u)
  })

  it('every result names a rule the tool declared', async () => {
    const document = await json<SarifDocument>(['--format', 'sarif'], repo())
    const run = sarifRun(document)
    const rules = new Set(run.tool.driver.rules.map((rule) => rule.id))
    expect(rules.size).toBeGreaterThan(0)
    for (const result of run.results) expect(rules.has(result.ruleId)).toBe(true)
  })

  it('only declares rules for the checks that ran', async () => {
    const document = await json<SarifDocument>(['--format', 'sarif', '--only', 'path'], repo())
    const rules = sarifRun(document).tool.driver.rules
    expect(rules).toHaveLength(1)
    expect(first(rules).id).toBe('path/missing')
    expect(first(rules).fullDescription.text.length).toBeGreaterThan(40)
  })

  it('a clean run is still a valid document with an empty results array', async () => {
    const root = makeTempRepo({ files: { 'README.md': 'nothing here\n' } })
    const document = await json<SarifDocument>(['--format', 'sarif'], root)
    expect(sarifRun(document).results).toEqual([])
    expect(sarifRun(document).tool.driver.name).toBe('driftwatch')
  })

  it('locates a finding with a region and a root-relative uri', async () => {
    const root = repo()
    const document = await json<SarifDocument>(['--format', 'sarif'], root)
    const location = first(first(sarifRun(document).results).locations).physicalLocation
    expect(location.artifactLocation.uri).toBe('AGENTS.md')
    expect(location.region.startLine).toBe(1)
    expect(sarifRun(document).originalUriBaseIds['%SRCROOT%']?.uri).toMatch(/^file:\/\//u)
  })

  it('a dry run carries the edit as a SARIF fix', async () => {
    const root = repo()
    const document = await json<SarifDocument>(['--fix', '--dry-run', '--format', 'sarif'], root)
    const fixes = sarifRun(document).results.find((r) => r.fixes !== undefined)?.fixes ?? []
    const replacement = first(first(first(fixes).artifactChanges).replacements)

    expect(replacement.insertedContent.text).toBe('src/helpers/date.ts')
    const content = readFileSync(join(root, 'AGENTS.md'), 'utf8')
    const { charOffset, charLength } = replacement.deletedRegion
    expect(content.slice(charOffset, charOffset + charLength)).toBe('src/util/date.ts')
  })

  it('a real fix run carries no SARIF fixes, for the same reason json does not', async () => {
    const document = await json<SarifDocument>(['--fix', '--format', 'sarif'], repo())
    expect(sarifRun(document).results.every((r) => r.fixes === undefined)).toBe(true)
  })
})
