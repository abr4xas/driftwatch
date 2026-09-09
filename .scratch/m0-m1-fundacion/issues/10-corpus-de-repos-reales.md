# 10: Corpus de repos reales — la puerta de M1

**What to build:** la única medición honesta de si el proyecto funciona. Un script clona repos públicos con `CLAUDE.md` o `AGENTS.md` reales, corre driftwatch sobre cada uno, y guarda la salida como snapshot. Después se revisa **a mano**, finding por finding, cuántos son falsos positivos.

Un fixture verde no prueba nada sobre falsos positivos. Esto sí.

**Blocked by:** 06, 07, 08, 09

**Status:** NO CERRADO — la puerta del 5% no se cumple

- [x] `scripts/corpus.ts` clona una lista versionada de **≥10 repos públicos** con archivos de contexto de agente reales
- [x] Los clones viven en `test/corpus/` y están gitignoreados; la lista de repos y los snapshots sí se commitean
- [x] Los snapshots no afirman ser correctos: afirman no cambiar sin intención. El script documenta esa distinción
- [x] Cada finding del corpus se clasifica a mano como verdadero o falso positivo, y la clasificación queda escrita en el repo con su justificación
- [ ] **La puerta:** la tasa de falsos positivos revisada a mano queda documentada. Si no baja del 5%, este ticket **no se cierra** y el trabajo vuelve a 06 y 07 a ajustar heurísticas. No se avanza a M2
- [ ] El resultado se reporta tal cual sale. Si el corpus muestra ruido, se dice explícitamente en vez de cerrarlo como hecho (`AGENTS.md` § Verificación)

## Resultado, tal cual salió

**21 repos públicos, 115 fuentes, 13 findings. 9 verdaderos, 4 falsos. Tasa de falsos positivos: 31%.**

El criterio decía < 5%. **No se cumple, así que este ticket no se cierra y M1 no pasa la puerta.** La clasificación finding por finding, con justificación contra el repo real, está en `test/corpus/CLASIFICACION.md`.

## Lo que sí se logró

De 231 findings iniciales a 13, en cuatro rondas de corrección de heurísticas. Las clases eliminadas fueron reales y generales, no parches:

- Rutas relativas a la raíz del repo desde fuentes anidadas.
- Rutas cuya forma existe en algún lugar del repo (ADR-0005).
- Directorios de un solo segmento (ADR-0004).
- Todo lo que `git check-ignore` ignora, incluidos los `.gitignore` anidados y los directorios de salida propios de cada proyecto.
- Comandos enteros tomados como ruta.
- Links percent-encoded sin decodificar.
- Marcadores de ejemplo ("such as") y de incertidumbre ("if exists") en la prosa.
- Placeholders metasintácticos (`foo/`) y en mayúsculas (`NNNN`).

Y encontró drift real: un `emitter.rs` referenciado tres veces en un skill activo de `tursodatabase/turso` que no existe en el repo, un `mcp_connection_manager.rs` en `openai/codex` sobre el que el `AGENTS.md` da una instrucción directa, y un `v2.rs` en el mismo repo mencionado dos veces.

## Se usaron dos grupos, y por qué importa

Las heurísticas se ajustaron mirando los findings del grupo de **calibración**. Medir precisión sobre ese mismo material no mide precisión, mide cuánto se ajustó. Los repos de **validación** se agregaron después y nunca se miraron para derivar una regla.

La primera ronda de validación (`playwright-mcp`, `anthropic-sdk-typescript`, `spec-kit`, `nitro`, `zod`) dio **2 findings, los dos falsos positivos**. De uno salió la regla de placeholders en mayúsculas, así que esos cinco repos quedaron contaminados y pasaron a calibración. La segunda ronda (`crush`, `turso`, `svelte`) dio 4 findings, 3 verdaderos y 1 falso: **25% fuera de muestra**.

Con 4 findings el intervalo es enorme. El número alcanza para afirmar "no es 5%", no para afirmar "es 25%".

## Por qué paré acá y no seguí ajustando

Las tres clases de falso positivo que quedan son:

1. **La ruta pertenece a otro repo o a otra herramienta** (3 de los 4). El documento habla de otro lugar, a veces con un link al lado. Es comprensión de prosa.
2. **La ruta es un archivo que hay que crear** (1 de 4). Tiene arreglo general disponible.
3. Y una que no es un falso positivo pero infla el conteo: **`AGENTS.md` y `CLAUDE.md` duplicados** hacen contar dos veces el mismo problema. 4 de los 13 findings son pares.

Seguir agregando una regla por clase mientras se re-mide sobre los mismos repos es la trampa del sobreajuste, y ya quemé dos grupos de validación. La clase 1, que es la mayoría de lo que queda, necesita entender prosa, que es exactamente lo que `ROADMAP.md` § "Fuera de alcance" prohíbe resolver con un LLM.

## Una ambigüedad del criterio que hay que resolver

"La tasa de falsos positivos" no dice sobre qué denominador. Hay dos lecturas:

- **FP sobre findings reportados**: 4 / 13 = 31%. No cumple.
- **FP sobre claims examinados**: 4 sobre miles. Cumple con enormes márgenes, y no significa nada.

La primera es la que importa, y es la que `BRIEF.md` describe cuando dice "es preferible reportar 6 problemas reales que 20 con 8 dudosos" — eso es un ratio de findings. Así que la lectura estricta es la correcta y el criterio no se cumple.

## Comments

Los clones del corpus se borraron después de generar los snapshots, por acuerdo con el usuario: son cache reconstruible con `pnpm corpus` y ocupaban 2 GB. Los snapshots y esta clasificación quedan commiteados.
