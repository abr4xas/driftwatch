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

describe('config lookup', () => {
  it('finds driftwatch.config.ts and loads it with no transpiler', async () => {
    const root = repo({
      'driftwatch.config.ts': [
        "import type { Config } from 'driftwatch'",
        '',
        'const config = { sources: ["docs/notes.md"] }',
        'export default config',
        '',
      ].join('\n'),
      'docs/notes.md': NOTES,
    })
    const result = await audit(root)
    expect(result.configPath?.endsWith('driftwatch.config.ts')).toBe(true)
    expect(result.config.sources).toEqual(['docs/notes.md'])
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
  it('prefers .ts over .js over .json over package.json', async () => {
    const root = repo({
      'driftwatch.config.ts': 'export default { staleThreshold: 1 }\n',
      'driftwatch.config.js': 'export default { staleThreshold: 2 }\n',
      'driftwatch.config.json': JSON.stringify({ staleThreshold: 3 }),
      'package.json': JSON.stringify({ name: 'x', driftwatch: { staleThreshold: 4 } }),
    })
    expect((await audit(root)).config.staleThreshold).toBe(1)
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

  it('an unsupported extension is a user error', async () => {
    const root = repo({ 'dw.yaml': 'sources: []\n' })
    await expect(audit(root, { config: 'dw.yaml' })).rejects.toThrow(
      'unsupported config extension: .yaml',
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
    expect(result.checks).toEqual(['path/missing', 'link/broken', 'frontmatter/invalid'])
  })
})
