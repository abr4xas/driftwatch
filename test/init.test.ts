import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { main } from '../src/cli/main.ts'
import { INIT_TEMPLATE } from '../src/cli/init.ts'
import { KNOWN_KEYS, validateConfig } from '../src/core/config.ts'
import { EXIT } from '../src/core/exit-codes.ts'
import { run } from '../src/run.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

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

const CONFIG = 'driftwatch.config.yaml'

/** The uncommented line declaring a key, or '' when the key is not live. */
function lineFor(key: string): string {
  return INIT_TEMPLATE.split('\n').find((line) => line.trimStart().startsWith(`${key}:`)) ?? ''
}

describe('--init', () => {
  it('writes the config at the repo root and names it on stdout', async () => {
    const root = makeTempRepo({ files: { 'README.md': '# empty\n' } })
    const c = capture()

    await expect(main(['--init'], c.io, root)).resolves.toBe(EXIT.ok)
    expect(c.stdout()).toContain(CONFIG)
    expect(c.stderr()).toBe('')
    expect(readFileSync(join(root, CONFIG), 'utf8')).toBe(INIT_TEMPLATE)
  })

  it('writes at the repo root even when run from a subdirectory', async () => {
    const root = makeTempRepo({ files: { 'docs/README.md': '# d\n' } })
    const c = capture()

    await expect(main(['--init'], c.io, join(root, 'docs'))).resolves.toBe(EXIT.ok)
    expect(existsSync(join(root, CONFIG))).toBe(true)
    expect(existsSync(join(root, 'docs', CONFIG))).toBe(false)
  })

  // The point of the whole ticket: a template that documents keys the loader
  // would reject, or presents inert ones as working, is the drift this tool
  // reports. So it has to survive its own loader, unedited.
  it('what it writes is valid input to the loader it documents', async () => {
    const root = makeTempRepo({
      files: { 'AGENTS.md': '# A\n\nSee `src/cli.ts`.\n', 'src/cli.ts': '' },
    })
    const c = capture()
    await main(['--init'], c.io, root)

    const result = await run({ cwd: root, paths: [] })
    expect(result.configPath).toBe(join(root, CONFIG))
    expect(result.findings).toEqual([])
  })

  it('the live keys are the two the pipeline reads', () => {
    expect(validateConfig({ sources: [], checks: {} }, 'template')).toEqual({
      sources: [],
      checks: {},
    })
  })

  // A key added to the loader and forgotten here is a documented lie, the same
  // class of mistake as an Action input nobody reads.
  it.each(KNOWN_KEYS)('the template mentions %s', (key) => {
    expect(INIT_TEMPLATE).toContain(key)
  })

  it('every key it writes is live, because every key there is does something', () => {
    for (const key of KNOWN_KEYS) {
      expect(lineFor(key), `${key} should be live`).not.toBe('')
    }
  })

  // Three keys were written commented out, with a note that nothing read them.
  // `1.0.0` withdrew them from the loader instead, so a template mentioning
  // one would be teaching a config the tool now refuses.
  it.each([['ignore'], ['knownPaths'], ['staleThreshold']])('does not mention %s', (key) => {
    expect(INIT_TEMPLATE).not.toContain(key)
  })

  // The template is YAML, so the keys are asserted against the loader's own
  // list rather than against a type the file imports. The `.ts` template used
  // to import `Config` from the public API; nothing does now, which removes a
  // rename that would have broken every generated config invisibly.
  it('parses as YAML and yields only the live keys', async () => {
    const { parse } = await import('yaml')
    // `skillRoots` is live: the loader reads it and discovery uses it. It is
    // written empty rather than commented out for that reason — a commented
    // key promises less than the tool does, which is what the block below the
    // live keys is for.
    expect(parse(INIT_TEMPLATE)).toEqual({ sources: [], skillRoots: [], checks: {} })
  })

  it('has no emoji', () => {
    expect(INIT_TEMPLATE).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})

describe('--init refuses rather than overwrite', () => {
  const existing: ReadonlyArray<readonly [string, Record<string, string>]> = [
    ['driftwatch.config.ts', { 'driftwatch.config.ts': 'export default {}\n' }],
    ['driftwatch.config.js', { 'driftwatch.config.js': 'export default {}\n' }],
    ['driftwatch.config.json', { 'driftwatch.config.json': '{}\n' }],
    ['driftwatch.config.yaml', { 'driftwatch.config.yaml': 'sources: []\n' }],
    ['driftwatch.config.yml', { 'driftwatch.config.yml': 'sources: []\n' }],
    // No config file at all, and it still counts: the key is a config.
    ['package.json#driftwatch', { 'package.json': '{"driftwatch":{"sources":[]}}\n' }],
  ]

  it.each(existing)('refuses when %s is already there', async (where, files) => {
    const root = makeTempRepo({ files })
    const before = existsSync(join(root, CONFIG))
    const c = capture()

    await expect(main(['--init'], c.io, root)).resolves.toBe(EXIT.toolFailure)
    expect(c.stderr()).toContain(where)
    expect(c.stdout()).toBe('')
    expect(existsSync(join(root, CONFIG))).toBe(before)
  })

  it('the refusal does not truncate the config it found', async () => {
    const content = '{"driftwatch":{"sources":[]}}\n'
    const root = makeTempRepo({ files: { 'package.json': content } })
    const c = capture()

    await main(['--init'], c.io, root)
    expect(readFileSync(join(root, 'package.json'), 'utf8')).toBe(content)
  })
})
