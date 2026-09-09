# 05: `path/missing` end-to-end (tracer bullet)

**What to build:** el primer finding real. Un `CLAUDE.md` que menciona `` `src/lib/auth.ts` `` en código inline, cuando ese archivo no existe, produce una línea de error con el archivo, la línea y la columna correctas, y el proceso sale con 1. Es el corte vertical completo: descubrir, parsear, extraer, verificar, reportar.

Deliberadamente mínimo en heurísticas: acá solo se extrae de código inline y se aplican las reglas de forma de `docs/spec/SPEC.md` § 3 (`path/missing`) para decidir qué *es* una ruta. Las siete reglas de descarte son el ticket 06.

**Blocked by:** 02, 04

**Status:** done

- [x] El parseo usa mdast (`remark-parse` + `unist-util-visit`), nunca regex sobre el texto crudo, por la razón de `docs/spec/ARCHITECTURE.md` § "Parseo de Markdown": necesitamos el contexto del nodo
- [x] Los tipos `Source`, `Claim`, `Finding` y `Verdict` coinciden con `docs/spec/ARCHITECTURE.md` § "Modelo de datos", incluyendo `offset`, que es lo que va a habilitar `--fix` más adelante
- [x] Cada `Claim` registra su `context` (`inline-code`, `code-fence`, `link`, `frontmatter`, `prose`)
- [x] La prosa cruda no se escanea
- [x] Un finding se renderiza con el formato exacto de `docs/spec/SPEC.md` § 5, con el fragmento truncado a 40 caracteres con `…`
- [x] `line` y `column` son 1-indexados y apuntan al fragmento, verificado en un fixture con posiciones exactas
- [x] Existe el fixture `happy-path` con cero findings y el fixture `broken-paths` con findings esperados en un `expected.json`
- [x] El check se registra con la forma de `Check` de `docs/spec/ARCHITECTURE.md` § Extensibilidad, con registro estático

## Comments

**La primera corrida real sobre este repo, tal cual salió:**

```
AGENTS.md
  ✗ 23  .scratch/<feature>/issues/  ruta no existe
  ✗ 46  scripts/corpus.ts           ruta no existe
  ✗ 70  .scratch/<feature>/         ruta no existe

1 archivo · 3 problemas (3 errores) · 36ms
```

Uno de los tres es un problema verdadero: `scripts/corpus.ts` todavía no existe, lo crea el ticket 10. **Los otros dos son falsos positivos**, por placeholders `<feature>` que la regla de descarte correspondiente todavía no filtra. Es exactamente el ticket 06, y es la evidencia de por qué existe.

Tres decisiones que no estaban en el plan:

- **Los fixtures se declaran como datos, no como archivos commiteados.** `ARCHITECTURE.md` § Testing decía `test/fixtures/<escenario>/` con un mini-repo real y un `expected.json`. Si los fixtures vivieran en el árbol, driftwatch corrido sobre su propio repo los descubriría como fuentes y reportaría las rutas que están rotas a propósito, y el paso de CI "driftwatch sobre driftwatch" saldría con 1 para siempre. Ahora un fixture es un `.ts` que declara el mapa de archivos y los findings esperados, y un helper lo materializa en un temporal. Se actualizó `ARCHITECTURE.md`.
- **El pipeline se carga con import dinámico.** Al entrar `remark-parse`, el arranque en frío de `--version` saltó de 30 ms a entre 50 y 90, contra un techo de 80. `main()` ahora importa `run`, el reporter y los colores de forma dinámica, después de resolver `--help` y `--version`. Volvió a 30 ms. Esto es la reserva nº 2 del ticket 01, que quedó cerrada por necesidad y no por prolijidad.
- **La lista de extensiones conocidas es explícita.** Un `/\.\w+$/` habría aceptado `v1.2` y `node.js` como archivos. La lista blanca cuesta mantenimiento y evita esa clase entera de falso positivo.

**El paso de CI "driftwatch sobre driftwatch" quedó como `continue-on-error`,** porque este repo tiene drift conocido. Pasa a bloquear cuando la corrida quede limpia.

La resolución contra `baseDir` quedó implementada acá porque era la implementación obvia de `resolveInRepo`. El ticket 09 no queda vacío: le tocan los casos borde (barra inicial, escape de la raíz) y el fixture de monorepo que lo demuestra.
