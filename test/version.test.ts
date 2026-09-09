import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { readVersion } from '../src/core/version.ts'

describe('readVersion', () => {
  it('encuentra la version subiendo hasta el package.json del proyecto', () => {
    expect(readVersion()).toMatch(/^\d+\.\d+\.\d+/u)
  })

  it('lanza cuando no hay package.json, en vez de devolver un placeholder', () => {
    // Un '0.0.0' de fallback seria indistinguible de una version real.
    const orphan = mkdtempSync(`${tmpdir()}/driftwatch-sin-manifest-`)
    expect(() => readVersion(orphan)).toThrow(/package.json/u)
  })
})
