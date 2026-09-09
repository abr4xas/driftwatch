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

**32 repos públicos, 129 fuentes, 13 findings: 11 verdaderos y 2 falsos.**

Medido sobre el grupo de validación de 8 repos, que nunca se inspeccionó: **4 findings, 3 verdaderos, 1 falso = 75% de precisión.**

Contra el criterio revisado de [ADR-0006](../../../docs/adr/0006-el-criterio-de-precision-de-m1.md): **ocho de nueve condiciones se cumplen.** Falla sólo la 6, que pide ≥ 80% de precisión en validación. **M1 no cierra.**

Con 4 findings el umbral de 80% no admite ninguno falso: 3 de 4 es 75% y 4 de 4 es 100%, sin valor intermedio. La tabla completa está en `test/corpus/CLASIFICACION.md`.

## Lo que la herramienta encontró en repos que nunca vio

Los tres verdaderos positivos de validación están todos en `modelcontextprotocol/typescript-sdk`, y son el mismo renombre de paquete:

- `packages/server/src/server/sse.ts` → el archivo real vive en `packages/server-legacy/src/sse/sse.ts`.
- `packages/server/src/server/auth/` → las implementaciones están en `packages/server-legacy/src/auth` y `packages/core-internal/src/auth`.
- `packages/client/src/client/auth-extensions.ts` → el archivo real es `authExtensions.ts`, en camelCase y sin guion.

El `CLAUDE.md` de ese repo quedó describiendo la estructura de antes del renombre. Es exactamente el caso del `BRIEF.md`: un agente que lea ese documento va a buscar archivos que se movieron, con confianza y sin señal de error.

En calibración hay ocho más, entre ellos un `emitter.rs` referenciado tres veces en un skill activo de turso que no existe en el repo.

## El único falso positivo de validación

`browser-use/browser-use` `CLAUDE.md:87` afirma `tests/ci/test_action_EventNameHere.py`. `EventNameHere` es un placeholder en CamelCase con relleno, una clase que las reglas actuales no cubren: hay reglas para `<...>`, `{{...}}`, `$VAR`, `[...]`, `foo`, `NNNN` y `your_*`, pero no para esta forma.

**Tiene arreglo de una línea y no lo apliqué.** Aplicarlo contaminaría `browser-use` por la condición 9, y habría que sumar un noveno repo de validación para volver a medir. Dejarlo sin arreglar y decirlo vale más que un 100% conseguido tocando la vara después de ver el resultado.

## Cinco rondas de validación

Cada ronda que informó una regla contaminó a sus repos, que pasaron a calibración:

| Ronda | Findings | Verdaderos | Falsos |
|---|---|---|---|
| 1 | 2 | 0 | 2 |
| 2 | 4 | 3 | 1 |
| 3 | 2 | 0 | 2 |
| 4 | 0 | 0 | 0 |
| 5 | 4 | 3 | 1 |

La ronda 5 es la primera en la que una muestra fresca dio mayoría de verdaderos. Las cuatro anteriores, juntas, dieron 3 verdaderos sobre 8 findings. La tendencia mejoró de verdad, no por ajustar la vara.

## Una corrección al código que salió de auditar el silencio

La ronda 4 dio cero findings en cuatro repos, y auditar **qué había descartado** la herramienta destapó un bug: la ventana de dos líneas de los marcadores de prosa sangraba entre filas de tabla. Un "(e.g., ...)" en una fila suprimía la fila siguiente, que es otra afirmación independiente. Ahora la ventana sólo se abre cuando la línea es continuación de la anterior.

Esa auditoría contaminó los cuatro repos de la ronda 4, que pasaron a calibración, y obligó a armar la ronda 5 con cuatro repos nuevos.

## Dos correcciones al propio criterio, antes de medir

1. La condición 7 decía "≥1 verdadero positivo por cada 3 repos del corpus". Estaba mal especificada: agregar repos sanos la hacía fallar, así que medía el corpus y no la herramienta. Pasó a "≥1 verdadero positivo en el grupo de validación".
2. La condición 9 decía "si los findings se usan para ajustar una regla". Demasiado indulgente y no verificable por nadie. Pasó a "si se **inspeccionan**": quien vio los datos no puede desverlos, y inspeccionar deja rastro.

Las dos se corrigieron antes de tomar la medición que las iba a evaluar.

## Comments

Los clones se borraron después de generar los snapshots: son cache reconstruible con `pnpm corpus`, y ocupaban 2.7 GB. Se agregó `pnpm corpus --only <patrón>` para poder sumar un repo sin volver a bajar el resto.
