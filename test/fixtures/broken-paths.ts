import type { Fixture } from '../helpers/fixture.ts'

/** Rutas que el documento afirma y el repo no tiene. */
export const brokenPaths: Fixture = {
  name: 'broken-paths',
  files: {
    'CLAUDE.md': [
      '# Proyecto', // linea 1
      '', // 2
      'La autenticacion vive en `src/lib/auth.ts`.', // 3
      '', // 4
      'El indice real es `src/index.ts`, que si existe.', // 5
      '', // 6
      'El script de release es `./scripts/release.sh`.', // 7
      '', // 8
      'Los assets estan en `public/imagenes/`.', // 9
      '',
    ].join('\n'),
    'src/index.ts': 'export const x = 1\n',
  },
  expected: [
    {
      check: 'path/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 3,
      column: 27,
      text: 'src/lib/auth.ts',
      message: 'ruta no existe',
    },
    {
      check: 'path/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 7,
      column: 26,
      text: './scripts/release.sh',
      message: 'ruta no existe',
    },
    {
      check: 'path/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 9,
      column: 22,
      text: 'public/imagenes/',
      message: 'ruta no existe',
    },
  ],
}
