/**
 * One pass over a corpus: ask a question of every item, several at a time.
 *
 * Seven passes had written this loop out, and with it seven copies of the rule
 * that matters most here — **a request that failed is not a judgement**. Each
 * copy restated it in a comment and then implemented it slightly differently:
 * six printed every failure, one capped the printing at five, and the progress
 * interval was 50, 200 or 250 depending on the file. None of that is a
 * decision any pass made on purpose.
 *
 * What a pass keeps is its question, its state and its thresholds. What it
 * hands over is the bookkeeping.
 */
import { messageOf } from '../../src/core/errors.ts'
import { inFlight } from './concurrency.ts'

/** How many distinct failures get a line before the tail is counted instead. */
const SHOW_FAILURES = 5

export type Pass<T, R> = {
  readonly items: readonly T[]
  /** How many requests are open at once. */
  readonly width: number
  /** How often a progress line goes to stderr. */
  readonly every?: number
  /** Names one item, for the failure line. Keep it short. */
  readonly nameOf: (item: T) => string
  /**
   * The question. Throwing means the request failed; returning `undefined`
   * means there was nothing to ask about, which is not a failure.
   */
  readonly answer: (item: T) => Promise<R | undefined>
}

export type Ran<R> = {
  /** Only the items that came back with an answer, in the order they were asked. */
  readonly answered: R[]
  /** How many requests threw. Never counted as a `no`. */
  readonly failed: number
}

/**
 * Runs `answer` over the items and keeps the ones that answered.
 *
 * Failures are dropped rather than scored. Scoring them as a `no` would let a
 * bad network write the result — it would flatter or damn the model for
 * something neither of them did — and it reads as a clean run, which is worse
 * than reading as a short one. The count comes back so the caller can say it.
 */
export async function runPass<T, R>(pass: Pass<T, R>): Promise<Ran<R>> {
  const { items, width, nameOf, answer } = pass
  const every = pass.every ?? 50
  let done = 0
  let failed = 0

  const out = await inFlight(items, width, async (item) => {
    let result: R | undefined
    try {
      result = await answer(item)
    } catch (cause) {
      failed += 1
      if (failed <= SHOW_FAILURES) {
        process.stderr.write(`  ${nameOf(item)}: ${messageOf(cause)}\n`)
      }
      result = undefined
    }
    done += 1
    if (done % every === 0) process.stderr.write(`  ${done}/${items.length}\n`)
    return result
  })

  if (failed > SHOW_FAILURES) {
    process.stderr.write(`  ... and ${failed - SHOW_FAILURES} more that failed\n`)
  }
  return { answered: out.filter((row): row is R => row !== undefined), failed }
}
