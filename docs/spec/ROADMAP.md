# driftwatch — Roadmap

Cada milestone tiene criterios de aceptación verificables. No se avanza al siguiente sin cerrarlos.

---

## M0 — Esqueleto ejecutable
**Objetivo:** `npx driftwatch` corre y no hace nada útil, pero corre.

- Repo TS/ESM, build con tsdown, `bin` apuntando al CLI compilado
- `--help`, `--version`, exit codes 0/1/2
- Descubrimiento de fuentes (`CLAUDE.md`, `AGENTS.md`, `SKILL.md`) respetando `.gitignore`
- Reporter `pretty` con el resumen final
- CI: lint + typecheck + test en Node 24 y 25 (ver ADR-0002)

**Aceptación:** en este mismo repo, `driftwatch` lista las fuentes encontradas y sale con 0 en menos de 300 ms.

---

## M1 — El check que justifica el proyecto
**Objetivo:** `path/missing` funcionando con precisión real.

- Parseo mdast con posiciones
- Extractor de rutas con las 7 reglas de descarte de `ARCHITECTURE.md`
- `RepoIndex` construido con `git ls-files`, fallback a glob
- Sugerencias por basename con scoring de confianza
- Fixture `false-positive-traps` en verde con **cero findings**

**Aceptación:** ver [ADR-0006](../adr/0006-el-criterio-de-precision-de-m1.md), que reemplaza el criterio original de "< 5% de falsos positivos". Ese criterio se midió y resultó no ser medible: una herramienta precisa produce pocos findings, y con 9 findings un solo falso positivo ya es 11%.

El criterio vigente tiene cuatro partes, y las cuatro se cumplen o M1 no cierra:

- **Piso duro:** fixture `false-positive-traps` en cero, y **cero falsos positivos entre los findings `fixable`**. Un autofix equivocado no es ruido, es corrupción del documento.
- **Forma de una corrida:** mediana de falsos positivos por repo 0, percentil 90 ≤ 1, ninguno > 2.
- **Utilidad:** precisión agregada ≥ 80% fuera de muestra, y ≥ 1 verdadero positivo en el grupo de validación, para que el silencio no alcance para pasar.
- **Metodología:** corpus de ≥20 repos con ≥8 en un grupo de validación que no se inspeccionó. Clasificar sus findings es la medición; abrir el repo a ver qué descartó lo contamina.

Si no se cumple, no se avanza — se ajustan las heurísticas, o se acepta que el check no llega y se dice.

Este es el milestone que decide si el proyecto vale la pena. Todo lo demás es incremental.

---

## M2 — Los otros checks de tier 1
- `script/missing` con resolución de `package.json` más cercano (monorepo)
- `skill/frontmatter` completo
- `link/broken` incluyendo anclas
- `frontmatter/invalid`
- Directivas de ignore en línea
- Config file + `--only` / `--skip` / `--no-tier2`

**Aceptación:** el fixture `monorepo` pasa. Los cuatro checks tienen fixture propio con casos positivos y negativos.

---

## M3 — Autofix
- `fix/apply.ts` con edición por rangos de offset, preservando formato
- `--fix`, `--fix --dry-run` con diff
- Solo aplica sobre confianza > 0.8 y candidato único

**Aceptación:** aplicar `--fix` sobre un fixture roto lo deja idéntico a su versión correcta, byte a byte. Correr `--fix` dos veces es idempotente.

---

## M4 — Presentable
Lo que convierte una herramienta que funciona en un proyecto que alguien adopta.

- README con GIF de ≤15 s arriba de todo, antes de cualquier texto
- Formatos `--json`, `--github`, `--sarif`
- GitHub Action publicada (`driftwatch/action@v1`)
- Sitio estático de una página en Vercel con demo y el GIF
- Publicado en npm con provenance (`npm publish --provenance`)
- Licencia MIT

**Aceptación:** una persona que nunca vio el proyecto entiende qué hace en menos de 15 segundos mirando solo el README.

---

## M5 — Tier 2
- `dep/missing` con diccionario curado
- `symbol/missing`
- `stale/churn` con git
- `command/unknown`

**Aceptación:** cada uno se puede apagar por config, y ninguno sube la tasa de falsos positivos del corpus por encima del 10% agregado.

---

## M6 — Loop diario
- `--watch`
- Extensión de VS Code que subraya el drift en vivo en `CLAUDE.md`
- Hook de pre-commit opcional (`driftwatch --only path,script --strict`)

---

## Fuera de alcance (decidido, no pendiente)

- Modo LLM para verificar afirmaciones de prosa. Rompe el determinismo y el presupuesto de latencia. Si se explora alguna vez, es un comando aparte (`driftwatch review`), nunca el default.
- Sistema de plugins de terceros.
- Servicio hosted, dashboard, o cualquier cosa con cuenta.
- Soporte para formatos de contexto de agente que no existan todavía.

---

## Orden de publicación sugerido

No esperar a M6 para mostrar el proyecto. La cadencia visible es parte de lo que hace que alguien confíe en la herramienta.

1. Publicar en npm al cerrar **M2** — ya es útil.
2. Post de lanzamiento con el GIF al cerrar **M4**.
3. Sostener commits durante meses, no un sprint de una semana.
