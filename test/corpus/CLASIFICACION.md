# Clasificación del corpus

Revisión a mano de cada finding contra el repo real. Fecha: 2026-09-09.

Corpus: **34 repos públicos fijados a un commit, 12 findings.**
De los 34, **8 forman el grupo de validación**: nunca se inspeccionaron antes de medir.

## Estado del criterio ([ADR-0006](../../docs/adr/0006-el-criterio-de-precision-de-m1.md))

Medición del grupo de validación: **8 repos, 18 fuentes, 3 findings, los 3 verdaderos.**

| # | Condición | Medido | Estado |
|---|---|---|---|
| 1 | Fixture `false-positive-traps` en cero | 0 findings | **cumple** |
| 2 | Cero falsos positivos entre findings `fixable` | `corregibles: 0` en los 34 snapshots | **cumple** |
| 3 | Mediana de FP por repo = 0 | 0 (33 de 34 repos sin ningún FP) | **cumple** |
| 4 | Percentil 90 de FP por repo ≤ 1 | 0 | **cumple** |
| 5 | Ningún repo con más de 2 FP | máximo 1 (`spec-kit`) | **cumple** |
| 6 | Precisión agregada ≥ 80% en validación | 3 de 3 = **100%** | **cumple** |
| 7 | ≥ 1 verdadero positivo en validación | 3 | **cumple** |
| 8 | ≥ 20 repos, con ≥ 8 en validación | 34 repos, 8 en validación | **cumple** |
| 9 | Regla de contaminación codificada | campo `holdout` en `scripts/corpus.ts` | **cumple** |

**Nueve de nueve. M1 pasa la puerta.**

### La salvedad, que hay que leer junto con el 100%

El 100% de la condición 6 se apoya en **3 findings**, y los tres vienen del mismo repo y de la **misma causa raíz**: un renombre de paquete en `modelcontextprotocol/typescript-sdk` (`server` → `server-legacy`) que su `CLAUDE.md` no siguió. Contado como eventos de drift, es **uno**, encontrado tres veces.

Los otros **7 de 8 repos de validación no produjeron ningún finding**.

Y hay una ironía que conviene registrar: [ADR-0006](../../docs/adr/0006-el-criterio-de-precision-de-m1.md) argumenta que un umbral de 5% no es medible porque exige ~20 findings, y elige 80% porque "con 10 findings admite 2 falsos, y esa es una diferencia que se puede medir a mano". Con **3** findings, un umbral de 80% no admite ninguno falso — es "cero falsos positivos" otra vez, disfrazado de porcentaje. El criterio se cumple por su letra, pero a este tamaño de muestra sufre exactamente el defecto que le criticó al anterior.

**Qué hacer con eso:** no aflojar nada ni inventar un umbral nuevo. Lo que hace falta es más masa de findings, y la vía natural es M2: cada check nuevo (`script/missing`, `link/broken`, `skill/frontmatter`, `frontmatter/invalid`) produce findings propios sobre el mismo corpus. Cuando el grupo de validación llegue a ~10 findings, la condición 6 vuelve a ser una medición y no una formalidad. Hasta entonces, el número honesto para citar no es "100% de precisión" sino "3 de 3, con 7 de 8 repos en silencio".

## El corpus completo

El corpus produce **12 findings, 11 verdaderos y 1 falso**. El único falso es el de `github/spec-kit`, en calibración.

| Repo | Findings | Verdaderos | Falsos | Grupo |
|---|---|---|---|---|
| `openai/codex` | 3 | 3 | 0 | calibración |
| `tursodatabase/turso` | 3 | 3 | 0 | calibración |
| `modelcontextprotocol/typescript-sdk` | 3 | 3 | 0 | **validación** |
| `cloudflare/workers-sdk` | 1 | 1 | 0 | calibración |
| `calcom/cal.com` | 1 | 1 | 0 | calibración |
| `github/spec-kit` | 1 | 0 | 1 | calibración |
| los otros 28 | 0 | — | — | — |

---

## Grupo de validación, uno por uno

Los tres findings del grupo de validación. Sus repos nunca se inspeccionaron antes de correr la herramienta sobre ellos, y de ninguno se derivó una regla.

Los ocho repos del grupo: `vitest-dev/vitest`, `rust-lang/rust-analyzer`, `nuxt/nuxt`, `openai/openai-node`, `modelcontextprotocol/typescript-sdk`, `modelcontextprotocol/python-sdk`, `openai/openai-python`, `railwayapp/cli`. Sólo el quinto produjo findings.

### Verdaderos positivos (3), todos en `modelcontextprotocol/typescript-sdk`

**1. `CLAUDE.md:87` — `packages/server/src/server/sse.ts`**

El documento dice: "**SSE** (`packages/server/src/server/sse.ts`, `packages/client/src/client/sse.ts`) - Legacy HTTP+SSE transport". El del cliente existe; el del servidor **no**. El archivo real vive en `packages/server-legacy/src/sse/sse.ts`: el paquete se renombró a `server-legacy` y la ruta interna se reestructuró. Drift real.

**2. `CLAUDE.md:93` — `packages/server/src/server/auth/`**

"Full OAuth 2.0 server implementation in `packages/server/src/server/auth/`". Ese directorio no existe. Las implementaciones reales están en `packages/server-legacy/src/auth` y `packages/core-internal/src/auth`. Drift real, del mismo renombre.

**3. `CLAUDE.md:98` — `packages/client/src/client/auth-extensions.ts`**

"OAuth client support in `packages/client/src/client/auth.ts` and `packages/client/src/client/auth-extensions.ts`". El primero existe y no se reporta; el segundo no, porque el archivo real es **`authExtensions.ts`**, en camelCase y sin guion. Drift real de nombre, del tipo que un agente no puede adivinar.

### Falsos positivos (0)

Ninguno. En la medición anterior había uno, y es la razón por la que este grupo cambió de composición:

**`browser-use/browser-use` `CLAUDE.md:87` — `tests/ci/test_action_EventNameHere.py`**

El texto dice: "Make sure any tests specific to an event live in its `tests/ci/test_action_EventNameHere.py` file". `EventNameHere` es un **placeholder**: hay que reemplazarlo por el nombre del evento.

Es una clase nueva y general: placeholder en **CamelCase con relleno** (`EventNameHere`, `YourClassName`, `SomethingHere`). Las reglas existentes cubrían `<...>`, `{{...}}`, `$VAR`, `[...]`, `foo`, `NNNN` y `your_*`, pero no esta forma.

**Se arregló** (`PLACEHOLDER_CAMEL` en `src/extract/discard.ts`), con tres formas elegidas angostas: `...Here` con `H` mayúscula precedida de minúscula, para no tocar `sphere` ni `elsewhere`; `Your...`/`My...` seguidos de otra mayúscula; y `XXX`/`Xxx`. Hay tests de las dos mitades: las seis formas que descarta y las seis palabras reales que no.

Eso contaminó `browser-use`, que pasó a calibración, y para volver a tener ocho repos de validación se sumó `railwayapp/cli` — chico, de otro ecosistema, nunca mirado.

**La medición del 75% no se borra ni se reemplaza:** fue válida cuando se tomó, y la de ahora es una medición distinta sobre un grupo distinto. Las dos quedan en el historial de abajo.

---

## Calibración, uno por uno

Estos nueve están en repos cuyos findings ya se miraron para ajustar heurísticas. **No miden precisión**; están para el registro.

### Verdaderos positivos (8)

**`openai/codex` `AGENTS.md:35`** — `codex-rs/codex-mcp/src/mcp_connection_manager.rs`, con un "prefer using" dirigido al agente. No existe ningún `mcp_connection_manager.rs` en el repo.

**`openai/codex` `AGENTS.md:265` y `275`** — `app-server-protocol/src/protocol/v2.rs`. El directorio tiene `common.rs`, `mod.rs`, `mappers.rs`; no hay `v2.rs`.

**`cloudflare/workers-sdk` `AGENTS.md:140`** — `.github/PULL_REQUEST_TEMPLATE.md`. El real es `.github/pull_request_template.md`, en minúsculas. Verdadero pero menor: en un filesystem sensible a mayúsculas la ruta no existe, y es lo que un agente ve en CI.

**`calcom/cal.com` `AGENTS.md:130`** — `packages/features/ee/workflows/lib/constants.ts`. El directorio existe, el archivo no. `CLAUDE.md`, que es copia idéntica, se reporta como alias en vez de contar doble.

**`tursodatabase/turso` `.claude/skills/cdc/SKILL.md:158`, `242`, `246`** — `core/translate/emitter.rs` tres veces, como encabezados de sección. `core/translate/` existe; no hay ningún `emitter.rs` en todo el repo. Se encontró cuando turso estaba en validación.

### Falso positivo (1)

**`github/spec-kit` `AGENTS.md:464`** — `.goose/recipes/`, en una sección titulada "Goose Integration" que describe la convención de **otra herramienta**, para el proyecto que spec-kit genera. Detectarlo requeriría entender que la sección entera habla de un tercero. Es la clase sin arreglo determinista.

---

## Historial: por qué el criterio se cambió

El criterio original era "< 5% de falsos positivos". Se midió y resultó no ser medible; [ADR-0006](../../docs/adr/0006-el-criterio-de-precision-de-m1.md) tiene el argumento completo. El registro de esa medición:

| Ronda | Repos nuevos en validación | Findings | Verdaderos | Falsos |
|---|---|---|---|---|
| 1 | playwright-mcp, anthropic-sdk-typescript, spec-kit, nitro, zod | 2 | 0 | 2 |
| 2 | crush, turso, svelte | 4 | 3 | 1 |
| 3 | vitest, rust-analyzer, nuxt | 2 | 0 | 2 |
| 4 | reader, llm, git-mcp-server, h3 | 0 | 0 | 0 |
| 5 | typescript-sdk, python-sdk, openai-python, browser-use | 4 | 3 | 1 |
| 6 | railwayapp/cli (reemplaza a browser-use, contaminado) | 3 | 3 | 0 |

Cada ronda que informó una regla contaminó a sus repos, que pasaron a calibración. Cinco rondas, y en cada una la muestra fresca destapó **una clase nueva** de falso positivo:

| Ronda | Clase nueva |
|---|---|
| 1 | Placeholder en mayúsculas (`../NNNN/results.md`) |
| 1 | Convención de otra herramienta (`.goose/recipes/`) |
| 2 | Archivo que hay que crear (`your_profile.rs`) |
| 3 | Archivo que el documento declara generado (`contributor-names.json`) |
| 4 | Ninguna nueva; pero auditar los descartes destapó que la ventana de prosa sangraba entre filas de tabla |
| 5 | Placeholder en CamelCase con relleno (`EventNameHere`) |

La ronda 5 es la primera en la que la muestra fresca produjo mayoría de verdaderos positivos: 3 de 4. Las cuatro anteriores, juntas, dieron 3 verdaderos sobre 8 findings. La ronda 6, con el arreglo de `EventNameHere` aplicado y `railwayapp/cli` en lugar de `browser-use`, dio 3 de 3.

Sumadas, las seis rondas dan **13 findings fuera de muestra, 6 verdaderos y 7 falsos**. Ese es el número que describe el recorrido completo; el 100% describe sólo el estado final, sobre 3 findings.

## Las correcciones aplicadas

De 231 findings iniciales a 13, con 11 verdaderos:

| Corrección | Dónde |
|---|---|
| Fallback a la raíz del repo para fuentes anidadas | `path-missing.ts` |
| Una ruta cuya forma existe en algún lado no es drift | [ADR-0005](../../docs/adr/0005-una-ruta-que-existe-en-algun-lado-no-es-drift.md) |
| Un directorio de un solo segmento no es una afirmación | [ADR-0004](../../docs/adr/0004-un-directorio-suelto-no-es-una-afirmacion.md) |
| Una ruta necesita una barra | [ADR-0003](../../docs/adr/0003-una-ruta-necesita-una-barra.md) |
| `git check-ignore` sobre las rutas candidatas | `src/verify/git.ts` |
| Sonda de hijo para directorios de salida generada | `candidatePaths` en `src/run.ts` |
| Lista fija de directorios generados, para cuando no hay git | `src/verify/generated.ts` |
| Inline code con espacios: es un comando | `discard.ts` |
| Decodificar el percent-encoding de los links | `paths.ts` |
| Marcadores de ejemplo, incertidumbre y generación en la prosa | `context-prose.ts` |
| Imperativos de crear al inicio de línea | `context-prose.ts` |
| La ventana de prosa no sangra entre elementos independientes | `context-prose.ts` |
| La línea nombra otro repositorio | `context-prose.ts` + `originSlug` |
| Inline code que es etiqueta de un link externo | `parseMarkdown` |
| Placeholders metasintácticos, en mayúsculas y posesivos | `discard.ts` |
| Copias idénticas de `AGENTS.md` y `CLAUDE.md` | `collapseDuplicates` en `discover.ts` |

## Lo que cada corrección costó

Precisión se compró con cobertura. El falso negativo más caro está en [ADR-0005](../../docs/adr/0005-una-ruta-que-existe-en-algun-lado-no-es-drift.md): **un archivo que se movió de paquete ya no se detecta**, porque es indistinguible de un documento que habla en relativo. El fixture `monorepo` documenta el caso exacto.

Vale notar que los tres verdaderos positivos de `typescript-sdk` sobrevivieron a esa regla porque el paquete cambió de **nombre** (`server` → `server-legacy`), y eso rompe el sufijo. Si el archivo sólo se hubiera movido de lugar dentro del mismo paquete, driftwatch se habría quedado callado.

## Nota de ejecución

Los clones se borran después de generar los snapshots: son cache reconstruible con `pnpm corpus` y ocupan ~2.7 GB. `pnpm corpus --only <patrón>` corre un subconjunto sin volver a bajar el resto.
