/**
 * The deterministic half of the template-family pass, with no clone, no disk
 * and no model.
 *
 * What can go wrong here is not that it misses a family. It is that it hands
 * the model the wrong question, or that it collapses two documents which are
 * genuinely two — and either produces a table that reads like evidence while
 * being about nothing.
 */
import { describe, expect, it } from 'vitest'
import {
  candidatePairs,
  familiesOf,
  fingerprint,
  formatFamilies,
  overlapOf,
  representatives,
  type Doc,
} from '../scripts/discovery-families.ts'

const LONG = (n: number): string => `this is a line of prose long enough to count, number ${n}`
const doc = (repo: string, path: string, content: string): Doc => ({ repo, path, content })
const body = (n: number, extra = ''): string =>
  `${Array.from({ length: n }, (_, i) => LONG(i)).join('\n')}\n${extra}`

describe('what a comparison is allowed to use', () => {
  it('ignores lines too short to mean anything', () => {
    // A blank, a `---`, a `## Usage`. They are shared by documents with nothing
    // to do with each other, and they are most of what two unrelated files have
    // in common.
    const print = fingerprint(doc('a/one', 'CLAUDE.md', '---\n## Usage\n\n' + LONG(1) + '\n'))
    expect(print.lines.size).toBe(1)
  })

  it('reads two documents that differ by one byte as nearly the same', () => {
    // The pair ticket `17` exists for: 9506 bytes against 9507, a comma
    // promoted to an em dash. Different hashes, and one document.
    const a = fingerprint(
      doc('a/one', 'SKILL.md', body(20, 'stylesheets, quiz widgets, and more.')),
    )
    const b = fingerprint(
      doc('b/two', 'SKILL.md', body(20, 'stylesheets, quiz widgets — and more.')),
    )
    expect(a.hash).not.toBe(b.hash)
    expect(overlapOf(a, b)).toBeGreaterThan(0.9)
  })
})

const prints = (docs: readonly Doc[]): ReturnType<typeof fingerprint>[] => docs.map(fingerprint)

describe('the pairs a model is asked about', () => {
  it('are near-duplicates in different repositories', () => {
    const pairs = candidatePairs(
      prints([
        doc(
          'a/one',
          '.agents/skills/teach/SKILL.md',
          body(20, 'a tail sentence here, long enough.'),
        ),
        doc(
          'b/two',
          '.agents/skills/teach/SKILL.md',
          body(20, 'a tail sentence here — long enough.'),
        ),
      ]),
    )
    expect(pairs).toHaveLength(1)
    expect(pairs[0]?.overlap).toBeGreaterThan(0.9)
  })

  it('never include an identical pair, which a hash already answers', () => {
    const same = body(20)
    expect(
      candidatePairs(prints([doc('a/one', 'SKILL.md', same), doc('b/two', 'SKILL.md', same)])),
    ).toEqual([])
  })

  it('never include two documents from one repository', () => {
    // A project repeating its own document is one project. `07` counts
    // observations per repository, so collapsing within one changes nothing.
    expect(
      candidatePairs(
        prints([
          doc('a/one', 'x/SKILL.md', body(20, 'tail one, a sentence with length.')),
          doc('a/one', 'y/SKILL.md', body(20, 'tail two, a sentence with length.')),
        ]),
      ),
    ).toEqual([])
  })

  it('never cross basenames', () => {
    expect(
      candidatePairs(
        prints([
          doc('a/one', 'CLAUDE.md', body(20, 'tail one, a sentence with length.')),
          doc('b/two', 'AGENTS.md', body(20, 'tail two, a sentence with length.')),
        ]),
      ),
    ).toEqual([])
  })

  it('leave unrelated documents alone', () => {
    const pairs = candidatePairs(
      prints([
        doc('a/one', 'CLAUDE.md', 'this repository builds a rust parser for midi files.\n'),
        doc('b/two', 'CLAUDE.md', 'a python service that renders invoices as pdf documents.\n'),
      ]),
    )
    expect(pairs).toEqual([])
  })
})

describe('the families', () => {
  it('group identical documents with no judgement at all', () => {
    const same = body(20)
    const fam = familiesOf([
      fingerprint(doc('a/one', 'CLAUDE.md', same)),
      fingerprint(doc('b/two', 'CLAUDE.md', same)),
      fingerprint(doc('c/three', 'CLAUDE.md', 'something else entirely, but long enough.\n')),
    ])
    expect(fam.size).toBe(2)
  })

  it('are transitive, because a template edited twice is still one template', () => {
    // A is B edited and B is C edited. Counting those as two families would be
    // the bug this ticket is about, halved.
    const fam = familiesOf(
      ['a/one', 'b/two', 'c/three'].map((r) => fingerprint(doc(r, 'SKILL.md', body(20, r)))),
      [
        ['a/one|SKILL.md', 'b/two|SKILL.md'],
        ['b/two|SKILL.md', 'c/three|SKILL.md'],
      ],
    )
    expect(fam.size).toBe(1)
    expect([...fam.values()][0]).toHaveLength(3)
  })

  it('ignore a confirmed pair naming a document that is not there', () => {
    const fam = familiesOf(
      [fingerprint(doc('a/one', 'SKILL.md', body(20)))],
      [['ghost|x', 'a/one|SKILL.md']],
    )
    expect(fam.size).toBe(1)
  })

  it('offer one document per family, which is what the reading wants', () => {
    const same = body(20)
    const fam = familiesOf([
      fingerprint(doc('b/two', 'CLAUDE.md', same)),
      fingerprint(doc('a/one', 'CLAUDE.md', same)),
    ])
    expect(representatives(fam)).toEqual(new Set(['a/one|CLAUDE.md']))
  })

  it('report only the families that span repositories', () => {
    const same = body(20)
    const fam = familiesOf([
      fingerprint(doc('a/one', 'CLAUDE.md', same)),
      fingerprint(doc('b/two', 'CLAUDE.md', same)),
      fingerprint(doc('c/three', 'CLAUDE.md', 'alone, and long enough to be a line.\n')),
    ])
    const out = formatFamilies(fam)
    expect(out).toContain('1 span more than one repository')
    expect(out).toContain('a/one, b/two')
  })
})
