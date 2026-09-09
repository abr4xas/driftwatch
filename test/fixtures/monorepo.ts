import type { Fixture } from '../helpers/fixture.ts'

/**
 * Resolución en un monorepo, con `CLAUDE.md` anidados.
 *
 * Este fixture cambió al cerrar el ticket 10. La versión original probaba que
 * la **misma cadena** (`src/db.ts`) se reportara en `packages/web` y no en
 * `packages/api`. Eso dejó de ser el comportamiento: ADR-0005 decidió que una
 * ruta cuya forma existe en algún lugar del repo no se reporta, porque sobre 13
 * repos reales esa era la última clase grande de falso positivo.
 *
 * El caso perdido sigue escrito abajo, sin finding esperado, para que quede
 * registrado qué se dejó de detectar y no parezca un olvido.
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
      'La cache vive en `src/cache/redis.ts`.', // 13: no existe en ninguna forma
      '',
    ].join('\n'),
    'packages/web/CLAUDE.md': [
      '# web',
      '',
      // ADR-0005: `packages/api/src/db.ts` termina con `/src/db.ts`, asi que
      // esta linea NO produce finding. Es el caso que se dejo de detectar: un
      // archivo que se movio de paquete. No se puede distinguir de un
      // documento que habla en relativo del otro paquete.
      'La base de datos es `src/db.ts`.', // 7
      '',
      'La app es `app.ts` y vive al lado.', // 9: palabra suelta, se descarta
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
      file: 'packages/api/CLAUDE.md',
      line: 13,
      column: 19,
      text: 'src/cache/redis.ts',
      message: 'ruta no existe',
      // Sin sugerencia: no hay ningun `redis.ts` en el repo.
    },
  ],
}
