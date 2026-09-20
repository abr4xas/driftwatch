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
import { describe, expect, it, vi } from 'vitest'
import type { Discard } from '../src/extract/context.ts'
import type { Source } from '../src/core/types.ts'
import { candidatesIn, formatSuggestions, reviewMain } from '../scripts/jev/review.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

/** Holds stdout and stderr while a pass runs, so the suite stays readable. */
function capture(): { out: string; done: () => void } {
  const chunks: string[] = []
  const spies = (['stdout', 'stderr'] as const).map((stream) =>
    vi.spyOn(process[stream], 'write').mockImplementation((chunk) => {
      chunks.push(String(chunk))
      return true
    }),
  )
  const held = {
    get out(): string {
      return chunks.join('')
    },
    done: (): void => {
      for (const spy of spies) spy.mockRestore()
    },
  }
  return held
}

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

describe('the whole pass, driven by a fake', () => {
  it('asks about each unsatisfied candidate and prints the ones above the bar', async () => {
    const cwd = makeTempRepo({
      files: {
        'AGENTS.md': [
          '# Instructions',
          '',
          'The entry point is `missing-thing.ts` and you should read it.',
          '',
          'Run `pnpm build` before you commit.',
          '',
          'The helper lives in `src/present.ts`.',
        ].join('\n'),
        'src/present.ts': 'export const present = true\n',
      },
    })
    const asked: string[] = []
    const io = capture()
    const code = await reviewMain(cwd, 0.7, 200, 4, async (state) => {
      asked.push(state.candidate)
      return state.candidate === 'missing-thing.ts' ? 0.91 : 0.12
    })
    io.done()

    expect(code).toBe(0)
    // No key was set and none was needed: the pass never opened the gateway.
    expect(asked).toContain('missing-thing.ts')
    expect(asked).not.toContain('src/present.ts')
    expect(io.out).toContain('missing-thing.ts')
    expect(io.out).toContain('0.91')
    expect(io.out).not.toContain('0.12')
  })

  it('asks nothing, and says so, when the repository satisfies everything', async () => {
    const cwd = makeTempRepo({
      files: {
        'AGENTS.md': 'The helper lives in `src/present.ts`.\n',
        'src/present.ts': 'export const present = true\n',
      },
    })
    let calls = 0
    const io = capture()
    const code = await reviewMain(cwd, 0.7, 200, 4, async () => {
      calls += 1
      return 1
    })
    io.done()
    expect(code).toBe(0)
    expect(calls).toBe(0)
  })
})
