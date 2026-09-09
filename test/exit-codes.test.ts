import { describe, expect, it } from 'vitest'
import { EXIT, exitCodeFor } from '../src/core/exit-codes.ts'

describe('exitCodeFor', () => {
  it('sin problemas sale con 0', () => {
    expect(exitCodeFor({ errors: 0, warnings: 0 }, false)).toBe(EXIT.ok)
  })

  it('un error sale con 1', () => {
    expect(exitCodeFor({ errors: 1, warnings: 0 }, false)).toBe(EXIT.findings)
  })

  it('los warnings no rompen el build por defecto', () => {
    expect(exitCodeFor({ errors: 0, warnings: 9 }, false)).toBe(EXIT.ok)
  })

  it('con --strict los warnings cuentan como errores', () => {
    expect(exitCodeFor({ errors: 0, warnings: 1 }, true)).toBe(EXIT.findings)
  })

  it('los tres codigos son 0, 1 y 2', () => {
    expect([EXIT.ok, EXIT.findings, EXIT.toolFailure]).toEqual([0, 1, 2])
  })
})
