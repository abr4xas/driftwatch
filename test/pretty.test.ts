import { describe, expect, it } from 'vitest'
import { colorEnabled } from '../src/report/colors.ts'
import { renderPretty } from '../src/report/pretty.ts'
import type { RunResult } from '../src/run.ts'
import type { Claim, Finding, Source } from '../src/core/types.ts'

/** The ANSI escape character, to detect color without writing it literally. */
const ESC = '['

function source(path: string, kind: Source['kind'] = 'claude-md'): Source {
  return { path, absPath: `/repo/${path}`, kind, content: '', baseDir: '', aliases: [] }
}

function claim(file: string, line: number, text: string): Claim {
  return {
    kind: 'path',
    source: source(file),
    text,
    raw: text,
    range: { line, column: 1, endLine: line, endColumn: 1 + text.length },
    offset: [0, text.length],
    context: 'inline-code',
  }
}

function finding(file: string, line: number, text: string): Finding {
  return {
    check: 'path/missing',
    severity: 'error',
    claim: claim(file, line, text),
    message: 'path does not exist',
  }
}

function result(over: Partial<RunResult> = {}): RunResult {
  return {
    root: '/repo',
    config: {},
    configPath: undefined,
    sources: [source('CLAUDE.md')],
    checks: ['path/missing'],
    findings: [],
    counts: { errors: 0, warnings: 0 },
    fixable: 0,
    durationMs: 210,
    ...over,
  }
}

const plain = { color: false, quiet: false }

describe('renderPretty', () => {
  it('with no problems it closes with the SPEC.md § 5 line', () => {
    const sources = Array.from({ length: 14 }, (_, i) => source(`d${i}/CLAUDE.md`))
    expect(renderPretty(result({ sources }), plain)).toContain('✓ 14 files · no drift · 210ms')
  })

  it('singularizes when there is a single source', () => {
    expect(renderPretty(result(), plain)).toContain('✓ 1 file · no drift · 210ms')
  })

  it('breaks down errors and warnings when there are problems', () => {
    const out = renderPretty(
      result({
        counts: { errors: 4, warnings: 1 },
        durationMs: 340,
        sources: [source('a'), source('b')],
      }),
      plain,
    )
    expect(out).toContain('2 files · 5 problems (4 errors, 1 warning) · 340ms')
  })

  it('omits the part of the breakdown that is zero', () => {
    const out = renderPretty(result({ counts: { errors: 1, warnings: 0 } }), plain)
    expect(out).toContain('1 problem (1 error) ·')
    expect(out).not.toContain('warning')
  })

  it('a fix run replaces the "fixable with --fix" line with what happened', () => {
    const out = renderPretty(result({ counts: { errors: 0, warnings: 0 }, fixable: 1 }), {
      ...plain,
      fixes: { applied: 1, files: 1, dryRun: false, entries: [] },
    })
    expect(out).toContain('1 fix applied in 1 file')
    // Telling somebody who has just run --fix that something is fixable with
    // --fix is the output saying it did not do what it was asked.
    expect(out).not.toContain('with --fix')
  })

  it('a fix run that applied nothing says so', () => {
    const out = renderPretty(result({ fixable: 1 }), {
      ...plain,
      fixes: { applied: 0, files: 0, dryRun: false, entries: [] },
    })
    expect(out).toContain('nothing applied')
  })

  it('a dry run is worded in the conditional, everywhere', () => {
    const out = renderPretty(result({ counts: { errors: 1, warnings: 0 } }), {
      ...plain,
      fixes: {
        applied: 1,
        files: 1,
        dryRun: true,
        entries: [{ file: 'AGENTS.md', line: 3, before: 'src/old.ts', after: 'src/new.ts' }],
      },
    })
    expect(out).toContain('would fix')
    expect(out).toContain('1 fix would apply in 1 file')
    // A `✓` on a line describing something that has not happened is how
    // somebody applies a fix twice.
    expect(out).not.toContain('✓')
  })

  it('the diff names the file, the line, and both sides of the replacement', () => {
    const out = renderPretty(result({ counts: { errors: 1, warnings: 0 } }), {
      ...plain,
      fixes: {
        applied: 2,
        files: 1,
        dryRun: false,
        entries: [
          { file: 'AGENTS.md', line: 3, before: 'src/old.ts', after: 'src/new.ts' },
          { file: 'AGENTS.md', line: 12, before: 'pnpm run biuld', after: 'pnpm run build' },
        ],
      },
    })
    expect(out).toContain('fixed\nAGENTS.md\n')
    expect(out).toContain('✓  3  src/old.ts      →  src/new.ts')
    expect(out).toContain('✓ 12  pnpm run biuld  →  pnpm run build')
  })

  it('--quiet suppresses the diff with the summary', () => {
    const out = renderPretty(result(), {
      color: false,
      quiet: true,
      fixes: {
        applied: 1,
        files: 1,
        dryRun: false,
        entries: [{ file: 'AGENTS.md', line: 3, before: 'a/b.ts', after: 'c/d.ts' }],
      },
    })
    expect(out).not.toContain('fixed')
  })

  it('the diff carries color when color is on, and none when it is off', () => {
    const fixes = {
      applied: 1,
      files: 1,
      dryRun: false,
      entries: [{ file: 'AGENTS.md', line: 3, before: 'a/b.ts', after: 'c/d.ts' }],
    }
    expect(renderPretty(result(), { ...plain, color: true, fixes })).toContain(ESC)
    expect(renderPretty(result(), { ...plain, fixes })).not.toContain(ESC)
  })

  it('--quiet suppresses the summary', () => {
    expect(renderPretty(result(), { color: false, quiet: true })).not.toContain('no drift')
  })

  it('groups the findings by file and orders them by line', () => {
    const out = renderPretty(
      result({
        findings: [
          finding('CLAUDE.md', 12, 'src/lib/auth.ts'),
          finding('CLAUDE.md', 34, 'src/other.ts'),
          finding('AGENTS.md', 3, 'scripts/x.sh'),
        ],
        counts: { errors: 3, warnings: 0 },
      }),
      plain,
    )
    const lines = out.split('\n')
    expect(lines[0]).toBe('CLAUDE.md')
    expect(lines[1]).toContain('12  src/lib/auth.ts')
    expect(lines[2]).toContain('34  src/other.ts')
    expect(lines.find((l) => l === 'AGENTS.md')).toBeDefined()
  })

  it('aligns the line number and the fragment within the group', () => {
    const out = renderPretty(
      result({
        findings: [finding('CLAUDE.md', 5, 'a/b.ts'), finding('CLAUDE.md', 120, 'c/d/e.ts')],
        counts: { errors: 2, warnings: 0 },
      }),
      plain,
    )
    expect(out).toContain('  ✗   5  a/b.ts    path does not exist')
    expect(out).toContain('  ✗ 120  c/d/e.ts  path does not exist')
  })

  it('truncates the fragment to 40 characters with an ellipsis', () => {
    const long = `src/${'x'.repeat(60)}.ts`
    const out = renderPretty(
      result({ findings: [finding('CLAUDE.md', 1, long)], counts: { errors: 1, warnings: 0 } }),
      plain,
    )
    expect(out).toContain('…')
    const cited = out.split('\n')[1]?.split('  ')[2] ?? ''
    expect(cited.length).toBe(40)
  })

  it('renders the suggestion when the finding carries one', () => {
    const base = finding('CLAUDE.md', 12, 'src/lib/auth.ts')
    const out = renderPretty(
      result({
        findings: [
          { ...base, suggestion: { value: 'src/auth/index.ts', confidence: 0.86, fixable: true } },
        ],
        counts: { errors: 1, warnings: 0 },
        fixable: 1,
      }),
      plain,
    )
    expect(out).toContain('→ src/auth/index.ts?')
    expect(out).toContain('1 fixable with --fix')
  })

  it('a warning uses the warning symbol and not the error one', () => {
    const out = renderPretty(
      result({
        findings: [{ ...finding('CLAUDE.md', 1, 'x/y.ts'), severity: 'warning' }],
        counts: { errors: 0, warnings: 1 },
      }),
      plain,
    )
    expect(out).toContain('⚠')
    expect(out).not.toContain('✗')
  })

  it('with no color it emits no escape sequences', () => {
    expect(renderPretty(result({ counts: { errors: 1, warnings: 0 } }), plain)).not.toContain(ESC)
  })

  it('with color it does emit them', () => {
    expect(renderPretty(result(), { color: true, quiet: false })).toContain(ESC)
  })

  it('uses no emojis: only the three symbols of SPEC.md § 5', () => {
    const out = renderPretty(result(), plain) + renderPretty(result({ checks: ['x'] }), plain)
    expect(out).not.toMatch(/\p{Extended_Pictographic}/u)
  })
})

describe('colorEnabled', () => {
  it('turns color off if NO_COLOR is set, even on a tty', () => {
    expect(colorEnabled({ NO_COLOR: '1' } as NodeJS.ProcessEnv, true)).toBe(false)
  })

  it('an empty NO_COLOR does not count as set', () => {
    expect(colorEnabled({ NO_COLOR: '' } as NodeJS.ProcessEnv, true)).toBe(true)
  })

  it('turns color off if stdout is not a tty', () => {
    expect(colorEnabled({} as NodeJS.ProcessEnv, false)).toBe(false)
  })

  it('turns it on for a tty with no NO_COLOR', () => {
    expect(colorEnabled({} as NodeJS.ProcessEnv, true)).toBe(true)
  })
})
