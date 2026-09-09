# Clasificación del corpus

Revisión a mano de cada finding, contra el repo real. Fecha: 2026-09-09.

Corpus: **21 repos públicos, 115 fuentes de contexto, 13 findings.**

## El resultado, primero

| Grupo | Findings | Verdaderos | Falsos | Tasa de FP |
|---|---|---|---|---|
| Calibración (18 repos) | 9 | 6 | 3 | 33% |
| **Validación (3 repos)** | **4** | **3** | **1** | **25%** |
| Total | 13 | 9 | 4 | **31%** |

**El criterio de `ROADMAP.md` § M1 es < 5%. No se cumple. M1 no pasa la puerta y no se avanza a M2.**

## Por qué hay dos grupos

Las heurísticas se ajustaron mirando los findings de los repos de **calibración**, en cuatro rondas. Medir precisión sobre el mismo material con el que se escribieron las reglas no mide nada: mide cuánto se ajustó.

Los repos de **validación** se agregaron después y nunca se miraron para derivar ninguna regla. Su tasa es la única estimación honesta de precisión fuera de muestra.

Hubo dos rondas de validación. La primera (`playwright-mcp`, `anthropic-sdk-typescript`, `spec-kit`, `nitro`, `zod`) dio **2 findings, 2 falsos positivos, 0 verdaderos**. De uno de ellos salió la regla de placeholders en mayúsculas (`NNNN`), así que esos cinco repos quedaron contaminados y pasaron a calibración. La segunda ronda (`crush`, `turso`, `svelte`) es la que se reporta arriba.

Con 4 findings, el intervalo de confianza del 25% es enorme. El número sirve para decir "no es 5%", no para decir "es 25%".

---

## Verdaderos positivos (9)

### 1–2. `calcom/cal.com` `AGENTS.md:130` y `CLAUDE.md:130`

Afirma `packages/features/ee/workflows/lib/constants.ts`. El directorio `packages/features/ee/workflows/lib/` existe; el archivo no. Drift real: el archivo se movió o se renombró y los dos documentos quedaron viejos. Cuenta doble porque `AGENTS.md` y `CLAUDE.md` son copias.

### 3. `cloudflare/workers-sdk` `AGENTS.md:140`

Afirma `.github/PULL_REQUEST_TEMPLATE.md`. El archivo real es `.github/pull_request_template.md`, en minúsculas. Verdadero positivo, aunque menor: en un filesystem sensible a mayúsculas la ruta no existe, y es lo que un agente vería en CI.

### 5. `openai/codex` `AGENTS.md:35`

Afirma `codex-rs/codex-mcp/src/mcp_connection_manager.rs`, y le dice al agente "prefer using" ese archivo. No existe ningún `mcp_connection_manager.rs` en el repo. Drift real, y del tipo más caro: una instrucción directa sobre un archivo inexistente.

### 6–7. `openai/codex` `AGENTS.md:265` y `275`

Afirma `app-server-protocol/src/protocol/v2.rs`. El directorio existe y tiene `common.rs`, `mod.rs`, `mappers.rs` y otros, pero **no** `v2.rs`. Drift real. Cuenta doble porque el documento lo menciona en dos lugares.

### 10–12. `tursodatabase/turso` `.claude/skills/cdc/SKILL.md:158`, `242` y `246`

Afirma `core/translate/emitter.rs` tres veces, como encabezados de sección (`### OperationMode — core/translate/emitter.rs`). El directorio `core/translate/` existe; **no hay ningún `emitter.rs` en todo el repo**. Drift real en un skill activo, encontrado en un repo del grupo de validación.

---

## Falsos positivos (4)

### 4. `github/spec-kit` `AGENTS.md:464`

Afirma `.goose/recipes/`. El texto es: "Goose is a YAML-format agent using Block's recipe system: — Uses `.goose/recipes/` directory for YAML recipe files".

El documento describe la convención de **otra herramienta**, para el proyecto del usuario que spec-kit va a generar. No es una afirmación sobre spec-kit. Clase: *ruta que pertenece a otro lugar*.

### 8–9. `prisma/prisma` `AGENTS.md:38` y `CLAUDE.md:38`

Afirma `skills/.pilot/`. El texto es: "`drive-*` skills and [`docs/drive/`](https://github.com/prisma/ignite/...) live in [prisma/ignite](https://github.com/prisma/ignite) (`skills/.pilot/`)".

La ruta vive en `prisma/ignite`, y la línea lo dice con dos links. Misma clase que el anterior. El `docs/drive/` de la misma línea **sí** se filtra, porque es la etiqueta de un link externo; `skills/.pilot/` está en un paréntesis suelto y no hay señal sintáctica que lo alcance.

### 13. `tursodatabase/turso` `.claude/skills/memory-benchmark/SKILL.md:290`

Afirma `perf/memory/src/profile/your_profile.rs`. El texto es: "1. **Create** `perf/memory/src/profile/your_profile.rs` implementing the `Profile` trait".

Es un archivo que el lector tiene que crear, y `your_profile` es un nombre de relleno. Clase: *instrucción de crear un archivo*. Tiene arreglo general disponible (prefijos `your_`/`my_`, y el imperativo "Create"/"Crear"), y no se aplicó a propósito: se descubrió en el grupo de validación, y ajustar una regla mirándolo lo convertiría en calibración, que es lo que ya pasó con la primera ronda.

---

## Las tres clases que quedan

1. **La ruta pertenece a otro repo o a otra herramienta** (3 de los 4 FP). El documento habla de otro lugar, y a veces lo dice con un link al lado. Es un problema de comprensión de prosa.
2. **La ruta es un archivo a crear** (1 de 4). Tiene arreglo general, sin aplicar por disciplina de medición.
3. **Copias duplicadas** — no es un falso positivo, pero infla el conteo: `AGENTS.md` y `CLAUDE.md` idénticos hacen contar dos veces el mismo problema. 4 de los 13 findings son pares.

## Qué se corrigió para llegar acá

De 231 findings iniciales a 13, en cuatro rondas, todas sobre el grupo de calibración:

| Corrección | Registro |
|---|---|
| Fallback a la raíz del repo para fuentes anidadas | comentario en `path-missing.ts` |
| Match por sufijo: una ruta cuya forma existe en algún lado no es drift | [ADR-0005](../../docs/adr/0005-una-ruta-que-existe-en-algun-lado-no-es-drift.md) |
| Un directorio de un solo segmento no es una afirmación | [ADR-0004](../../docs/adr/0004-un-directorio-suelto-no-es-una-afirmacion.md) |
| `git check-ignore` sobre las rutas candidatas | `src/verify/git.ts` |
| Sonda de hijo para directorios de salida generada | `candidatePaths` en `src/run.ts` |
| Descartar inline code con espacios: son comandos | regla 6 en `discard.ts` |
| Decodificar el percent-encoding de los links | `decodeTarget` en `paths.ts` |
| Marcadores de ejemplo y de incertidumbre en la prosa | `src/extract/context-prose.ts` |
| Inline code que es etiqueta de un link externo | `parseMarkdown` |
| Placeholders metasintácticos y en mayúsculas | `discard.ts` |

## Lo que se perdió por el camino

Cada corrección de precisión compró un falso negativo. El más caro está en [ADR-0005](../../docs/adr/0005-una-ruta-que-existe-en-algun-lado-no-es-drift.md): **un archivo que se movió de paquete ya no se detecta**, porque no se puede distinguir de un documento que habla en relativo. El fixture `monorepo` documenta el caso exacto.
