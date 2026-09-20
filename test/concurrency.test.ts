/**
 * The worker pool every pass over a corpus runs through.
 *
 * It is four lines of bookkeeping and both of them are worth pinning: a pass
 * that reorders its answers attributes a judgement to the wrong finding, and
 * one that ignores its width opens as many requests as it has items.
 */
import { describe, expect, it } from 'vitest'
import { inFlight } from '../scripts/lib/concurrency.ts'

describe('running several at a time', () => {
  it('keeps the order of the answers, whatever order they finish in', async () => {
    const out = await inFlight([30, 1, 20, 2], 3, async (ms) => {
      await new Promise((resolve) => setTimeout(resolve, ms))
      return ms
    })
    expect(out).toEqual([30, 1, 20, 2])
  })

  it('never runs more than the width at once', async () => {
    let live = 0
    let peak = 0
    await inFlight([...Array.from({ length: 20 }).keys()], 4, async () => {
      live += 1
      peak = Math.max(peak, live)
      await new Promise((resolve) => setTimeout(resolve, 2))
      live -= 1
    })
    expect(peak).toBeLessThanOrEqual(4)
  })
})
