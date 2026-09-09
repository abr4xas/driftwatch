import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { readVersion } from '../src/core/version.ts'

describe('readVersion', () => {
  it('finds the version by walking up to the project package.json', () => {
    expect(readVersion()).toMatch(/^\d+\.\d+\.\d+/u)
  })

  it('throws when there is no package.json, instead of returning a placeholder', () => {
    // A fallback '0.0.0' would be indistinguishable from a real version.
    const orphan = mkdtempSync(`${tmpdir()}/driftwatch-no-manifest-`)
    expect(() => readVersion(orphan)).toThrow(/package.json/u)
  })
})
