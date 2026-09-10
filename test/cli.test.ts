import { describe, expect, it } from 'vitest'
import { EXIT } from '../src/core/exit-codes.ts'
import { main } from '../src/cli/main.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

const CWD = process.cwd()

/** The shape of a stack frame: whitespace, "at ", and something with line:column. */
const STACK_FRAME = /\n\s+at .*:\d+:\d+/u

/** SPEC.md § 5: no emojis. Only three symbols are allowed. */
const EMOJI = /\p{Extended_Pictographic}/u

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

describe('main', () => {
  it('--help prints the usage on stdout and exits 0', async () => {
    const c = capture()
    await expect(main(['--help'], c.io, CWD)).resolves.toBe(EXIT.ok)
    expect(c.stdout()).toContain('driftwatch [paths...]')
    expect(c.stderr()).toBe('')
  })

  it('the --help text documents every flag in the specification', async () => {
    const c = capture()
    await main(['--help'], c.io, CWD)
    const help = c.stdout()
    for (const flag of [
      '--fix',
      '--json',
      '--format',
      '--only',
      '--skip',
      '--strict',
      '--no-tier2',
      '--config',
      '--no-config',
      '--quiet',
      '--watch',
      '--init',
      '--version',
      '--help',
    ]) {
      expect(help, `${flag} is missing from --help`).toContain(flag)
    }
  })

  it('--version prints only the version and exits 0', async () => {
    const c = capture()
    await expect(main(['--version'], c.io, CWD)).resolves.toBe(EXIT.ok)
    expect(c.stdout().trim()).toMatch(/^\d+\.\d+\.\d+/u)
  })

  it('an unknown flag exits 2 and explains the problem without a stack trace', async () => {
    const c = capture()
    await expect(main(['--turbo'], c.io, CWD)).resolves.toBe(EXIT.toolFailure)
    expect(c.stderr()).toContain('--turbo')
    expect(c.stderr()).not.toMatch(STACK_FRAME)
    expect(c.stdout()).toBe('')
  })

  it('a nonexistent positional path exits 2 and names it', async () => {
    const c = capture()
    await expect(main(['this-file-does-not-exist.md'], c.io, CWD)).resolves.toBe(EXIT.toolFailure)
    expect(c.stderr()).toContain('this-file-does-not-exist.md')
    expect(c.stderr()).not.toMatch(STACK_FRAME)
  })

  it('exits 0 with nothing to report', async () => {
    // In a repo with no sources there is nothing claimed, so there is no drift.
    const root = makeTempRepo({ files: { 'README.md': '# not a source\n' } })
    const c = capture()
    await expect(main([], c.io, root)).resolves.toBe(EXIT.ok)
  })

  it.each([['--fix'], ['--watch'], ['--init'], ['--strict']])(
    '%s is not implemented yet and says so, instead of being ignored',
    async (flag) => {
      const c = capture()
      await expect(main([flag], c.io, CWD)).resolves.toBe(EXIT.toolFailure)
      expect(c.stderr()).toContain(flag)
      expect(c.stderr()).toContain('is not implemented yet')
    },
  )

  it('--only reaches the pipeline: a known id runs, and the audit is clean', async () => {
    const root = makeTempRepo({
      files: { 'AGENTS.md': '# A\n\nSee `src/cli.ts`.\n', 'src/cli.ts': '' },
    })
    const c = capture()
    await expect(main(['--only', 'path'], c.io, root)).resolves.toBe(EXIT.ok)
    expect(c.stderr()).toBe('')
  })

  it('--only with an unknown id says so instead of auditing nothing', async () => {
    const c = capture()
    await expect(main(['--only', 'nope'], c.io, CWD)).resolves.toBe(EXIT.toolFailure)
    expect(c.stderr()).toContain("unknown check 'nope'")
    expect(c.stderr()).toContain('path/missing')
  })

  it('--skip that empties the registry is refused, not reported as no drift', async () => {
    const c = capture()
    await expect(main(['--skip', 'path,link'], c.io, CWD)).resolves.toBe(EXIT.toolFailure)
    expect(c.stderr()).toContain('no checks enabled')
    expect(c.stdout()).not.toContain('no drift')
  })

  it('--no-tier2 is accepted: every check there is today is tier 1', async () => {
    const c = capture()
    await expect(main(['--no-tier2'], c.io, CWD)).resolves.toBe(EXIT.ok)
  })

  it('a format other than pretty is not implemented yet', async () => {
    const c = capture()
    await expect(main(['--format', 'sarif'], c.io, CWD)).resolves.toBe(EXIT.toolFailure)
    expect(c.stderr()).toContain('sarif')
  })

  it('there are no emojis in any output', async () => {
    const c = capture()
    await main(['--help'], c.io, CWD)
    await main([], c.io, CWD)
    expect(c.stdout()).not.toMatch(EMOJI)
  })
})
