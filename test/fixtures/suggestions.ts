import type { Fixture } from '../helpers/fixture.ts'

/**
 * Los tres niveles de confianza de ARCHITECTURE.md, cada uno con su caso.
 * El documento afirma tres rutas que se movieron; el repo tiene los destinos.
 */
export const suggestions: Fixture = {
  name: 'suggestions',
  files: {
    'CLAUDE.md': [
      '# Proyecto',
      '',
      'La auth vive en `src/lib/auth.ts`.', // 3: movida dentro de src
      '',
      'El seed esta en `src/seed.ts`.', // 5: movida a otro arbol
      '',
      'El helper es `src/util/fecha.ts`.', // 7: hay dos homonimos
      '',
    ].join('\n'),
    'src/auth/auth.ts': '',
    'scripts/db/seed.ts': '',
    'paquetes/a/fecha.ts': '',
    'paquetes/b/fecha.ts': '',
  },
  expected: [
    {
      check: 'path/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 3,
      column: 18,
      text: 'src/lib/auth.ts',
      message: 'ruta no existe',
      // Candidato unico y comparte el segmento `src`: inequivoco.
      suggestion: { value: 'src/auth/auth.ts', confidence: 1, fixable: true },
    },
    {
      check: 'path/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 5,
      column: 18,
      text: 'src/seed.ts',
      message: 'ruta no existe',
      // Candidato unico pero en otro arbol: se sugiere, no se corrige.
      suggestion: { value: 'scripts/db/seed.ts', confidence: 0.6, fixable: false },
    },
    {
      check: 'path/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 7,
      column: 15,
      text: 'src/util/fecha.ts',
      message: 'ruta no existe',
      // Dos homonimos: nunca autofixable, por mas parecido que sea uno.
      suggestion: { value: 'paquetes/a/fecha.ts', confidence: 0.3, fixable: false },
    },
  ],
}
