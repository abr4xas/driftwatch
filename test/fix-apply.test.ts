import { describe, expect, it } from 'vitest'
import { applyEdits, applyPlan, planFixes } from '../src/fix/apply.ts'
import type { FixEdit } from '../src/fix/range.ts'
import type { Finding, Source } from '../src/core/types.ts'
import { run } from '../src/run.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

function source(content: string, path = 'AGENTS.md'): Source {
  return { path, absPath: `/tmp/${path}`, kind: 'agents-md', content, baseDir: '', aliases: [] }
}

function edit(at: Source, range: [number, number], replacement: string): FixEdit {
  return { source: at, range, replacement }
}

describe('applyEdits', () => {
  it('copies the content when there is nothing to apply', () => {
    expect(applyEdits('one two\n', [])).toBe('one two\n')
  })

  it('replaces one range', () => {
    const at = source('see src/old.ts here\n')
    expect(applyEdits(at.content, [edit(at, [4, 14], 'src/new.ts')])).toBe('see src/new.ts here\n')
  })

  it('replaces several, including two on one line', () => {
    const at = source('a AAA b BBB c\n')
    const edits = [edit(at, [2, 5], 'x'), edit(at, [8, 11], 'yyyyy')]
    expect(applyEdits(at.content, edits)).toBe('a x b yyyyy c\n')
  })

  it('a replacement of a different length does not move the ones after it', () => {
    const at = source('1 22 333 4444\n')
    const edits = [edit(at, [2, 4], 'a'), edit(at, [5, 8], 'bbbbbb'), edit(at, [9, 13], 'c')]
    expect(applyEdits(at.content, edits)).toBe('1 a bbbbbb c\n')
  })
})

describe('applyEdits preserves what it was not asked to change', () => {
  it('keeps CRLF endings', () => {
    const at = source('one\r\nsrc/old.ts\r\nthree\r\n')
    const out = applyEdits(at.content, [edit(at, [5, 15], 'src/new.ts')])
    expect(out).toBe('one\r\nsrc/new.ts\r\nthree\r\n')
  })

  it('keeps a missing trailing newline', () => {
    const at = source('src/old.ts')
    expect(applyEdits(at.content, [edit(at, [0, 10], 'src/new.ts')])).toBe('src/new.ts')
  })

  it('keeps trailing whitespace', () => {
    const at = source('src/old.ts   \n')
    expect(applyEdits(at.content, [edit(at, [0, 10], 'x/y.ts')])).toBe('x/y.ts   \n')
  })

  it('lands where it should after a multi-byte character', () => {
    // Offsets are UTF-16 code units on both sides, as mdast's are. The test is
    // here to catch the day something starts counting bytes.
    const at = source('a 🚀 src/old.ts\n')
    const start = at.content.indexOf('src/old.ts')
    const out = applyEdits(at.content, [edit(at, [start, start + 10], 'src/new.ts')])
    expect(out).toBe('a 🚀 src/new.ts\n')
  })
})

/** A finding whose suggestion is fixable but whose edit is supplied by hand. */
function fakeFinding(at: Source, text: string, offset: [number, number], value: string): Finding {
  return {
    check: 'path/missing',
    severity: 'error',
    message: 'path does not exist',
    suggestion: { value, confidence: 1, fixable: true },
    claim: {
      kind: 'path',
      source: at,
      text,
      raw: text,
      range: { line: 1, column: 1, endLine: 1, endColumn: 1 },
      offset,
      context: 'inline-code',
    },
  }
}

describe('planFixes refuses what cannot be applied safely', () => {
  it('drops both sides of an overlap rather than picking one', () => {
    const at = source('see src/old.ts here\n')
    const plans = planFixes([
      fakeFinding(at, 'src/old.ts', [4, 14], 'src/new.ts'),
      fakeFinding(at, 'src/old', [4, 11], 'src/other'),
    ])
    expect(plans.plans).toEqual([])
    expect(plans.refusals.map((refusal) => refusal.reason)).toEqual(['overlaps', 'overlaps'])
  })

  it('drops an edit that would change nothing', () => {
    const at = source('see src/old.ts here\n')
    const plans = planFixes([fakeFinding(at, 'src/old.ts', [4, 14], 'src/old.ts')])
    expect(plans.plans).toEqual([])
    expect(plans.refusals.map((refusal) => refusal.reason)).toEqual(['no-op'])
  })

  it('drops a range that falls outside the content', () => {
    const at = source('short\n')
    const plans = planFixes([fakeFinding(at, 'src/old.ts', [4, 400], 'src/new.ts')])
    expect(plans.plans).toEqual([])
    // Refused as `no-edit` and not as `out-of-bounds`, because `fix/range.ts`
    // gets there first: its guard compares the bytes at the range with the
    // fragment the claim recorded, and a range past the end cannot match. The
    // bounds check here is the second layer, and the layering is the point —
    // it is asserted as what it is rather than as what the ticket guessed.
    expect(plans.refusals.map((refusal) => refusal.reason)).toEqual(['no-edit'])
  })

  it('records a fixable finding that has no placeable edit', async () => {
    // A nested source: `fix/range.ts` refuses to rewrite its relative paths.
    const root = makeTempRepo({
      files: {
        'packages/api/AGENTS.md': 'The entry point is `src/util/date.ts`.\n',
        'packages/api/src/helpers/date.ts': '',
      },
    })
    const result = await run({ cwd: root, paths: [] })
    const plans = planFixes(result.findings)
    expect(plans.plans).toEqual([])
    expect(plans.refusals.map((refusal) => refusal.reason)).toEqual(['no-edit'])
  })

  it('ignores a finding whose suggestion is not fixable', () => {
    const at = source('see src/old.ts here\n')
    const finding = fakeFinding(at, 'src/old.ts', [4, 14], 'src/new.ts')
    const plans = planFixes([
      { ...finding, suggestion: { value: 'x', confidence: 0.3, fixable: false } },
    ])
    expect(plans).toEqual({ plans: [], refusals: [] })
  })
})

describe('planFixes groups by source', () => {
  it('one plan per file, with its edits sorted', () => {
    const first = source('see src/old.ts and lib/old.ts\n', 'AGENTS.md')
    const second = source('see src/old.ts\n', 'docs/CLAUDE.md')
    const plans = planFixes([
      fakeFinding(first, 'lib/old.ts', [19, 29], 'lib/new.ts'),
      fakeFinding(second, 'src/old.ts', [4, 14], 'src/new.ts'),
      fakeFinding(first, 'src/old.ts', [4, 14], 'src/new.ts'),
    ]).plans

    expect(plans.map((plan) => plan.source.path)).toEqual(['AGENTS.md', 'docs/CLAUDE.md'])
    expect(plans[0]?.edits.map((one) => one.range[0])).toEqual([4, 19])
    expect(applyPlan(plans[0]!)).toBe('see src/new.ts and lib/new.ts\n')
    expect(applyPlan(plans[1]!)).toBe('see src/new.ts\n')
  })

  it('carries the findings its edits came from, in the same order', () => {
    const at = source('see src/old.ts and lib/old.ts\n')
    const plan = planFixes([
      fakeFinding(at, 'lib/old.ts', [19, 29], 'lib/new.ts'),
      fakeFinding(at, 'src/old.ts', [4, 14], 'src/new.ts'),
    ]).plans[0]
    expect(plan?.findings.map((finding) => finding.claim.text)).toEqual([
      'src/old.ts',
      'lib/old.ts',
    ])
  })
})

describe('a plan over a real run', () => {
  it('produces the corrected document', async () => {
    const root = makeTempRepo({
      files: {
        'AGENTS.md': 'The entry point is `./src/util/date.ts`, run `pnpm run biuld`.\n',
        'package.json': JSON.stringify({ scripts: { build: 'tsdown' } }),
        'src/helpers/date.ts': '',
      },
    })
    const result = await run({ cwd: root, paths: [] })
    const { plans } = planFixes(result.findings)
    expect(plans).toHaveLength(1)
    expect(applyPlan(plans[0]!)).toBe(
      'The entry point is `./src/helpers/date.ts`, run `pnpm run build`.\n',
    )
  })
})
