/**
 * The review script's arithmetic, which is everything in it except the
 * question.
 *
 * `scripts/review.ts` puts what the extractor threw away back to a person, one
 * sentence at a time, and the parts worth pinning are the two that decide what
 * gets asked: a candidate the repository already satisfies is not asked about,
 * and the same word in the same file for the same reason is asked about once.
 * Both are cuts ticket `07`'s sampler makes for the same reasons.
 */
import { describe, expect, it } from 'vitest'
import type { Discard } from '../src/extract/context.ts'
import type { Source } from '../src/core/types.ts'
import { candidatesIn, formatSuggestions } from '../scripts/jev/review.ts'

const source: Source = {
  path: 'AGENTS.md',
  kind: 'agents-md',
  content: '',
  baseDir: '',
  absPath: '/repo/AGENTS.md',
  aliases: [],
}

function discardOf(text: string, cause: string, line = 1): Discard {
  return {
    source,
    kind: 'path',
    cause,
    text,
    offset: [0, 0],
    line,
    window: `see \`${text}\``,
  } as Discard
}

describe('candidatesIn', () => {
  it('drops what the repository already satisfies', () => {
    const discards = [discardOf('there.ts', 'bare-word'), discardOf('gone.ts', 'bare-word')]
    const kept = candidatesIn(discards, (discard) => discard.text === 'there.ts')
    expect(kept.map((candidate) => candidate.text)).toEqual(['gone.ts'])
  })

  it('asks once per file, cause and word', () => {
    const discards = [
      discardOf('gone.ts', 'bare-word', 4),
      discardOf('gone.ts', 'bare-word', 9),
      // A second rule reaching the same word is a second question: which rule
      // threw it away is part of what the reader is being shown.
      discardOf('gone.ts', 'not-path-shaped', 9),
    ]
    const kept = candidatesIn(discards, () => false)
    expect(kept).toHaveLength(2)
    expect(kept.map((candidate) => candidate.cause)).toEqual(['bare-word', 'not-path-shaped'])
  })
})

describe('formatSuggestions', () => {
  it('says so plainly when nothing reads as a claim', () => {
    expect(formatSuggestions([], 24)).toContain('none of the 24')
  })

  it('never calls a suggestion a finding', () => {
    const out = formatSuggestions(
      [
        {
          file: 'AGENTS.md',
          line: 3,
          text: 'gone.ts',
          cause: 'bare-word',
          sentence: 'see `gone.ts`',
          probability: 0.9,
        },
      ],
      24,
    )
    expect(out).toContain('These are not findings.')
    expect(out).toContain('0.90')
  })
})
