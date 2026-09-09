# M0 + M1 — Fundación y el check que justifica el proyecto

La especificación completa vive en `docs/spec/`. Este archivo solo delimita el alcance de esta tanda de tickets.

## Alcance

- **M0** (`docs/spec/ROADMAP.md` § M0): esqueleto ejecutable. Tickets 01–03.
- **M1** (`docs/spec/ROADMAP.md` § M1): `path/missing` con precisión real. Tickets 04–10.

## Fuera de alcance en esta tanda

Todo M2 en adelante: `script/missing`, `skill/frontmatter`, `link/broken`, `frontmatter/invalid`, directivas de ignore en línea, archivo de config, `--fix`, formatos `json`/`github`/`sarif`, y los cuatro checks de tier 2.

Motivo: M1 es una puerta, no un hito. Si la tasa de falsos positivos del corpus no baja del 5%, planificar M2 ahora sería planificar sobre una hipótesis sin validar.

## Decisiones tomadas

- ADR-0001: la especificación vive dentro del repo.
- ADR-0002: el piso de Node es 24.
