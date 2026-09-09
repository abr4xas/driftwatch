import type { Fixture } from '../helpers/fixture.ts'

/** Todo lo que el documento afirma es cierto. Expected: cero findings. */
export const happyPath: Fixture = {
  name: 'happy-path',
  files: {
    'CLAUDE.md': [
      '# Proyecto',
      '',
      'El punto de entrada es `src/index.ts` y los tests viven en `test/`.',
      '',
      'La config esta en `config/app.json`, y el helper en `./src/util/fecha.ts`.',
      '',
      'Una ruta desde la raiz: `/src/index.ts`.',
      '',
    ].join('\n'),
    'src/index.ts': 'export const x = 1\n',
    'src/util/fecha.ts': 'export const hoy = () => new Date()\n',
    'config/app.json': '{}\n',
    'test/index.test.ts': '',
  },
  expected: [],
}
