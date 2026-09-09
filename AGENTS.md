# Instrucciones para el agente que trabaje en driftwatch

La especificación de referencia vive en `docs/spec/`. El código vive en `src/`.

## Antes de escribir código

Leé los cuatro documentos en este orden: `docs/spec/BRIEF.md` (por qué), `docs/spec/SPEC.md` (qué), `docs/spec/ARCHITECTURE.md` (cómo), `docs/spec/ROADMAP.md` (en qué orden). El resto de este archivo asume que ya los leíste.

`docs/spec/` es fuente primaria. Si el código y la spec discrepan, decidí cuál está mal antes de tocar nada; no ajustes el documento por reflejo para que cierre.

## La regla que ordena todas las decisiones

**Un falso positivo cuesta más que diez falsos negativos.**

Cuando estés indeciso entre reportar algo dudoso o dejarlo pasar, dejalo pasar. Una herramienta que reporta 6 problemas reales se usa todos los días; una que reporta 20 con 8 dudosos se desinstala en el primer uso y no vuelve.

Esto aplica especialmente al extractor de rutas (`docs/spec/ARCHITECTURE.md` § "Extracción de rutas"), que es donde se concentra el riesgo.

## Orden de trabajo

Seguí los milestones de `docs/spec/ROADMAP.md` en orden. **M1 es la puerta:** si la tasa de falsos positivos sobre repos reales no baja del 5%, no avances a M2 — volvé a las heurísticas. Es preferible un proyecto con un solo check excelente que uno con ocho checks ruidosos.

Los tickets de trabajo viven en `.scratch/<feature>/issues/`. Ver `docs/agents/issue-tracker.md`.

## Convenciones de código

- TypeScript estricto (`strict: true`, `noUncheckedIndexedAccess: true`). Sin `any`, sin `as` salvo en fronteras de parseo con validación adyacente.
- ESM puro. Imports de builtins con prefijo `node:`.
- Sin clases salvo que haya estado real que encapsular. `RepoIndex` es una struct con funciones, no una clase.
- Errores del usuario (config inválido, ruta inexistente) se manejan con mensaje claro y exit 2. Nunca un stack trace crudo.
- Comentarios solo donde el *por qué* no es obvio. Las heurísticas del extractor de rutas sí los necesitan: cada regla de descarte lleva una línea explicando qué falso positivo evita.
- Sin emojis en el código ni en la salida del CLI.

## Dependencias

El presupuesto de arranque en frío (< 80 ms) es parte del producto, no un nice-to-have. Antes de agregar una dependencia al camino principal, verificá que no la puedas resolver con `node:` builtins en menos de 40 líneas. `jiti` y cualquier cosa relacionada con config `.ts` va cargada de forma lazy, solo si existe un archivo de config.

## Verificación

No des un milestone por cerrado sin correr:

```
pnpm typecheck && pnpm test && pnpm build && node ./dist/cli.js --help
```

Además, **corré la herramienta sobre sí misma y sobre repos reales**. Este repo tiene su propio `AGENTS.md` y `docs/`, así que es el primer sujeto de prueba. Un fixture verde no prueba nada sobre falsos positivos; el corpus de `scripts/corpus.ts` sí. Si un snapshot del corpus cambia, revisá el diff a mano antes de aceptarlo — ese diff es la única señal real de regresión de precisión.

Reportá los resultados tal cual salen. Si un check queda a medias o el corpus muestra ruido, decilo explícitamente en vez de cerrarlo como hecho.

## Decisiones que podés tomar solo

Nombres de archivos y funciones, estructura interna de módulos, elección entre `tinyglobby` y `fast-glob`, formato exacto de los mensajes de error, cómo organizar los fixtures.

## Decisiones que requieren consultar al usuario

- Cambiar el nombre del proyecto o el paquete de npm.
- Agregar una dependencia pesada al camino principal.
- Meter un LLM en cualquier parte (está fuera de alcance por diseño, ver `docs/spec/ROADMAP.md`).
- Publicar a npm, crear el repo remoto, o cualquier acción de cara al exterior.
- Cambiar el contrato de la salida JSON después de la primera publicación.

## Qué NO construir

Está en `docs/spec/ROADMAP.md` § "Fuera de alcance". Lo repito porque es la tentación principal: **no metas un LLM para verificar afirmaciones de prosa.** Rompe el determinismo, el presupuesto de latencia y la propuesta de valor entera. El proyecto gana por ser rápido, offline y confiable.
