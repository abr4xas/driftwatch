/**
 * The instrument that settles a rule change, so its own arithmetic has to be
 * boring and right.
 *
 * The key is the whole design: two audits of documents that did not change, so
 * a finding is the same finding only if it is in the same place. A looser key
 * would report an experiment as having moved nothing when it moved a finding
 * down a line, which is the failure this tool exists to make impossible.
 */
import { describe, expect, it } from 'vitest'
import { diffOf, findingsIn, keyOf, report, type Finding } from '../scripts/discovery/diff.ts'

const finding = (text: string, extra: Partial<Finding> = {}): Finding => ({
  check: 'path/missing',
  path: 'CLAUDE.md',
  line: 10,
  column: 3,
  text,
  ...extra,
})

const audit = (...outcomes: { repo: string; findings: Finding[] }[]): string =>
  `${outcomes.map((o) => JSON.stringify(o)).join('\n')}\n`

describe('what counts as the same finding', () => {
  it('separates two findings that differ only in position', () => {
    expect(keyOf('o/r', finding('x.md'))).not.toBe(keyOf('o/r', finding('x.md', { line: 11 })))
  })

  it('separates the same text in two repositories', () => {
    expect(keyOf('o/a', finding('x.md'))).not.toBe(keyOf('o/b', finding('x.md')))
  })

  it('separates two checks firing on one place', () => {
    expect(keyOf('o/r', finding('x.md'))).not.toBe(
      keyOf('o/r', finding('x.md', { check: 'link/broken' })),
    )
  })
})

describe('reading an audit', () => {
  it('skips a repository with no findings, and a torn line', () => {
    const text = `${audit({ repo: 'o/a', findings: [finding('x.md')] })}{"repo":"o/b"}\n{"repo":\n`
    expect(findingsIn(text).size).toBe(1)
  })
})

describe('the diff', () => {
  const before = audit(
    { repo: 'o/a', findings: [finding('kept.md'), finding('gone.md', { line: 20 })] },
    { repo: 'o/b', findings: [] },
  )
  const after = audit(
    { repo: 'o/a', findings: [finding('kept.md'), finding('new.md', { line: 30 })] },
    { repo: 'o/b', findings: [] },
  )

  it('names what appeared and what disappeared, and counts both sides', () => {
    const diff = diffOf(before, after)
    expect(diff.added.map((row) => row.finding.text)).toEqual(['new.md'])
    expect(diff.removed.map((row) => row.finding.text)).toEqual(['gone.md'])
    expect([diff.before, diff.after]).toEqual([2, 2])
  })

  it('reports nothing moved when nothing moved', () => {
    const diff = diffOf(before, before)
    expect([diff.added, diff.removed]).toEqual([[], []])
  })
})

describe('the fixable warning, which is the one load-bearing line', () => {
  it('stays quiet when no added finding is fixable', () => {
    const diff = diffOf('', audit({ repo: 'o/a', findings: [finding('new.md')] }))
    expect(report(diff)).toContain('No added finding is fixable.')
  })

  it('names ADR-0006 condition 2 when one is', () => {
    const diff = diffOf(
      '',
      audit({ repo: 'o/a', findings: [finding('new.md', { fixable: true })] }),
    )
    const text = report(diff)
    expect(text).toContain('FIXABLE')
    expect(text).toContain('condition 2')
  })

  it('does not warn about a fixable finding that was removed', () => {
    const diff = diffOf(audit({ repo: 'o/a', findings: [finding('x.md', { fixable: true })] }), '')
    expect(report(diff)).toContain('No added finding is fixable.')
  })
})

describe('the disclaimer', () => {
  it('says the output is not a ruling and not a precision', () => {
    const text = report(diffOf('', ''))
    expect(text).toContain('No ruling here')
    expect(text).toContain('Nothing in this output is a precision')
  })
})
