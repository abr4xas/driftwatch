/**
 * The worker pool every pass over a corpus shares.
 *
 * It lived inside the acquisition filter until the passes outgrew it: five
 * scripts reached it by dynamically importing an unrelated module, which made
 * a generic limiter look like a detail of one Jev question. It is neither
 * about Jev nor about discovery, so it sits here.
 */

/** Runs `work` over `items`, `width` at a time, keeping the order of results. */
export async function inFlight<T, R>(
  items: readonly T[],
  width: number,
  work: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = Array.from({ length: items.length })
  let next = 0
  const runners = Array.from({ length: Math.min(width, items.length) }, async () => {
    for (;;) {
      const i = next
      next += 1
      const item = items[i]
      if (item === undefined) return
      out[i] = await work(item)
    }
  })
  await Promise.all(runners)
  return out
}
