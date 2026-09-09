import type { Fixture } from '../helpers/fixture.ts'

/**
 * El fixture mas importante del proyecto. Cada bloque de este documento es una
 * trampa que un extractor ingenuo reportaria, y **ninguna** debe producir un
 * finding. Un solo finding aca es una regresion de precision.
 *
 * Cada seccion corresponde a una regla de descarte de ARCHITECTURE.md
 * § "Extraccion de rutas". El repo materializado a proposito no contiene
 * ninguno de los archivos mencionados: si alguna trampa se reportara, seria
 * porque la regla fallo, no porque el archivo casualmente exista.
 */
export const falsePositiveTraps: Fixture = {
  name: 'false-positive-traps',
  files: {
    'CLAUDE.md': [
      '# Trampas de falsos positivos',
      '',
      '## Regla 1: URLs',
      '',
      'La guia esta en `https://ejemplo.com/docs/guia.md` y el mirror en',
      '`http://cdn.ejemplo.com/lib/app.js`. El protocolo file tambien:',
      '`file:///tmp/salida/reporte.json`. Y sin protocolo: `//cdn.ejemplo.com/x.js`.',
      '',
      '## Regla 2: globs y placeholders',
      '',
      'Los tests son `src/**/*.test.ts` y los fixtures `test/fixtures/*.json`.',
      'Un ticket vive en `.scratch/<feature>/issues/`, la plantilla en',
      '`{{ruta}}/plantilla.md`, la config del usuario en `$HOME/.config/app.json`,',
      'y cada paquete en `packages/[nombre]/src`. Un signo de pregunta tambien',
      'cuenta: `docs/pagina?.md`.',
      '',
      '## Regla 3: palabras sueltas',
      '',
      'Cada modulo tiene su `index.ts`, la config es `tsconfig.json`, el gestor',
      'es `pnpm` y el comando `build`. Nada de eso afirma una ubicacion.',
      '',
      '## Regla 4: parece archivo y no lo es',
      '',
      'Corremos sobre `node.js` con `next.js` en el front y `vue.js` en el admin.',
      'La version minima es `1.0` y la actual `v2.1.3`. Los tipos van en un `d.ts`.',
      '',
      '## Rutas dentro de bloques de ejemplo',
      '',
      'Asi se veria la salida, con rutas que no existen:',
      '',
      '```bash',
      'cat src/inventado/no-existe.ts',
      'mv docs/viejo/guia.md docs/nuevo/guia.md',
      '```',
      '',
      '```',
      'src/tampoco/existe.ts',
      '```',
      '',
      '## Rutas en prosa, sin marcar como codigo',
      '',
      'El archivo src/prosa/suelta.ts se menciona sin backticks, y "otra/cosa.ts"',
      'entre comillas. La prosa no se escanea.',
      '',
      '## Rutas que se escapan de la raiz',
      '',
      'El brief original esta en `../otro-repo/BRIEF.md` y mas arriba en',
      '`../../compartido/notas.md`.',
      '',
      '## Lo que si existe',
      '',
      'El entrypoint es `src/index.ts` y la doc `docs/guia.md`, y los dos existen,',
      'asi que tampoco producen findings.',
      '',
    ].join('\n'),
    'src/index.ts': 'export const x = 1\n',
    'docs/guia.md': '# guia\n',
  },
  expected: [],
}
