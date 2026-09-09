import { describe, expect, it } from 'vitest'
import { EXIT } from '../src/core/exit-codes.ts'
import { main } from '../src/cli/main.ts'

function capture() {
  const chunks: string[] = []
  return {
    io: {
      out: (s: string) => chunks.push(s),
      err: (s: string) => chunks.push(s),
      isTty: false,
      env: {} as NodeJS.ProcessEnv,
    },
    printed: () => chunks.join(''),
  }
}

/**
 * ROADMAP.md § M0: "en este mismo repo, driftwatch lista las fuentes
 * encontradas y sale con 0 en menos de 300 ms".
 */
describe('aceptacion de M0', () => {
  it('sobre este repo lista sus fuentes, sale con 0, y tarda menos de 300 ms', async () => {
    const c = capture()

    const started = performance.now()
    const code = await main([], c.io, process.cwd())
    const elapsed = performance.now() - started

    const printed = c.printed()
    expect(code).toBe(EXIT.ok)
    expect(printed).toContain('AGENTS.md')
    expect(printed).toContain('agents-md')
    expect(printed).toContain('sin drift')
    expect(elapsed, `tardo ${elapsed.toFixed(0)} ms`).toBeLessThan(300)
  })

  it('un posicional limita el alcance a lo que se le pide', async () => {
    const c = capture()
    await main(['AGENTS.md'], c.io, process.cwd())
    expect(c.printed()).toContain('1 archivo')
  })
})
