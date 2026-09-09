import { describe, expect, it } from 'vitest'
import { main, type Io } from '../src/cli/main.ts'
import { EXIT } from '../src/core/exit-codes.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

function capture(): { io: Io; printed: () => string } {
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
 * ROADMAP.md § M0 pedia: "en este mismo repo, driftwatch lista las fuentes
 * encontradas y sale con 0 en menos de 300 ms".
 *
 * El "lista las fuentes" era andamiaje de M0, cuando no habia ningun check y no
 * habia otra cosa observable que mostrar. Desde que `path/missing` existe, la
 * salida son findings, y el exit code refleja el estado real del repo. Lo que
 * sigue vigente del criterio, y es lo que se verifica aca, es el presupuesto de
 * tiempo y que un repo sin drift salga con 0.
 */
describe('aceptacion de M0, revisada en M1', () => {
  it('auditar este repo tarda menos de 300 ms', async () => {
    // La primera invocacion en un worker fresco paga el calentamiento del JIT,
    // que no es trabajo de la herramienta. El arranque en frio del proceso se
    // mide aparte, invocando el binario compilado.
    await main([], capture().io, process.cwd())

    const c = capture()
    const started = performance.now()
    await main([], c.io, process.cwd())
    const elapsed = performance.now() - started

    expect(elapsed, `tardo ${elapsed.toFixed(0)} ms`).toBeLessThan(300)
  })

  it('un posicional limita el alcance a lo que se le pide', async () => {
    const c = capture()
    await main(['AGENTS.md'], c.io, process.cwd())
    expect(c.printed()).toContain('1 archivo')
  })

  it('un repo cuyo contexto es cierto sale con 0 y lo dice', async () => {
    const root = makeTempRepo({
      files: {
        'CLAUDE.md': 'El entrypoint es `src/index.ts`.\n',
        'src/index.ts': 'export const x = 1\n',
      },
    })
    const c = capture()
    expect(await main([], c.io, root)).toBe(EXIT.ok)
    expect(c.printed()).toContain('✓ 1 archivo · sin drift')
  })

  it('un repo con una ruta rota sale con 1 y la senala', async () => {
    const root = makeTempRepo({
      files: { 'CLAUDE.md': 'La auth vive en `src/lib/auth.ts`.\n' },
    })
    const c = capture()
    expect(await main([], c.io, root)).toBe(EXIT.findings)
    expect(c.printed()).toContain('src/lib/auth.ts')
    expect(c.printed()).toContain('ruta no existe')
  })
})
