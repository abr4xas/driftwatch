# 05: `path/missing` end-to-end (tracer bullet)

**What to build:** el primer finding real. Un `CLAUDE.md` que menciona `` `src/lib/auth.ts` `` en código inline, cuando ese archivo no existe, produce una línea de error con el archivo, la línea y la columna correctas, y el proceso sale con 1. Es el corte vertical completo: descubrir, parsear, extraer, verificar, reportar.

Deliberadamente mínimo en heurísticas: acá solo se extrae de código inline y se aplican las reglas de forma de `docs/spec/SPEC.md` § 3 (`path/missing`) para decidir qué *es* una ruta. Las siete reglas de descarte son el ticket 06.

**Blocked by:** 02, 04

**Status:** ready-for-agent

- [ ] El parseo usa mdast (`remark-parse` + `unist-util-visit`), nunca regex sobre el texto crudo, por la razón de `docs/spec/ARCHITECTURE.md` § "Parseo de Markdown": necesitamos el contexto del nodo
- [ ] Los tipos `Source`, `Claim`, `Finding` y `Verdict` coinciden con `docs/spec/ARCHITECTURE.md` § "Modelo de datos", incluyendo `offset`, que es lo que va a habilitar `--fix` más adelante
- [ ] Cada `Claim` registra su `context` (`inline-code`, `code-fence`, `link`, `frontmatter`, `prose`)
- [ ] La prosa cruda no se escanea
- [ ] Un finding se renderiza con el formato exacto de `docs/spec/SPEC.md` § 5, con el fragmento truncado a 40 caracteres con `…`
- [ ] `line` y `column` son 1-indexados y apuntan al fragmento, verificado en un fixture con posiciones exactas
- [ ] Existe el fixture `happy-path` con cero findings y el fixture `broken-paths` con findings esperados en un `expected.json`
- [ ] El check se registra con la forma de `Check` de `docs/spec/ARCHITECTURE.md` § Extensibilidad, con registro estático
