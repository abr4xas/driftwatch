import type { Fixture } from '../helpers/fixture.ts'

/**
 * El escenario que define si la herramienta sirve en un monorepo: la **misma
 * cadena** es cierta en un paquete y falsa en el otro, porque cada fuente
 * habla de su propio directorio.
 *
 * Sin resolucion contra el baseDir, un monorepo genera una avalancha de falsos
 * positivos: cada `src/algo.ts` de cada paquete se buscaria contra la raiz.
 */
export const monorepo: Fixture = {
  name: 'monorepo',
  files: {
    'CLAUDE.md': [
      '# Monorepo',
      '',
      'El entrypoint compartido es `src/index.ts`.', // 3: existe en la raiz
      '',
    ].join('\n'),
    'packages/api/CLAUDE.md': [
      '# api',
      '',
      'La base de datos es `src/db.ts`.', // 3: existe en packages/api
      '',
      'El entrypoint compartido es `/src/index.ts`.', // 5: barra inicial = raiz del repo
      '',
      'La app web esta en `../web/app.ts`.', // 7: existe, subiendo un nivel
      '',
      'La config del sistema es `/etc/hosts`.', // 9: ruta del filesystem, se deja pasar
      '',
      'Mis notas locales: `/Users/alguien/notas.md`.', // 11: idem
      '',
    ].join('\n'),
    'packages/web/CLAUDE.md': [
      '# web',
      '',
      'La base de datos es `src/db.ts`.', // 3: NO existe en packages/web
      '',
      'La app es `app.ts` y vive al lado.', // 5: palabra suelta, se descarta
      '',
    ].join('\n'),
    'src/index.ts': '',
    'packages/api/src/db.ts': '',
    'packages/web/app.ts': '',
  },
  expected: [
    {
      check: 'path/missing',
      severity: 'error',
      file: 'packages/web/CLAUDE.md',
      line: 3,
      column: 22,
      text: 'src/db.ts',
      message: 'ruta no existe',
      // El homonimo esta en el otro paquete. Se sugiere, pero la confianza no
      // alcanza para corregir solo: reescribir el doc de `web` apuntando a un
      // archivo de `api` seria un autofix equivocado.
      suggestion: { value: 'packages/api/src/db.ts', confidence: 0.6, fixable: false },
    },
  ],
}
