# 10: Corpus de repos reales — la puerta de M1

**What to build:** la única medición honesta de si el proyecto funciona. Un script clona repos públicos con `CLAUDE.md` o `AGENTS.md` reales, corre driftwatch sobre cada uno, y guarda la salida como snapshot. Después se revisa **a mano**, finding por finding, cuántos son falsos positivos.

Un fixture verde no prueba nada sobre falsos positivos. Esto sí.

**Blocked by:** 06, 07, 08, 09

**Status:** NO CERRADO — faltan 5 repos de validación (criterio nuevo: ADR-0006)

- [x] `scripts/corpus.ts` clona una lista versionada de **≥10 repos públicos** con archivos de contexto de agente reales
- [x] Los clones viven en `test/corpus/` y están gitignoreados; la lista de repos y los snapshots sí se commitean
- [x] Los snapshots no afirman ser correctos: afirman no cambiar sin intención. El script documenta esa distinción
- [x] Cada finding del corpus se clasifica a mano como verdadero o falso positivo, y la clasificación queda escrita en el repo con su justificación
- [ ] **La puerta:** la tasa de falsos positivos revisada a mano queda documentada. Si no baja del 5%, este ticket **no se cierra** y el trabajo vuelve a 06 y 07 a ajustar heurísticas. No se avanza a M2
- [ ] El resultado se reporta tal cual sale. Si el corpus muestra ruido, se dice explícitamente en vez de cerrarlo como hecho (`AGENTS.md` § Verificación)

## Resultado, tal cual salió

**24 repos públicos, 111 fuentes. La tasa de falsos positivos fuera de muestra es 5 de 8 = 62%.**

El criterio era < 5%. **No se cumple, así que este ticket no se cierra y M1 no pasa la puerta.** No se avanzó a M2. La clasificación finding por finding está en `test/corpus/CLASIFICACION.md`.

## Cómo se midió, y por qué el 62% es el número honesto

Las heurísticas se ajustaron mirando findings de repos concretos. Medir precisión sobre ese mismo material no mide precisión: mide cuánto se ajustó. Así que hubo **tres rondas de validación**, cada una con repos nunca vistos antes de medir. Cuando una ronda informaba una regla, esos repos pasaban a calibración y se armaba una ronda nueva.

| Ronda | Repos | Findings | Verdaderos | Falsos |
|---|---|---|---|---|
| 1 | playwright-mcp, anthropic-sdk-typescript, spec-kit, nitro, zod | 2 | 0 | 2 |
| 2 | crush, turso, svelte | 4 | 3 | 1 |
| 3 | vitest, rust-analyzer, nuxt | 2 | 0 | 2 |
| **Agregado** | **11 repos** | **8** | **3** | **5** |

Sobre calibración quedan 9 findings con 1 falso positivo (11%). Ese número no significa nada; está para mostrar la diferencia entre medir donde ajustaste y medir donde no.

## El hallazgo que vale más que el porcentaje

**Cada ronda de validación destapó una clase nueva de falso positivo, no una repetición.** Placeholder en mayúsculas (`../NNNN/results.md`), convención de otra herramienta (`.goose/recipes/`), archivo que hay que crear (`your_profile.rs`), archivo que el documento declara generado (`contributor-names.json`).

Después de cinco rondas y quince correcciones, un muestreo fresco de repos sigue dando mayoría de ruido. No faltan dos reglas más: las razones por las que un documento menciona una ruta sin afirmar que exista son abiertas y viven en la prosa. Eso es lo que la puerta estaba ahí para descubrir, y lo descubrió.

## Lo que sí se logró

De **231 findings a 9**, con quince correcciones que son clases generales y no parches. Y encontró drift real:

- `tursodatabase/turso`: `core/translate/emitter.rs` referenciado **tres veces** en un skill activo. No existe en el repo. Encontrado mientras turso estaba en validación.
- `openai/codex`: `mcp_connection_manager.rs`, sobre el que el `AGENTS.md` dice "prefer using". No existe.
- `openai/codex`: `app-server-protocol/src/protocol/v2.rs`, mencionado dos veces. El directorio tiene `common.rs` y `mod.rs`, no `v2.rs`.
- `calcom/cal.com`: `packages/features/ee/workflows/lib/constants.ts`. El directorio existe, el archivo no.
- `cloudflare/workers-sdk`: `.github/PULL_REQUEST_TEMPLATE.md` contra el real en minúsculas.

Ocho verdaderos positivos sobre nueve findings de calibración. La herramienta funciona; lo que no se sostiene es el 5%.

## Por qué dejé de iterar

Seguir agregando una regla por clase mientras re-mido es la trampa del sobreajuste, y quemé tres grupos de validación para no caer en ella. La clase que queda sin resolver (`.goose/recipes/`) necesita entender que una sección entera habla de un tercero, y eso es exactamente lo que `ROADMAP.md` § "Fuera de alcance" prohíbe resolver con un LLM.

## Una ambigüedad del criterio que hay que resolver

"La tasa de falsos positivos" no dice sobre qué denominador. Sobre findings reportados: 62%, no cumple. Sobre claims examinados: 5 sobre miles, cumple con enorme margen y no significa nada. La primera es la que importa, y es la que `BRIEF.md` describe al decir "es preferible reportar 6 problemas reales que 20 con 8 dudosos".

## Comments

Los clones se borraron después de generar los snapshots: son cache reconstruible con `pnpm corpus` y ocupaban 2.8 GB. Los snapshots y la clasificación quedan commiteados.

En la última corrida `colinhacks/zod` falló al clonar (transitorio) y se salteó, así que los snapshots cubren 23 de los 24 repos de la lista.

## El criterio se revisó

A pedido del usuario, el criterio de "< 5% de falsos positivos" se reemplazó por [ADR-0006](../../../docs/adr/0006-el-criterio-de-precision-de-m1.md). El original no era estricto de más ni de menos: **no era medible**. Una herramienta precisa produce pocos findings, y con 9 findings un solo falso positivo ya es 11%; para distinguir 5% de 6% harían falta 20 findings, que es la enfermedad que el criterio pretendía prevenir.

El criterio nuevo cambia la forma, no sólo el número: cuenta por repo en vez de globalmente, separa un piso duro para los falsos positivos **autofixables** (que no son ruido sino corrupción del documento), agrega un piso de cobertura para que el silencio no alcance, y exige que la medición sea fuera de muestra.

**Siete de las nueve condiciones ya se cumplen.** Falta la 8: el grupo de validación tiene 3 repos y el criterio pide 8. La tabla completa está en `test/corpus/CLASIFICACION.md`.
