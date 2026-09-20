import { describe, expect, it } from 'vitest'
import { buildRepoIndex } from '../src/verify/repo-index.ts'
import { fastestOf } from './helpers/budget.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

/**
 * ARCHITECTURE.md § Performance: discovery plus index under 200 ms on a repo of
 * 5,000 files. The budget is part of the product, so it is verified instead of
 * trusted to hold on its own.
 */
describe('index budget', () => {
  it('indexes 5,000 files in under 200 ms', async () => {
    const files: Record<string, string> = {}
    for (let i = 0; i < 5000; i += 1) {
      files[`src/mod${i % 50}/file-${i}.ts`] = `export const n = ${i}\n`
    }
    const root = makeTempRepo({ files })

    // Same instrument as the acceptance budget, and for the same reason: a
    // single wall-clock sample inside a forty-worker run measures contention.
    const elapsed = await fastestOf(3, () => buildRepoIndex(root))
    const index = await buildRepoIndex(root)

    expect(index.files.size).toBe(5000)
    expect(index.listing).toBe('git')
    expect(elapsed, `took ${elapsed.toFixed(0)} ms`).toBeLessThan(200)
  }, 60_000)
})
