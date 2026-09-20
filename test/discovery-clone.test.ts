/**
 * The clone stage's one decision: whether there is room.
 *
 * Cloning is a network loop around an estimate, and the estimate is the part
 * that can do damage — wrong by a factor of ten it fills a laptop, and the
 * 2.8 MB per repository it rests on is a measurement from ticket `06` rather
 * than a guess. The refusal is a function so it can be checked without a disk.
 */
import { describe, expect, it } from 'vitest'
import { BYTES_PER_REPO, refuseForDisk } from '../scripts/discovery/clone.ts'

describe('the disk budget', () => {
  it('lets a run start when the space is there', () => {
    expect(refuseForDisk(100 * 1024 ** 3, 2000)).toBeUndefined()
  })

  it('refuses rather than filling the disk', () => {
    const refusal = refuseForDisk(1024 ** 3, 2000)
    expect(refusal).toMatch(/2000 repos/u)
    expect(refusal).toMatch(/GB/u)
  })

  it('budgets from what 06 measured, not from a guess', () => {
    // 2.8 MB per repo over all 66 corpus repos, `discovery-clone.ts`.
    expect(BYTES_PER_REPO).toBe(2.8 * 1024 * 1024)
  })

  it('keeps headroom, because the estimate is a mean over 66 repos', () => {
    // Exactly the measured mean is not enough space: half the repos are above
    // it, and a run that dies at repo 1900 with a full disk has cost the whole
    // rate-limit budget for nothing.
    expect(refuseForDisk(2000 * BYTES_PER_REPO, 2000)).toBeDefined()
  })
})
