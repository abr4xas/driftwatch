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

/** A repo with one broken path, reported at whatever severity is asked for. */
function repoReporting(severity: string): string {
  return makeTempRepo({
    files: {
      'AGENTS.md': '# A\n\nThe helper is `src/gone.ts`.\n',
      'driftwatch.config.yaml': `checks:\n  path/missing: '${severity}'\n`,
    },
  })
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

  /**
   * `--watch` used to parse and then refuse with a bespoke "not implemented
   * yet". It belongs to M6, nothing here implements it, and a flag we do not
   * have should fail the way any flag we do not have fails.
   */
  it('--watch is an unknown flag, not a bespoke refusal', async () => {
    const c = capture()
    await expect(main(['--watch'], c.io, CWD)).resolves.toBe(EXIT.toolFailure)
    expect(c.stderr()).toContain('Unknown option --watch.')
    expect(c.stderr()).not.toContain('is not implemented yet')
  })

  /**
   * `--strict` used to be on the list above, and a caller who read `--help`
   * and followed it got exit 2 telling them the flag they had just been
   * advertised does not exist yet.
   *
   * No registered check reports a warning on its own: every one of the five
   * defaults to error. The only way to observe a warning today is a config
   * that asks for one, which is what these build, and it is enough — the
   * decision under test is the exit code's, not the check's.
   */
  describe('--strict', () => {
    it('a warning fails the run when it is asked for', async () => {
      const c = capture()
      await expect(main(['--strict'], c.io, repoReporting('warning'))).resolves.toBe(EXIT.findings)
    })

    it('a warning does not fail the run when it is not', async () => {
      const c = capture()
      await expect(main([], c.io, repoReporting('warning'))).resolves.toBe(EXIT.ok)
      // Exit 0 is also what a run that found nothing returns, and the two mean
      // opposite things. The report is what tells them apart.
      expect(c.stdout()).toContain('src/gone.ts')
      expect(c.stdout()).toContain('1 warning')
    })

    it.each([[[]], [['--strict']]])('an error fails the run with %j', async (flags) => {
      const c = capture()
      await expect(main(flags, c.io, repoReporting('error'))).resolves.toBe(EXIT.findings)
    })

    it('is no longer a tool failure', async () => {
      const c = capture()
      await expect(main(['--strict'], c.io, repoReporting('error'))).resolves.not.toBe(
        EXIT.toolFailure,
      )
      expect(c.stderr()).not.toContain('is not implemented yet')
    })
  })

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
    expect(c.stderr()).toContain("Unknown check 'nope'")
    expect(c.stderr()).toContain('path/missing')
  })

  it('--skip that empties the registry is refused, not reported as no drift', async () => {
    const c = capture()
    await expect(main(['--skip', 'path,script,link,frontmatter'], c.io, CWD)).resolves.toBe(
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
    expect(c.stderr()).toContain('Unknown format xml.')
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
    expect(c.stderr()).toContain("Can't use --dry-run without --fix.")
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
    expect(c.stderr()).toContain('Warning: Uncommitted changes in AGENTS.md')
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
    expect(c.stderr()).toContain('Warning: Uncommitted changes in AGENTS.md')
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

describe('errors', () => {
  it('a tool error leads with Error:, never with the finding glyph', async () => {
    const c = capture()
    await main(['--turbo'], c.io, CWD)
    expect(c.stderr()).toMatch(/^Error: Unknown option --turbo\./u)
    expect(c.stderr()).not.toContain('✗')
  })

  it('ends with the recovery command, whole and on its own line', async () => {
    const c = capture()
    await main(['--turbo'], c.io, CWD)
    expect(c.stderr()).toContain('\nSee all options:\n    driftwatch --help\n')
  })

  it('a near-miss flag gets one suggestion', async () => {
    const c = capture()
    await main(['--stirct'], c.io, CWD)
    expect(c.stderr()).toContain('Unknown option --stirct. Did you mean --strict?')
  })

  it('a flag close to nothing gets no suggestion rather than a guess', async () => {
    const c = capture()
    await main(['--turbo'], c.io, CWD)
    expect(c.stderr()).not.toContain('Did you mean')
  })

  it('names every missing path at once, not only the first', async () => {
    const c = capture()
    await expect(main(['gone-a.md', 'gone-b.md'], c.io, CWD)).resolves.toBe(EXIT.toolFailure)
    expect(c.stderr()).toContain("Couldn't find 2 paths.")
    expect(c.stderr()).toContain('  gone-a.md\n')
    expect(c.stderr()).toContain('  gone-b.md\n')
  })

  it('past five missing paths it counts the rest', async () => {
    const c = capture()
    const paths = Array.from({ length: 7 }, (_, i) => `gone-${i}.md`)
    await main(paths, c.io, CWD)
    expect(c.stderr()).toContain('  and 2 more\n')
    expect(c.stderr()).not.toContain('gone-6.md')
  })

  for (const argv of [['--json'], ['--format', 'json'], ['--format=sarif']]) {
    it(`with ${argv.join(' ')}, the error is one line of JSON on stderr`, async () => {
      const c = capture()
      await expect(main([...argv, '--stirct'], c.io, CWD)).resolves.toBe(EXIT.toolFailure)
      expect(c.stdout()).toBe('')
      const lines = c.stderr().trimEnd().split('\n')
      expect(lines).toHaveLength(1)
      expect(JSON.parse(lines[0] ?? '')).toEqual({
        error: {
          reason: 'unknown_option',
          message: 'Unknown option --stirct. Did you mean --strict?',
          command: 'driftwatch --help',
        },
      })
    })
  }

  it('the JSON error carries the reason a consumer branches on', async () => {
    const c = capture()
    await main(['--json', 'gone.md'], c.io, CWD)
    expect(JSON.parse(c.stderr())).toMatchObject({ error: { reason: 'path_not_found' } })
  })

  it('--format github keeps the error in text: the job log is read by a person', async () => {
    const c = capture()
    await main(['--format', 'github', '--stirct'], c.io, CWD)
    expect(c.stderr()).toMatch(/^Error: /u)
  })
})

describe('--help', () => {
  it('fits in 80 columns', async () => {
    const c = capture()
    await main(['--help'], c.io, CWD)
    for (const line of c.stdout().split('\n')) {
      expect(line.length, line).toBeLessThanOrEqual(80)
    }
  })

  it('lists every registered check with its title', async () => {
    const { CHECKS } = await import('../src/verify/checks/index.ts')
    const c = capture()
    await main(['--help'], c.io, CWD)
    for (const check of CHECKS) {
      expect(c.stdout()).toMatch(new RegExp(`^ {2}${check.id} +${check.title}$`, 'mu'))
    }
  })
})

function fixableRepo(): string {
  return makeTempRepo({
    files: {
      'AGENTS.md': 'The entry point is `./src/util/date.ts`.\n',
      'src/helpers/date.ts': '',
    },
  })
}

describe('the suggested --fix', () => {
  it('is a complete command on its own line', async () => {
    const c = capture()
    await main([], c.io, fixableRepo())
    expect(c.stdout()).toContain('Apply 1 fix:\n    driftwatch --fix\n')
  })

  it('keeps the paths and the selection the run was narrowed to', async () => {
    const c = capture()
    await main(['AGENTS.md', '--only', 'path', '--no-config'], c.io, fixableRepo())
    expect(c.stdout()).toContain('    driftwatch --fix AGENTS.md --only path --no-config\n')
  })
})
