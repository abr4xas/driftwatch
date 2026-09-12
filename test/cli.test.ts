import { execFileSync } from 'node:child_process'
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
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
      '--dry-run',
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

  it.each([['--watch'], ['--init'], ['--strict']])(
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
    await expect(main(['--skip', 'path,script,link,frontmatter,skill'], c.io, CWD)).resolves.toBe(
      EXIT.toolFailure,
    )
    expect(c.stderr()).toContain('no checks enabled')
    expect(c.stdout()).not.toContain('no drift')
  })

  it('--no-tier2 is accepted: every check there is today is tier 1', async () => {
    const c = capture()
    await expect(main(['--no-tier2'], c.io, CWD)).resolves.toBe(EXIT.ok)
  })

  it('an unknown format is refused by name', async () => {
    const c = capture()
    await expect(main(['--format', 'xml'], c.io, CWD)).resolves.toBe(EXIT.toolFailure)
    expect(c.stderr()).toContain('unknown format: xml')
  })

  it('--fix writes the correction and exits on what remains', async () => {
    const root = makeTempRepo({
      files: {
        'AGENTS.md': 'The entry point is `./src/util/date.ts`.\n',
        'src/helpers/date.ts': '',
      },
    })
    const c = capture()
    // The only error was fixable, so nothing remains and the code is 0.
    await expect(main(['--fix'], c.io, root)).resolves.toBe(EXIT.ok)
    expect(readFileSync(join(root, 'AGENTS.md'), 'utf8')).toBe(
      'The entry point is `./src/helpers/date.ts`.\n',
    )
    expect(c.stdout()).toContain('1 fix applied in 1 file')
    expect(c.stdout()).toContain('no drift')
  })

  it('--fix exits 1 when something unfixable remains', async () => {
    const root = makeTempRepo({
      files: {
        'AGENTS.md': 'Entry `./src/util/date.ts`, and `src/nowhere/gone.ts`.\n',
        'src/helpers/date.ts': '',
      },
    })
    const c = capture()
    await expect(main(['--fix'], c.io, root)).resolves.toBe(EXIT.findings)
    const after = readFileSync(join(root, 'AGENTS.md'), 'utf8')
    expect(after).toContain('./src/helpers/date.ts')
    // The finding next to the fixed one is untouched, and still reported.
    expect(after).toContain('src/nowhere/gone.ts')
    expect(c.stdout()).toContain('1 fix applied in 1 file')
  })

  it('--fix writes nothing at all when nothing is fixable', async () => {
    const root = makeTempRepo({
      files: { 'AGENTS.md': 'See `src/nowhere/gone.ts`.\n', 'src/other.ts': '' },
    })
    const before = statSync(join(root, 'AGENTS.md')).mtimeMs
    const c = capture()
    await expect(main(['--fix'], c.io, root)).resolves.toBe(EXIT.findings)
    // On mtime and not on content: a rewrite to identical bytes still makes
    // every watcher in the user's editor fire.
    expect(statSync(join(root, 'AGENTS.md')).mtimeMs).toBe(before)
    expect(c.stdout()).toContain('nothing applied')
    expect(c.stdout()).not.toContain('with --fix')
  })

  it('--fix writes the identical copies too, so they stay copies', async () => {
    const document = 'The entry point is `src/util/date.ts`.\n'
    const root = makeTempRepo({
      files: { 'AGENTS.md': document, 'CLAUDE.md': document, 'src/helpers/date.ts': '' },
    })
    const c = capture()
    await main(['--fix'], c.io, root)
    const fixed = 'The entry point is `src/helpers/date.ts`.\n'
    expect(readFileSync(join(root, 'AGENTS.md'), 'utf8')).toBe(fixed)
    expect(readFileSync(join(root, 'CLAUDE.md'), 'utf8')).toBe(fixed)
  })

  it('--fix --dry-run says what it would change and writes nothing', async () => {
    const root = makeTempRepo({
      files: {
        'AGENTS.md': 'The entry point is `./src/util/date.ts`.\n',
        'src/helpers/date.ts': '',
      },
    })
    const before = readFileSync(join(root, 'AGENTS.md'), 'utf8')
    const c = capture()
    // The finding is still there, because nothing was fixed: exit 1.
    await expect(main(['--fix', '--dry-run'], c.io, root)).resolves.toBe(EXIT.findings)
    // On bytes, not on mtime: the file must be untouched, not merely unchanged.
    expect(readFileSync(join(root, 'AGENTS.md'), 'utf8')).toBe(before)
    expect(c.stdout()).toContain('would fix')
    expect(c.stdout()).toContain('src/util/date.ts')
    expect(c.stdout()).toContain('src/helpers/date.ts')
    expect(c.stdout()).toContain('1 fix would apply in 1 file')
  })

  it('--dry-run without --fix is a user error, not a silent no-op', async () => {
    const c = capture()
    await expect(main(['--dry-run'], c.io, CWD)).resolves.toBe(EXIT.toolFailure)
    expect(c.stderr()).toContain('--dry-run only means something with --fix')
  })

  it('warns about a dirty file before editing it, and edits it anyway', async () => {
    const root = makeTempRepo({
      files: {
        'AGENTS.md': 'The entry point is `./src/util/date.ts`.\n',
        'src/helpers/date.ts': '',
      },
    })
    // `makeTempRepo` runs `git add -A`, so the file is staged. Rewriting it
    // after that is an uncommitted change against HEAD, which is the state the
    // warning is about.
    writeFileSync(join(root, 'AGENTS.md'), 'Entry `./src/util/date.ts`, edited.\n')

    const c = capture()
    await main(['--fix'], c.io, root)
    expect(c.stderr()).toContain('uncommitted changes in AGENTS.md')
    // It warns and proceeds. This is not a git tool.
    expect(readFileSync(join(root, 'AGENTS.md'), 'utf8')).toContain('src/helpers/date.ts')
  })

  it('says nothing when the file is clean', async () => {
    const root = makeTempRepo({
      files: {
        'AGENTS.md': 'The entry point is `./src/util/date.ts`.\n',
        'src/helpers/date.ts': '',
      },
    })
    execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'x'], {
      cwd: root,
    })
    const c = capture()
    await main(['--fix'], c.io, root)
    expect(c.stderr()).toBe('')
  })

  it('a dry run warns too, because the point is to say what state you are in', async () => {
    const root = makeTempRepo({
      files: {
        'AGENTS.md': 'The entry point is `./src/util/date.ts`.\n',
        'src/helpers/date.ts': '',
      },
    })
    writeFileSync(join(root, 'AGENTS.md'), 'Entry `./src/util/date.ts`, edited.\n')
    const c = capture()
    await main(['--fix', '--dry-run'], c.io, root)
    expect(c.stderr()).toContain('uncommitted changes in AGENTS.md')
  })

  it('a repo with no git neither warns nor crashes', async () => {
    const root = makeTempRepo({
      git: false,
      files: {
        'AGENTS.md': 'The entry point is `./src/util/date.ts`.\n',
        'src/helpers/date.ts': '',
      },
    })
    const c = capture()
    await expect(main(['--fix'], c.io, root)).resolves.toBe(EXIT.ok)
    expect(c.stderr()).toBe('')
    expect(readFileSync(join(root, 'AGENTS.md'), 'utf8')).toContain('src/helpers/date.ts')
  })

  it('there are no emojis in any output', async () => {
    const c = capture()
    await main(['--help'], c.io, CWD)
    await main([], c.io, CWD)
    expect(c.stdout()).not.toMatch(EMOJI)
  })
})
