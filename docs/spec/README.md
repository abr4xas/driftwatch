# driftwatch — especificación

Encuentra las partes de tu `CLAUDE.md`, `AGENTS.md` y skills que ya no son ciertas.

> `knip` encuentra código muerto. driftwatch encuentra **contexto muerto**.

Este directorio es la **especificación de referencia** del proyecto. Es la fuente primaria: cuando el código y estos documentos discrepan, primero se decide cuál está mal, no se ajusta el documento por reflejo.

## Lectura

| Documento | Contenido |
|---|---|
| [BRIEF.md](./BRIEF.md) | El problema, por qué duele, qué cuenta como éxito, no-objetivos |
| [SPEC.md](./SPEC.md) | Checks, CLI, formatos de salida, config, autofix, presupuesto de perf |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Pipeline, modelo de datos, stack, estrategia de testing |
| [ROADMAP.md](./ROADMAP.md) | Milestones M0–M6 con criterios de aceptación |

El handoff para el agente que construye vive en la raíz del repo: [AGENTS.md](../../AGENTS.md).
