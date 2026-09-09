# ADR-0001 — La especificación vive dentro del repo

- **Estado:** aceptada
- **Fecha:** 2026-09-08

## Contexto

El proyecto nació como un directorio con solo especificación (`BRIEF.md`, `SPEC.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `AGENTS.md`) y sin código. El `AGENTS.md` original instruía explícitamente: *"Creá el proyecto en un repo nuevo, no dentro de este directorio. Este directorio queda como la especificación de referencia."*

## Decisión

Se convirtió ese mismo directorio en el repo del proyecto. La especificación se movió a `docs/spec/` sin editar su contenido; `AGENTS.md` quedó en la raíz y se reescribió para apuntar a las nuevas rutas.

## Por qué, en contra de la instrucción original

La instrucción buscaba que la spec no se degradara a comentario del código. Ese riesgo se mitiga mejor con una regla explícita (`docs/spec/` es fuente primaria; ante discrepancia se decide cuál está mal antes de tocar nada) que con la separación física, y a cambio se gana algo que importa más para *este* proyecto en particular: **driftwatch se puede correr sobre su propio repo desde el primer día**, con un `AGENTS.md` real, docs anidados y rutas cruzadas. El repo es su propio primer sujeto de prueba, que es exactamente lo que `AGENTS.md` § "Verificación" pide.

## Consecuencias

- Los documentos de spec son ahora rastreables en el mismo historial que el código: un cambio de comportamiento y su cambio de spec pueden viajar en un commit.
- La spec, al estar dentro del repo auditado, es susceptible de generar findings de driftwatch. Eso es deseable y es señal, no ruido.
- Un solo repo que publicar cuando llegue el momento (decisión de cara al exterior, pendiente de consultar).
