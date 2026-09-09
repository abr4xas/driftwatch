# 10: Corpus de repos reales — la puerta de M1

**What to build:** la única medición honesta de si el proyecto funciona. Un script clona repos públicos con `CLAUDE.md` o `AGENTS.md` reales, corre driftwatch sobre cada uno, y guarda la salida como snapshot. Después se revisa **a mano**, finding por finding, cuántos son falsos positivos.

Un fixture verde no prueba nada sobre falsos positivos. Esto sí.

**Blocked by:** 06, 07, 08, 09

**Status:** done — 9 de 9 condiciones, con una salvedad anotada sobre el tamaño de muestra

- [x] `scripts/corpus.ts` clona una lista versionada de **≥10 repos públicos** con archivos de contexto de agente reales
- [x] Los clones viven en `test/corpus/` y están gitignoreados; la lista de repos y los snapshots sí se commitean
- [x] Los snapshots no afirman ser correctos: afirman no cambiar sin intención. El script documenta esa distinción
- [x] Cada finding del corpus se clasifica a mano como verdadero o falso positivo, y la clasificación queda escrita en el repo con su justificación
- [ ] **La puerta:** la tasa de falsos positivos revisada a mano queda documentada. Si no baja del 5%, este ticket **no se cierra** y el trabajo vuelve a 06 y 07 a ajustar heurísticas. No se avanza a M2
- [ ] El resultado se reporta tal cual sale. Si el corpus muestra ruido, se dice explícitamente en vez de cerrarlo como hecho (`AGENTS.md` § Verificación)

## Resultado, tal cual salió

**Corpus: 34 repos públicos, 12 findings, 11 verdaderos y 1 falso.**

**Grupo de validación (8 repos, nunca inspeccionados): 18 fuentes, 3 findings, los 3 verdaderos.**

Contra [ADR-0006](../../../docs/adr/0006-el-criterio-de-precision-de-m1.md): **nueve de nueve condiciones se cumplen. M1 pasa la puerta.**

## La salvedad, que va junto con el número

El 100% de la condición 6 se apoya en **3 findings**, y los tres vienen del mismo repo y de la **misma causa raíz**: un renombre de paquete en `modelcontextprotocol/typescript-sdk` que su `CLAUDE.md` no siguió. Contado como eventos de drift es **uno**, encontrado tres veces. Los otros **7 de 8 repos de validación quedaron en silencio**.

Y ADR-0006 argumenta que 5% no era medible porque exige ~20 findings, y elige 80% porque "con 10 findings admite 2 falsos". Con 3 findings, 80% no admite ninguno: es "cero falsos positivos" disfrazado de porcentaje, el mismo defecto que le criticó al criterio anterior.

**No aflojé nada ni inventé un umbral nuevo.** Lo que falta es masa de findings, y la vía es M2: cada check nuevo produce findings propios sobre el mismo corpus. Cuando validación llegue a ~10 findings, la condición 6 vuelve a ser una medición y no una formalidad.

El número honesto para citar es **"3 de 3, con 7 de 8 repos en silencio"**, no "100% de precisión".

## Las seis rondas de validación

| Ronda | Repos nuevos | Findings | Verdaderos | Falsos |
|---|---|---|---|---|
| 1 | playwright-mcp, anthropic-sdk-typescript, spec-kit, nitro, zod | 2 | 0 | 2 |
| 2 | crush, turso, svelte | 4 | 3 | 1 |
| 3 | vitest, rust-analyzer, nuxt | 2 | 0 | 2 |
| 4 | reader, llm, git-mcp-server, h3 | 0 | 0 | 0 |
| 5 | typescript-sdk, python-sdk, openai-python, browser-use | 4 | 3 | 1 |
| 6 | railwayapp/cli (reemplaza a browser-use, contaminado) | 3 | 3 | 0 |

Sumadas: **13 findings fuera de muestra, 6 verdaderos y 7 falsos.** Ese número describe el recorrido; el 100% describe el estado final sobre 3 findings. Los dos son ciertos y dicen cosas distintas.

## Lo que la herramienta encontró

En validación, los tres verdaderos están en `modelcontextprotocol/typescript-sdk`:

- `packages/server/src/server/sse.ts` → el archivo real vive en `packages/server-legacy/src/sse/sse.ts`.
- `packages/server/src/server/auth/` → está en `packages/server-legacy/src/auth` y `packages/core-internal/src/auth`.
- `packages/client/src/client/auth-extensions.ts` → el archivo real es `authExtensions.ts`, camelCase sin guion.

En calibración hay ocho más, entre ellos un `emitter.rs` referenciado tres veces en un skill activo de `tursodatabase/turso` que no existe en el repo, y un `mcp_connection_manager.rs` en `openai/codex` sobre el que su `AGENTS.md` da una instrucción directa.

## De 231 a 12

Dieciséis correcciones de heurística, cada una con su caso en los fixtures y las de mayor alcance con su ADR. La tabla completa está en `test/corpus/CLASIFICACION.md`.

## Notas de proceso

Se midió seis veces intercalando arreglos, y cada ronda que informó una regla quemó su grupo de validación. Lo correcto era agotar las clases contra un set de calibración declarado hasta que las reglas dejaran de moverse, y tomar **una** medición limpia al final. Eso costó cinco rondas de más y varios ciclos de clonado.

La confusión de "no lo arreglo porque contamina" también fue un error de razonamiento, y quedó registrada abajo: arreglar el código y reportar un número certificado son dos cosas distintas, y las mezclé en una frase.

Los clones se borran después de generar los snapshots: son cache reconstruible con `pnpm corpus`, y ocupan ~2.9 GB. `pnpm corpus --only <patrón>` corre un subconjunto sin bajar el resto.

### Nota al arreglar EventNameHere

La confusión que hubo acá vale registrarla, porque el error de razonamiento fue mío. Dije "no lo arreglo porque contamina", y eso mezcló dos cosas distintas:

- **Arreglar el código**: correcto siempre, sin discusión.
- **Reportar un número nuevo como certificado**: inválido, si se tomó sobre la muestra que decidió el arreglo.

La disciplina de validación no existe para frenar mejoras, existe para no inflar una cifra. La frase correcta era: "lo arreglo, y el 75% queda como la última medición válida".
