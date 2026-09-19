/**
 * The timing instrument itself, which is worth a test because a budget that
 * measures the wrong thing fails in the way that teaches people to re-run it.
 */
import { describe, expect, it } from 'vitest'
import { fastestOf } from './helpers/budget.ts'

describe('the fastest of several runs', () => {
  it('runs the work once to warm up and then the number asked for', async () => {
    let calls = 0
    await fastestOf(3, async () => {
      calls += 1
    })
    expect(calls).toBe(4)
  })

  it('takes the minimum, because contention only ever adds time', async () => {
    // A slow first measured run and a fast second is exactly the shape a
    // contended worker produces, and the budget is about the second.
    let call = 0
    const elapsed = await fastestOf(2, async () => {
      call += 1
      if (call === 2) await new Promise((resolve) => setTimeout(resolve, 40))
    })
    expect(elapsed).toBeLessThan(40)
  })
})
