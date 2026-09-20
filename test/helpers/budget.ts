/**
 * Timing a budget inside a test suite that runs one worker per file.
 *
 * The budgets in `ARCHITECTURE.md` § Performance are part of the product, so
 * they are verified rather than trusted. The instrument was the problem, not
 * the threshold: `pnpm test` spawns a worker per test file — forty-odd of them
 * — and a single wall-clock sample taken inside that measures the scheduler as
 * much as the code. The 300 ms acceptance budget failed about one full run in
 * three and passed every time it was run alone. Ticket `19`.
 *
 * **The fastest of several runs**, not the mean and not the median. Contention
 * only ever *adds* time: another worker cannot make this one quicker. So the
 * minimum converges on what the code costs with the machine to itself, which
 * is the number the budget was always about, and it does not weaken the
 * assertion — work that genuinely takes 400 ms has no run under 400.
 *
 * Raising the threshold instead was considered and rejected: a budget that
 * goes up whenever it fails is not one.
 */
export async function fastestOf(runs: number, work: () => Promise<unknown>): Promise<number> {
  // One warm-up outside the measurement. A fresh worker pays for JIT on its
  // first call and that is not the tool's work.
  await work()

  let best = Number.POSITIVE_INFINITY
  for (let i = 0; i < runs; i += 1) {
    const started = performance.now()
    await work()
    best = Math.min(best, performance.now() - started)
  }
  return best
}
