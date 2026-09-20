import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateConfig } from '../src/core/config.ts'
import { run, type RunOptions, type RunResult } from '../src/run.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

const AGENTS = '# Agents\n\nThe entry point is `src/cli.ts`.\n'

/** A source outside what discovery finds, claiming a path that is not there. */
const NOTES = '# Notes\n\nThe helpers live in `src/util/nope.ts`.\n'

function repo(files: Record<string, string>): string {
  return makeTempRepo({ files: { 'AGENTS.md': AGENTS, 'src/cli.ts': '', ...files } })
}

/** `run` with the whole repo in scope, which is what these cases are about. */
function audit(root: string, over: Partial<RunOptions> = {}): Promise<RunResult> {
  return run({ cwd: root, paths: [], ...over })
}

describe('a YAML config', () => {
  it('is found and loaded', async () => {
    const root = repo({
      'driftwatch.config.yaml': "sources:\n  - 'docs/notes.md'\n",
      'docs/notes.md': NOTES,
    })
    const result = await audit(root)
    expect(result.config.sources).toEqual(['docs/notes.md'])
    expect(result.findings.some((f) => f.check === 'path/missing')).toBe(true)
  })

  it('is found under .yml too', async () => {
    const root = repo({ 'driftwatch.config.yml': "sources:\n  - 'docs/notes.md'\n" })
    // The source is declared and missing, which is a user error by design.
    await expect(audit(root)).rejects.toThrow('docs/notes.md')
  })

  // `off` is one of the three severities and also a YAML 1.1 boolean. The
  // `yaml` package implements 1.2, so the unquoted form arrives as a string
  // and works; the quoted form has to work too, since the template quotes it.
  it.each([["'off'"], ['off']])('takes %s as a severity', async (written) => {
    const root = repo({ 'driftwatch.config.yaml': `checks:\n  'path/missing': ${written}\n` })
    const result = await audit(root)
    expect(result.checks).not.toContain('path/missing')
  })

  // What a 1.1 parser elsewhere would have written. The message has to name
  // the quotes, or the reader goes looking at their check ids instead.
  it('explains a severity that arrived as a boolean', async () => {
    const root = repo({ 'driftwatch.config.yaml': "checks:\n  'path/missing': false\n" })
    await expect(audit(root)).rejects.toThrow(/path\/missing/u)
  })

  it('reports invalid YAML as a user error naming the file', async () => {
    const root = repo({ 'driftwatch.config.yaml': 'sources: [unclosed\n' })
    await expect(audit(root)).rejects.toThrow(/driftwatch\.config\.yaml/u)
  })
})

/**
 * The way off a module config, now that the flag that did it is gone.
 *
 * ADR-0013 withdrew the formats and shipped `--migrate-config` in the same
 * commit, because a withdrawn format with no route off it moves a cost onto
 * the user. `1.0.0` withdrew the flag too, so the refusal has to name the
 * release that still has it.
 */
const ROUTE_OFF = 'npx @abr4xas/driftwatch@0.5.0 --migrate-config'

/** Message and hint together: the two lines a user actually sees. */
async function refusal(root: string): Promise<string> {
  try {
    await audit(root)
  } catch (error) {
    const user = error as { message: string; hint?: string }
    return `${user.message} ${user.hint ?? ''}`
  }
  throw new Error('expected the audit to fail')
}

describe('config lookup', () => {
  it('refuses a .ts config and names the way off it', async () => {
    // ADR-0013: a config is data, not a program. The refusal has to carry the
    // migration command, because a format withdrawn without a route off it
    // just moves work onto the user.
    const root = repo({
      'driftwatch.config.ts': 'export default { sources: ["docs/notes.md"] }\n',
      'docs/notes.md': NOTES,
    })
    expect(await refusal(root)).toContain(ROUTE_OFF)
  })

  it('refuses a .js config the same way', async () => {
    const root = repo({ 'driftwatch.config.js': 'export default {}\n' })
    expect(await refusal(root)).toContain(ROUTE_OFF)
  })

  it('does not execute the module it refuses', async () => {
    // The point of the ADR. A config that writes a file when imported must not
    // write it: refusing has to happen before anything is loaded.
    const root = repo({
      'driftwatch.config.ts': [
        "import { writeFileSync } from 'node:fs'",
        "import { join } from 'node:path'",
        "writeFileSync(join(import.meta.dirname, 'EXECUTED'), 'yes')",
        'export default {}',
        '',
      ].join('\n'),
    })
    expect(await refusal(root)).toContain(ROUTE_OFF)
    expect(existsSync(join(root, 'EXECUTED'))).toBe(false)
  })

  it('finds a .json config', async () => {
    const root = repo({
      'driftwatch.config.json': JSON.stringify({ sources: ['docs/notes.md'] }),
      'docs/notes.md': NOTES,
    })
    const result = await audit(root)
    expect(result.config.sources).toEqual(['docs/notes.md'])
  })

  it('falls back to the driftwatch key in package.json', async () => {
    const root = repo({
      'package.json': JSON.stringify({ name: 'x', driftwatch: { sources: ['docs/notes.md'] } }),
      'docs/notes.md': NOTES,
    })
    const result = await audit(root)
    expect(result.config.sources).toEqual(['docs/notes.md'])
    expect(result.configPath?.endsWith('package.json')).toBe(true)
  })

  it('a package.json with no driftwatch key is not a config', async () => {
    const root = repo({ 'package.json': JSON.stringify({ name: 'x' }) })
    const result = await audit(root)
    expect(result.configPath).toBeUndefined()
    expect(result.config).toEqual({})
  })

  // The order matters and the search stops: two configs in one repo is a
  // mistake, and merging them would hide it.
  it('prefers .json over .yaml over package.json', async () => {
    const root = repo({
      'driftwatch.config.json': JSON.stringify({ staleThreshold: 3 }),
      'driftwatch.config.yaml': 'staleThreshold: 5\n',
      'package.json': JSON.stringify({ name: 'x', driftwatch: { staleThreshold: 4 } }),
    })
    expect((await audit(root)).config.staleThreshold).toBe(3)
  })

  it('a withdrawn format still shadows a valid one, and says so', async () => {
    // It has to keep its place in the lookup order. Skipping it silently would
    // load the .json and leave the author believing the .ts is in effect --
    // the two-configs-in-one-repo case the order exists to surface.
    const root = repo({
      'driftwatch.config.ts': 'export default { staleThreshold: 1 }\n',
      'driftwatch.config.json': JSON.stringify({ staleThreshold: 3 }),
    })
    expect(await refusal(root)).toContain(ROUTE_OFF)
  })

  it('runs with no config at all', async () => {
    const root = repo({})
    const result = await audit(root)
    expect(result.configPath).toBeUndefined()
    expect(result.findings).toEqual([])
  })
})

describe('--config and --no-config', () => {
  it('--no-config ignores a config that is there', async () => {
    const root = repo({
      'driftwatch.config.json': JSON.stringify({ sources: ['docs/notes.md'] }),
      'docs/notes.md': NOTES,
    })
    const withConfig = await audit(root)
    expect(withConfig.findings).toHaveLength(1)

    const without = await audit(root, { config: false })
    expect(without.configPath).toBeUndefined()
    expect(without.findings).toEqual([])
    expect(without.sources.map((source) => source.path)).toEqual(['AGENTS.md'])
  })

  it('--config takes an explicit path, wherever it lives', async () => {
    const root = repo({
      'tools/dw.json': JSON.stringify({ sources: ['docs/notes.md'] }),
      'docs/notes.md': NOTES,
    })
    const result = await audit(root, { config: 'tools/dw.json' })
    expect(result.config.sources).toEqual(['docs/notes.md'])
    expect(result.findings).toHaveLength(1)
  })

  it('--config wins over a config file in the root', async () => {
    const root = repo({
      'driftwatch.config.json': JSON.stringify({ staleThreshold: 9 }),
      'tools/dw.json': JSON.stringify({ staleThreshold: 1 }),
    })
    expect((await audit(root, { config: 'tools/dw.json' })).config.staleThreshold).toBe(1)
  })

  it('a --config that does not exist is a user error', async () => {
    const root = repo({})
    await expect(audit(root, { config: 'nope.json' })).rejects.toThrow(
      'config file does not exist: nope.json',
    )
  })

  // This case used to use `.yaml`, which stopped being unsupported. A test
  // whose subject is "an extension we do not read" has to be re-pointed every
  // time one is added, or it goes green for the wrong reason — the same trap
  // `--dry-run` sprang in M3, where a flag outside the specification was used
  // as the example of a flag outside the specification and then implemented.
  it('an unsupported extension is a user error', async () => {
    const root = repo({ 'dw.toml': 'sources = []\n' })
    await expect(audit(root, { config: 'dw.toml' })).rejects.toThrow(
      'unsupported config extension: .toml',
    )
  })
})

describe('validateConfig', () => {
  it('accepts every key in the specification', () => {
    const config = validateConfig(
      {
        sources: ['docs/a.md'],
        ignore: ['**/fixtures/**'],
        checks: { 'path/missing': 'off', 'stale/churn': 'warning' },
        knownPaths: ['dist/**'],
        staleThreshold: 15,
      },
      'test',
    )
    expect(config.checks).toEqual({ 'path/missing': 'off', 'stale/churn': 'warning' })
    expect(config.staleThreshold).toBe(15)
  })

  it('an empty or absent config is valid', () => {
    expect(validateConfig({}, 'test')).toEqual({})
    expect(validateConfig(undefined, 'test')).toEqual({})
    expect(validateConfig(null, 'test')).toEqual({})
  })

  // A typo in `ignore` that silently disables the ignore list is worse than a
  // red run: the tool would keep working and stop doing what the file says.
  it('an unknown key fails and names it, with the known ones', () => {
    expect(() => validateConfig({ ignores: [] }, 'test')).toThrow(/unknown key 'ignores'/u)
    expect(() => validateConfig({ ignores: [] }, 'test')).toThrow(/sources, ignore, checks/u)
  })

  it.each([
    ['sources', { sources: 'docs/a.md' }, /sources has to be an array of strings/u],
    ['sources with a number', { sources: [1] }, /sources has to be an array of strings/u],
    ['ignore', { ignore: {} }, /ignore has to be an array of strings/u],
    ['knownPaths', { knownPaths: 3 }, /knownPaths has to be an array of strings/u],
    ['checks', { checks: [] }, /checks has to be an object/u],
    [
      'a severity',
      { checks: { 'path/missing': 'loud' } },
      /has to be 'error', 'warning' or 'off'/u,
    ],
    ['staleThreshold', { staleThreshold: '15' }, /staleThreshold has to be a positive integer/u],
    ['a fractional threshold', { staleThreshold: 1.5 }, /positive integer/u],
    ['a zero threshold', { staleThreshold: 0 }, /positive integer/u],
  ])('rejects a bad %s', (_label, raw, expected) => {
    expect(() => validateConfig(raw, 'test')).toThrow(expected)
  })

  it('rejects something that is not an object', () => {
    expect(() => validateConfig('sources', 'test')).toThrow(/has to export an object/u)
    expect(() => validateConfig([], 'test')).toThrow(/has to export an object/u)
  })

  it('names where the problem is, so the message points at a file', () => {
    expect(() => validateConfig({ nope: 1 }, 'package.json#driftwatch')).toThrow(
      /invalid config in package\.json#driftwatch/u,
    )
  })
})

describe('the sources key', () => {
  it('audits a file discovery would never have found', async () => {
    const root = repo({
      'driftwatch.config.json': JSON.stringify({ sources: ['docs/notes.md'] }),
      'docs/notes.md': NOTES,
    })
    const result = await audit(root)
    expect(result.sources.map((source) => [source.kind, source.path])).toEqual([
      ['agents-md', 'AGENTS.md'],
      ['configured', 'docs/notes.md'],
    ])
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]?.claim.text).toBe('src/util/nope.ts')
  })

  it('accepts a glob, matched against the files git lists', async () => {
    const root = repo({
      'driftwatch.config.json': JSON.stringify({ sources: ['docs/**/*.md'] }),
      'docs/notes.md': NOTES,
      'docs/deep/more.md': NOTES,
      'docs/ignored.txt': NOTES,
    })
    const result = await audit(root)
    expect(result.sources.map((source) => source.path)).toEqual([
      'AGENTS.md',
      'docs/deep/more.md',
      'docs/notes.md',
    ])
  })

  // Discovery wins, so the same file is not reported twice under two names.
  it('does not duplicate a source discovery already found', async () => {
    const root = repo({ 'driftwatch.config.json': JSON.stringify({ sources: ['AGENTS.md'] }) })
    const result = await audit(root)
    expect(result.sources.map((source) => [source.kind, source.path])).toEqual([
      ['agents-md', 'AGENTS.md'],
    ])
  })

  it('a source that does not exist is a user error, not a silent skip', async () => {
    const root = repo({ 'driftwatch.config.json': JSON.stringify({ sources: ['docs/gone.md'] }) })
    await expect(audit(root)).rejects.toThrow(
      'the config declares a source that does not exist: docs/gone.md',
    )
  })

  it('a pattern that matches nothing is a user error too', async () => {
    const root = repo({ 'driftwatch.config.json': JSON.stringify({ sources: ['docs/**/*.md'] }) })
    await expect(audit(root)).rejects.toThrow(
      'the config declares a source pattern that matches nothing: docs/**/*.md',
    )
  })

  it('a positional still narrows the scope', async () => {
    const root = repo({
      'driftwatch.config.json': JSON.stringify({ sources: ['docs/notes.md'] }),
      'docs/notes.md': NOTES,
    })
    const result = await audit(root, { paths: ['docs'] })
    expect(result.sources.map((source) => source.path)).toEqual(['docs/notes.md'])
  })

  it('a trailing slash or a ./ prefix is tolerated', async () => {
    const root = repo({
      'driftwatch.config.json': JSON.stringify({ sources: ['./docs/notes.md'] }),
      'docs/notes.md': NOTES,
    })
    expect((await audit(root)).sources).toHaveLength(2)
  })

  it('the checks key sets the severity a finding is reported at', async () => {
    const root = repo({
      'AGENTS.md': '# Agents\n\nThe entry point is `src/nope.ts`.\n',
      'driftwatch.config.json': JSON.stringify({ checks: { 'path/missing': 'warning' } }),
    })
    const result = await audit(root)
    expect(result.findings.map((finding) => finding.severity)).toEqual(['warning'])
    expect(result.counts).toEqual({ errors: 0, warnings: 1 })
  })

  it('with no checks key the same finding is an error', async () => {
    const root = repo({ 'AGENTS.md': '# Agents\n\nThe entry point is `src/nope.ts`.\n' })
    const result = await audit(root)
    expect(result.findings.map((finding) => finding.severity)).toEqual(['error'])
    expect(result.counts).toEqual({ errors: 1, warnings: 0 })
  })

  it('the keys with no implementation yet are carried, not acted on', async () => {
    const root = repo({
      'driftwatch.config.json': JSON.stringify({
        ignore: ['**/nope/**'],
        staleThreshold: 30,
      }),
    })
    const result = await audit(root)
    expect(result.config.ignore).toEqual(['**/nope/**'])
    expect(result.config.staleThreshold).toBe(30)
    expect(result.checks).toEqual([
      'path/missing',
      'script/missing',
      'link/broken',
      'frontmatter/invalid',
      'skill/frontmatter',
    ])
  })
})
