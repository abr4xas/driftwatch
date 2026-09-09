import type { Fixture } from '../helpers/fixture.ts'

/**
 * Las otras dos fuentes de claims de path: links relativos de Markdown y
 * valores de frontmatter. Las reglas de descarte aplican igual que en codigo
 * inline, asi que las trampas de este documento tampoco producen findings.
 */
export const linksYFrontmatter: Fixture = {
  name: 'links-y-frontmatter',
  files: {
    '.claude/skills/deploy/SKILL.md': [
      '---',
      'name: deploy', // 2: no es una ruta
      'description: manda la rama actual a produccion',
      'script: ./scripts/release.sh', // 4: no existe
      'referencia: guias/deploy.md', // 5: existe, relativo al baseDir
      'plantilla: plantillas/<entorno>.yml', // 6: placeholder, se descarta
      'sitio: https://ejemplo.com/deploy.html', // 7: URL, se descarta
      '---',
      '', // 9
      '# Deploy', // 10
      '', // 11
      'Ver [la guia](./guias/deploy.md) y [el runbook](./guias/runbook.md).', // 12
      '', // 13
      'Un ancla sola no afirma una ruta: [al final](#cierre).', // 14
      '', // 15
      'Con ancla y archivo: [la seccion](./guias/deploy.md#pasos).', // 16
      '', // 17
      'Externo: [la doc](https://ejemplo.com/a.md).', // 18
      '', // 19
      '## Cierre', // 20
      '',
    ].join('\n'),
    '.claude/skills/deploy/guias/deploy.md': '# guia\n',
  },
  expected: [
    {
      check: 'path/missing',
      severity: 'error',
      file: '.claude/skills/deploy/SKILL.md',
      line: 4,
      column: 9,
      text: 'scripts/release.sh',
      message: 'ruta no existe',
    },
    {
      check: 'path/missing',
      severity: 'error',
      file: '.claude/skills/deploy/SKILL.md',
      line: 12,
      column: 49,
      text: 'guias/runbook.md',
      message: 'ruta no existe',
      // Sin sugerencia: no hay ningun `runbook.md` en el repo. `deploy.md` no
      // es candidato porque la busqueda arranca por basename, no por parecido.
    },
  ],
}
