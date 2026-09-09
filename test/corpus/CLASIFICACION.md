# Clasificación del corpus

Revisión a mano de cada finding contra el repo real. Fecha: 2026-09-09.

Corpus: **24 repos públicos fijados a un commit, 111 fuentes de contexto.**

## Evaluación contra el criterio vigente

El criterio de "< 5% de falsos positivos" se reemplazó por [ADR-0006](../../docs/adr/0006-el-criterio-de-precision-de-m1.md), porque se midió y resultó no ser medible. Estado de las nueve condiciones:

| # | Condición | Medido | Estado |
|---|---|---|---|
| 1 | Fixture `false-positive-traps` en cero | 0 findings | **cumple** |
| 2 | Cero falsos positivos entre findings `fixable` | 0 findings `fixable` en todo el corpus | **cumple** |
| 3 | Mediana de FP por repo = 0 | 0 | **cumple** |
| 4 | Percentil 90 de FP por repo ≤ 1 | 0 | **cumple** |
| 5 | Ningún repo con más de 2 FP | máximo 1 (`spec-kit`) | **cumple** |
| 6 | Precisión agregada ≥ 80% fuera de muestra | el grupo de validación vigente produce 0 findings | **no medible** |
| 7 | ≥ 1 verdadero positivo por cada 3 repos | 8 verdaderos sobre 24 repos = 1 cada 3.0 | **cumple, justo en el límite** |
| 8 | ≥ 20 repos, con ≥ 8 en validación | 24 repos, pero sólo 3 en validación | **no cumple** |
| 9 | Regla de contaminación codificada | campo `holdout` en `scripts/corpus.ts` | **cumple** |

**Siete de nueve se cumplen. M1 sigue sin cerrar**, ahora por la condición 8: el grupo de validación tiene 3 repos y el criterio pide 8. De las tres rondas de validación, las dos primeras quedaron contaminadas al derivar reglas de sus findings, y la tercera no alcanza sola.

La condición 6 no es medible mientras el grupo de validación no produzca findings. No es un problema: una vez que el grupo llegue a 8 repos, o produce findings y se mide, o no produce ninguno y entonces lo que hay que revisar es la condición 7.

La condición 2 es la que más se ganó al revisar el criterio, y el original no la mencionaba: **ningún falso positivo del corpus llegó a marcarse autofixable.** Los tres niveles de confianza del ticket 07 y el umbral de 0.8 de `SPEC.md` § 8 están haciendo su trabajo.

La condición 7 pasa exactamente en el límite, y vale decirlo: si se agregan los 5 repos que faltan para validación y ninguno produce un verdadero positivo, el ratio cae por debajo del piso y la que falla es la cobertura, no la precisión.

---

## El número que importa

Las heurísticas se ajustaron mirando findings de repos concretos. Medir precisión sobre ese mismo material no mide precisión: mide cuánto se ajustó. Así que el corpus está partido en dos, y hubo **tres rondas de validación**, cada una con repos que nunca se miraron antes de medir.

| Ronda de validación | Repos | Findings | Verdaderos | Falsos |
|---|---|---|---|---|
| 1 | playwright-mcp, anthropic-sdk-typescript, spec-kit, nitro, zod | 2 | 0 | 2 |
| 2 | crush, turso, svelte | 4 | 3 | 1 |
| 3 | vitest, rust-analyzer, nuxt | 2 | 0 | 2 |
| **Agregado fuera de muestra** | **11 repos** | **8** | **3** | **5** |

**Tasa de falsos positivos fuera de muestra: 5 de 8 = 62%.**

El criterio de `ROADMAP.md` § M1 es **< 5%**. No se cumple, ni de cerca. **M1 no pasa la puerta y no se avanza a M2.**

Sobre el grupo de calibración, después de todos los ajustes, quedan 9 findings con 1 falso positivo: 11%. Ese número no significa nada, y está acá sólo para mostrar la diferencia entre medir donde ajustaste y medir donde no.

## El hallazgo real: el espacio de clases no se cierra

Cada ronda de validación destapó una **clase nueva** de falso positivo, no una repetición de las anteriores:

| Ronda | Clase nueva que apareció |
|---|---|
| 1 | Placeholder en mayúsculas (`../NNNN/results.md` en zod) |
| 1 | Convención de otra herramienta (`.goose/recipes/` en spec-kit) |
| 2 | Archivo que hay que crear (`your_profile.rs` en turso) |
| 3 | Archivo que el documento declara generado (`contributor-names.json` en vitest) |

Después de cinco rondas de corrección y unas quince reglas, un muestreo fresco de repos sigue produciendo mayoría de ruido. **Eso es la evidencia, y es más importante que el porcentaje.** No es que falten dos o tres reglas: es que las razones por las que un documento menciona una ruta sin afirmar que existe son abiertas, y viven en la prosa.

## Los 9 findings de calibración, uno por uno

### Verdaderos positivos (8)

**1. `openai/codex` `AGENTS.md:35`** — Afirma `codex-rs/codex-mcp/src/mcp_connection_manager.rs` y le dice al agente "prefer using" ese archivo. No existe ningún `mcp_connection_manager.rs` en el repo. Drift real, y del tipo más caro: una instrucción directa sobre un archivo inexistente.

**2–3. `openai/codex` `AGENTS.md:265` y `275`** — Afirma `app-server-protocol/src/protocol/v2.rs`. El directorio existe con `common.rs`, `mod.rs`, `mappers.rs` y otros; **no hay `v2.rs`**. Cuenta doble porque el documento lo menciona en dos lugares.

**4. `cloudflare/workers-sdk` `AGENTS.md:140`** — Afirma `.github/PULL_REQUEST_TEMPLATE.md`. El archivo real es `.github/pull_request_template.md`, en minúsculas. Verdadero pero menor: en un filesystem sensible a mayúsculas la ruta no existe, y es lo que un agente ve en CI.

**5. `calcom/cal.com` `AGENTS.md:130`** — Afirma `packages/features/ee/workflows/lib/constants.ts`. El directorio existe, el archivo no. Drift real. Antes contaba doble; ahora `CLAUDE.md`, que es una copia idéntica, se reporta como alias.

**6–8. `tursodatabase/turso` `.claude/skills/cdc/SKILL.md:158`, `242`, `246`** — Afirma `core/translate/emitter.rs` tres veces, como encabezados de sección. `core/translate/` existe; **no hay ningún `emitter.rs` en todo el repo**. Drift real en un skill activo, y se encontró cuando turso estaba en el grupo de validación.

### Falso positivo (1)

**9. `github/spec-kit` `AGENTS.md:464`** — Afirma `.goose/recipes/`. El texto es: "### Goose Integration … Goose is a YAML-format agent using Block's recipe system: — Uses `.goose/recipes/` directory for YAML recipe files".

El documento describe la convención de **otra herramienta**, para el proyecto que spec-kit genera. Detectarlo requeriría entender que la sección entera habla de un tercero. Es la clase que no tiene arreglo determinista, y quedó sin resolver a propósito.

## Las quince correcciones aplicadas

De 231 findings iniciales a 9, en cinco rondas:

| Corrección | Dónde |
|---|---|
| Fallback a la raíz del repo para fuentes anidadas | comentario en `path-missing.ts` |
| Una ruta cuya forma existe en algún lado no es drift | [ADR-0005](../../docs/adr/0005-una-ruta-que-existe-en-algun-lado-no-es-drift.md) |
| Un directorio de un solo segmento no es una afirmación | [ADR-0004](../../docs/adr/0004-un-directorio-suelto-no-es-una-afirmacion.md) |
| Una ruta necesita una barra | [ADR-0003](../../docs/adr/0003-una-ruta-necesita-una-barra.md) |
| `git check-ignore` sobre las rutas candidatas | `src/verify/git.ts` |
| Sonda de hijo para directorios de salida generada | `candidatePaths` en `src/run.ts` |
| Lista fija de directorios generados, para cuando no hay git | `src/verify/generated.ts` |
| Inline code con espacios: es un comando | regla 6 en `discard.ts` |
| Decodificar el percent-encoding de los links | `decodeTarget` en `paths.ts` |
| Marcadores de ejemplo ("such as") | `context-prose.ts` |
| Marcadores de incertidumbre ("if exists") | `context-prose.ts` |
| Marcadores de generación ("is generated by") | `context-prose.ts` |
| Imperativos de crear al inicio de línea | `context-prose.ts` |
| La línea nombra otro repositorio | `context-prose.ts` + `originSlug` |
| Inline code que es etiqueta de un link externo | `parseMarkdown` |
| Placeholders metasintácticos, en mayúsculas y posesivos | `discard.ts` |
| Copias idénticas de `AGENTS.md` y `CLAUDE.md` | `collapseDuplicates` en `discover.ts` |

## Lo que cada corrección costó

Precisión se compró con cobertura. El falso negativo más caro está en [ADR-0005](../../docs/adr/0005-una-ruta-que-existe-en-algun-lado-no-es-drift.md): **un archivo que se movió de paquete ya no se detecta**, porque es indistinguible de un documento que habla en relativo. El fixture `monorepo` documenta el caso exacto.

## Una ambigüedad del criterio

"La tasa de falsos positivos" no dice sobre qué denominador:

- **FP sobre findings reportados**: 5 / 8 fuera de muestra = 62%. No cumple.
- **FP sobre claims examinados**: 5 sobre miles. Cumple con enorme margen, y no significa nada.

La primera es la que importa, y es la que `BRIEF.md` describe al decir "es preferible reportar 6 problemas reales que 20 con 8 dudosos" — eso es un ratio de findings.

## Nota de ejecución

En la última corrida `colinhacks/zod` falló al clonar (transitorio) y se salteó, así que los snapshots cubren 23 de los 24 repos de la lista. Su snapshot anterior se conserva.
