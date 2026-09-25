/**
 * The arithmetic in front of the one question nobody has checked.
 *
 * Ticket `36` pre-registers a selection, two controls and a decision rule, and
 * the whole point of pre-registering them is that they cannot move once the
 * number is in view. These tests are what stops them moving: the stride, the
 * per-repository cap, the blindness of the page a person reads, and the
 * baseline the agreement is scored against. None of it asks a model and none of
 * it decides anything.
 */
import { describe, expect, it } from 'vitest'
import {
  claimsByDocument,
  controlsIn,
  packetOf,
  pickSample,
  readingsIn,
  scoreOf,
  type Answer,
  type Document,
  type Reading,
  type Sampled,
} from '../scripts/jev/ownership.ts'

const docs = (spec: ReadonlyArray<[string, number]>): Document[] =>
  spec.flatMap(([repo, n]) =>
    Array.from({ length: n }, (_, i) => ({ repo, path: `skills/${i}/SKILL.md` })),
  )

describe('the sample, as ticket 36 pre-registered it', () => {
  it('takes one document per repository and no more', () => {
    const picked = pickSample(docs([['o/hoarder', 60]]), 5)
    expect(picked).toHaveLength(1)
  })

  it('fills the sample by walking past a repository already at its cap', () => {
    // The hoarder occupies a long contiguous run of the population. A stride
    // that skipped rather than walked would come back with four documents
    // where five were pre-registered.
    const picked = pickSample(
      [
        ...docs([['o/hoarder', 40]]),
        ...docs([
          ['o/a', 1],
          ['o/b', 1],
          ['o/c', 1],
          ['o/d', 1],
        ]),
      ],
      5,
    )
    expect(picked).toHaveLength(5)
    expect(new Set(picked.map((p) => p.repo)).size).toBe(5)
  })

  it('spreads across the population rather than taking the head of it', () => {
    const picked = pickSample(
      docs(Array.from({ length: 100 }, (_, i) => [`o/r${i}`, 1] as [string, number])),
      4,
    )
    expect(picked.map((p) => p.repo)).toEqual(['o/r0', 'o/r25', 'o/r50', 'o/r75'])
  })

  it('never returns the same document twice', () => {
    const picked = pickSample(
      docs([
        ['o/a', 1],
        ['o/b', 1],
      ]),
      10,
    )
    expect(new Set(picked.map((p) => `${p.repo}|${p.path}`)).size).toBe(picked.length)
  })
})

describe('the claims a document made', () => {
  it('collects path/missing per document and ignores the other checks', () => {
    const text = [
      JSON.stringify({
        repo: 'o/a',
        findings: [
          { check: 'path/missing', path: 'AGENTS.md', text: 'src/x.ts' },
          { check: 'path/missing', path: 'AGENTS.md', text: 'src/y.ts' },
          { check: 'link/broken', path: 'AGENTS.md', text: '#anchor' },
        ],
      }),
      'not json',
    ].join('\n')
    expect(claimsByDocument(text).get('o/a|AGENTS.md')).toEqual(['src/x.ts', 'src/y.ts'])
  })
})

describe('the two controls', () => {
  const classification = [
    '| 1 | `o/own` | `AGENTS.md:10:4` | `path/missing` | `src/moved.ts` | **true** | — | round 1 |',
    '| 2 | `o/own` | `AGENTS.md:12:4` | `path/missing` | `src/gone.ts` | **true** | — | round 1 |',
    '| 3 | `o/noisy` | `AGENTS.md:9:4` | `path/missing` | `gateway/run.rs` | **false** | crate-nickname | round 1 |',
  ].join('\n')

  it('expects react-router to read as somebody else’s project', () => {
    const [first] = controlsIn(classification)
    expect(first?.repo).toBe('remix-run/react-router')
    expect(first?.control).toBe('another-project')
  })

  it('takes a document carrying a true positive as the own-and-stale control', () => {
    const controls = controlsIn(classification)
    expect(controls.filter((c) => c.control === 'this-repo').map((c) => c.repo)).toEqual(['o/own'])
  })

  it('never takes a false positive as a control', () => {
    expect(controlsIn(classification).some((c) => c.repo === 'o/noisy')).toBe(false)
  })
})

describe('the page a person reads', () => {
  const entries: Sampled[] = [
    { repo: 'o/a', path: 'AGENTS.md', claims: ['src/x.ts'] },
    { repo: 'o/b', path: 'SKILL.md', claims: ['y.ts'], control: 'another-project' },
  ]
  const packet = packetOf(entries, () => 'excerpt')

  it('is blind: no entry carries a probability or says which one is a control', () => {
    // The preamble says controls are mixed in, which is honest and costs
    // nothing: knowing some exist is not knowing which. What would contaminate
    // the reading is an entry that says so, and no entry does.
    const sections = packet.split(/^## /mu).slice(1, 1 + entries.length)
    expect(sections).toHaveLength(entries.length)
    for (const section of sections) {
      expect(section).not.toContain('aboutThisRepo')
      expect(section).not.toContain('control')
      expect(section).not.toContain('another-project')
    }
  })

  it('says what the question is not, because that is the failure mode', () => {
    expect(packet).toContain('not a ruling')
    expect(packet).toContain('is this finding false')
  })

  it('gives every entry a line on the answer sheet, in order', () => {
    expect(packet).toContain(' 1. o/a AGENTS.md ->')
    expect(packet).toContain(' 2. o/b SKILL.md ->')
  })

  it('round-trips an answer back off the sheet', () => {
    const filled = packet.replace(' 1. o/a AGENTS.md ->', ' 1. o/a AGENTS.md -> this-repo')
    expect(readingsIn(filled).get('o/a|AGENTS.md')).toBe('this-repo')
  })

  it('ignores a line left blank', () => {
    expect(readingsIn(packet).size).toBe(0)
  })

  it('reads the document off the line rather than off its number', () => {
    // A sheet whose lines were reordered or pasted twice must not put an
    // answer against a document it was not written for.
    const sheet = ' 7. o/b SKILL.md -> another-project\n 1. o/a AGENTS.md -> this-repo\n'
    expect([...readingsIn(sheet)]).toEqual([
      ['o/b|SKILL.md', 'another-project'],
      ['o/a|AGENTS.md', 'this-repo'],
    ])
  })
})

const answer = (repo: string, p: number): Answer => ({
  repo,
  path: 'AGENTS.md',
  aboutThisRepo: p,
  repoKind: 'product-with-skills',
  confidence: 1,
})

const readings = (spec: ReadonlyArray<[string, Reading]>): Map<string, Reading> =>
  new Map(spec.map(([repo, r]) => [`${repo}|AGENTS.md`, r]))

describe('the score, against the baseline fixed before the number', () => {
  it('scores agreement at the cut and names the baseline', () => {
    const out = scoreOf(
      readings([
        ['o/a', 'this-repo'],
        ['o/b', 'another-project'],
      ]),
      [answer('o/a', 0.9), answer('o/b', 0.2)],
      new Map(),
    )
    expect(out).toContain('Jev agrees        2  100.0%')
    expect(out).toContain('Baseline          1  50.0%')
  })

  it('leaves the controls out of the agreement figure', () => {
    const out = scoreOf(
      readings([
        ['o/a', 'this-repo'],
        ['o/control', 'another-project'],
      ]),
      [answer('o/a', 0.9), answer('o/control', 0.1)],
      new Map([['o/control|AGENTS.md', 'another-project']]),
    )
    expect(out).toContain('1 documents read by a person')
  })

  it('reports a control that came back the wrong way as a failure', () => {
    const out = scoreOf(
      readings([['o/control', 'another-project']]),
      [answer('o/control', 0.95)],
      new Map([['o/control|AGENTS.md', 'another-project']]),
    )
    expect(out).toContain('FAIL  o/control|AGENTS.md')
  })

  it('says the decision rule and says nothing here is a precision', () => {
    const out = scoreOf(new Map(), [], new Map())
    expect(out).toContain('least 15 points')
    expect(out).toContain('Nothing here is a precision')
  })
})
