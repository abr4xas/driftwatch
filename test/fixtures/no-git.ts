import type { Fixture } from '../helpers/fixture.ts'

/**
 * Un repo sin `.git`: el indice cae al fallback de glob y tiene que aplicar
 * `.gitignore` a mano. La deteccion no cambia, y eso es lo que se verifica.
 */
export const noGit: Fixture = {
  name: 'no-git',
  git: false,
  files: {
    '.gitignore': 'generado/\n',
    'CLAUDE.md': [
      '# Sin git',
      '',
      'El entrypoint es `src/index.ts`.', // 3: existe
      '',
      'El build queda en `generado/salida.js`.', // 5: ignorado, no se indexa
      '',
      'La auth vive en `src/lib/auth.ts`.', // 7: no existe
      '',
    ].join('\n'),
    'src/index.ts': '',
    'generado/salida.js': '',
  },
  expected: [
    {
      check: 'path/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 5,
      column: 20,
      text: 'generado/salida.js',
      message: 'ruta no existe',
      // Falso positivo conocido: el archivo existe en disco pero esta
      // gitignoreado, asi que no entra al indice. SPEC.md § 7 lo resuelve con
      // `knownPaths`, que es M2. Se fija aca como comportamiento actual, no
      // como comportamiento deseado.
    },
    {
      check: 'path/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 7,
      column: 18,
      text: 'src/lib/auth.ts',
      message: 'ruta no existe',
    },
  ],
}
