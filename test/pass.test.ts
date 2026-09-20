/**
 * The bookkeeping every pass over a corpus shares.
 *
 * The rule under test is the one seven passes each restated in a comment and
 * then implemented slightly differently: **a request that failed is not a
 * judgement**. If a failure were scored as a `no`, a bad network would write
 * the result and the run would read as clean rather than as short.
 */
import { describe, expect, it, vi } from 'vitest'
import { runPass } from '../scripts/lib/pass.ts'

const quiet = (): { lines: string[]; done: () => void } => {
  const lines: string[] = []
  const spy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
    lines.push(String(chunk))
    return true
  })
  return { lines, done: () => spy.mockRestore() }
}

describe('what comes back', () => {
  it('keeps the order of the answers, whatever order they finish in', async () => {
    const io = quiet()
    const { answered } = await runPass({
      items: [30, 1, 20, 2],
      width: 3,
      nameOf: String,
      answer: async (ms) => {
        await new Promise((resolve) => setTimeout(resolve, ms))
        return ms
      },
    })
    io.done()
    expect(answered).toEqual([30, 1, 20, 2])
  })

  it('drops a request that failed rather than scoring it', async () => {
    const io = quiet()
    const { answered, failed } = await runPass({
      items: [1, 2, 3, 4],
      width: 2,
      nameOf: (n) => `item ${n}`,
      answer: async (n) => {
        if (n % 2 === 0) throw new Error('gateway said no')
        return n
      },
    })
    io.done()
    expect(answered).toEqual([1, 3])
    expect(failed).toBe(2)
  })

  it('does not count a skipped item as a failure', async () => {
    const io = quiet()
    const { answered, failed } = await runPass({
      items: [1, 2, 3],
      width: 2,
      nameOf: String,
      answer: async (n) => (n === 2 ? undefined : n),
    })
    io.done()
    expect(answered).toEqual([1, 3])
    expect(failed).toBe(0)
  })
})

describe('what it says while it runs', () => {
  it('names the first few failures and counts the rest', async () => {
    const io = quiet()
    const { failed } = await runPass({
      items: [...Array.from({ length: 12 }).keys()],
      width: 4,
      nameOf: (n) => `item ${n}`,
      answer: async () => {
        throw new Error('gateway is down')
      },
    })
    io.done()
    expect(failed).toBe(12)
    const named = io.lines.filter((line) => line.includes('gateway is down'))
    expect(named).toHaveLength(5)
    expect(io.lines.join('')).toContain('and 7 more that failed')
  })

  it('reports progress at the interval the pass asked for', async () => {
    const io = quiet()
    await runPass({
      items: [...Array.from({ length: 10 }).keys()],
      width: 1,
      every: 4,
      nameOf: String,
      answer: async (n) => n,
    })
    io.done()
    expect(io.lines.filter((line) => line.includes('/10'))).toHaveLength(2)
  })
})
