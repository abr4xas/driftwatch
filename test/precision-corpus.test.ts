import { describe, expect, it } from 'vitest'
import { evaluatePathText } from '../src/extract/paths.ts'
import { passesThroughGenerated } from '../src/verify/generated.ts'
import { run } from '../src/run.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

/**
 * Las cuatro clases de falso positivo que el corpus de repos reales destapo, y
 * que las heuristicas no filtraban. Cada bloque de aca corresponde a una clase
 * medida sobre archivos de contexto que escribieron otras personas.
 */

describe('clase 1: rutas relativas a la raiz desde una fuente anidada', () => {
  it('una fuente anidada puede hablar de su propio directorio desde la raiz', async () => {
    const root = makeTempRepo({
      files: {
        // Un caso real de BerriAI/litellm: tests/e2e/CLAUDE.md dice `tests/e2e/`.
        'tests/e2e/CLAUDE.md': 'Los tests viven en `tests/e2e/` y usan `tests/e2e/util.py`.\n',
        'tests/e2e/util.py': '',
      },
    })
    const result = await run({ cwd: root, paths: [] })
    expect(result.findings).toEqual([])
  })

  it('sigue resolviendo contra el baseDir cuando eso es lo correcto', async () => {
    const root = makeTempRepo({
      files: {
        'packages/api/CLAUDE.md': 'La base es `src/db.ts`.\n',
        'packages/api/src/db.ts': '',
      },
    })
    expect((await run({ cwd: root, paths: [] })).findings).toEqual([])
  })

  it('reporta solo si la ruta no existe ni contra el baseDir ni contra la raiz', async () => {
    const root = makeTempRepo({
      files: { 'packages/api/CLAUDE.md': 'La base es `src/db.ts`.\n' },
    })
    const result = await run({ cwd: root, paths: [] })
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]?.claim.text).toBe('src/db.ts')
  })
})

describe('clase 2: artefactos generados', () => {
  it.each([
    'dist/cli.js',
    'node_modules/astro/dist/index.js',
    '.next/server',
    'target/debug/bin',
    'packages/next/dist/docs',
    '.turbo/cache',
    '.react-router/types',
  ])('%s pasa por un directorio generado', (rel) => {
    expect(passesThroughGenerated(rel)).toBe(true)
  })

  it('una ruta normal no', () => {
    expect(passesThroughGenerated('src/index.ts')).toBe(false)
    expect(passesThroughGenerated('packages/api/src/db.ts')).toBe(false)
  })

  it('no se reporta un artefacto generado aunque no este en el indice', async () => {
    const root = makeTempRepo({
      files: { 'CLAUDE.md': 'El bundle queda en `dist/cli.js`, no edites `node_modules/`.\n' },
    })
    expect((await run({ cwd: root, paths: [] })).findings).toEqual([])
  })
})

describe('clase 3: comandos tomados como ruta', () => {
  it.each([
    'node scripts/sync-agent-rules.mjs',
    'pnpm test packages/react-router/__tests__/router/fetchers-test.ts',
    'prisma/ignite docs/drive/',
  ])('descarta %s por tener espacios', (text) => {
    expect(evaluatePathText(text)).toEqual({ kind: 'discarded', reason: 'tiene-espacios' })
  })

  it('un destino de link con espacios no se descarta, porque no puede ser un comando', () => {
    expect(evaluatePathText('docs/architecture docs/x.md', { couldBeCommand: false })).toEqual({
      kind: 'path',
      text: 'docs/architecture docs/x.md',
    })
  })
})

describe('clase 4: links percent-encoded', () => {
  it('un %20 en el destino de un link se decodifica antes de verificar', async () => {
    const root = makeTempRepo({
      files: {
        'CLAUDE.md': 'Ver [la guia](./docs/Architecture%20Overview.md).\n',
        'docs/Architecture Overview.md': '# guia\n',
      },
    })
    expect((await run({ cwd: root, paths: [] })).findings).toEqual([])
  })

  it('un escape mal formado no rompe la corrida', async () => {
    const root = makeTempRepo({
      files: { 'CLAUDE.md': 'Ver [roto](./docs/100%.md).\n' },
    })
    await expect(run({ cwd: root, paths: [] })).resolves.toBeDefined()
  })
})
