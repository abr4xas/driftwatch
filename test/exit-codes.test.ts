import { describe, expect, it } from 'vitest'
import { EXIT, exitCodeFor } from '../src/core/exit-codes.ts'

describe('exitCodeFor', () => {
  it('exits 0 with no problems', () => {
    expect(exitCodeFor({ errors: 0, warnings: 0 }, false)).toBe(EXIT.ok)
  })

  it('exits 1 on an error', () => {
    expect(exitCodeFor({ errors: 1, warnings: 0 }, false)).toBe(EXIT.findings)
  })

  it('warnings do not break the build by default', () => {
    expect(exitCodeFor({ errors: 0, warnings: 9 }, false)).toBe(EXIT.ok)
  })

  it('with --strict, warnings count as errors', () => {
    expect(exitCodeFor({ errors: 0, warnings: 1 }, true)).toBe(EXIT.findings)
  })

  it('the three codes are 0, 1 and 2', () => {
    expect([EXIT.ok, EXIT.findings, EXIT.toolFailure]).toEqual([0, 1, 2])
  })
})
