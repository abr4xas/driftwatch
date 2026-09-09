import { describe, expect, it } from 'vitest'
import { buildRepoIndex } from '../src/verify/repo-index.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

/**
 * ARCHITECTURE.md § Rendimiento: descubrimiento mas indice bajo 200 ms en un
 * repo de 5.000 archivos. El presupuesto es parte del producto, asi que se
 * verifica en vez de confiar en que se mantenga solo.
 */
describe('presupuesto del indice', () => {
  it('indexa 5.000 archivos en menos de 200 ms', async () => {
    const files: Record<string, string> = {}
    for (let i = 0; i < 5000; i += 1) {
      files[`src/mod${i % 50}/archivo-${i}.ts`] = `export const n = ${i}\n`
    }
    const root = makeTempRepo({ files })

    const started = performance.now()
    const index = await buildRepoIndex(root)
    const elapsed = performance.now() - started

    expect(index.files.size).toBe(5000)
    expect(index.listing).toBe('git')
    expect(elapsed, `tardo ${elapsed.toFixed(0)} ms`).toBeLessThan(200)
  }, 60_000)
})
