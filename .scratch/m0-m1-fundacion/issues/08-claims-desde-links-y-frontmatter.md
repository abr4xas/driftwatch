# 08: Claims de path desde links de Markdown y frontmatter

**What to build:** `path/missing` deja de mirar solo el código inline. Un link relativo roto como `[la spec](./docs/spec/SPEK.md)` y un valor de frontmatter que es una ruta inexistente se reportan igual que una ruta en backticks, con la misma precisión y las mismas reglas de descarte.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] Los nodos `link` de mdast producen claims con `context: 'link'`
- [ ] El frontmatter se parsea con `yaml`, nunca con regex, y los valores que son rutas producen claims con `context: 'frontmatter'`
- [ ] Las siete reglas de descarte aplican igual a estos dos orígenes: una URL en un link no se reporta, un placeholder en frontmatter tampoco
- [ ] Los links a anclas puras (`#seccion`) y a URLs se saltan acá; la verificación de anclas es `link/broken`, que es M2
- [ ] El fixture `false-positive-traps` sigue en cero findings después de este cambio
- [ ] El corpus, si ya existe cuando se trabaja este ticket, se re-snapshotea y el diff se revisa a mano
