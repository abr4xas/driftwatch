# ADR-0002 — El piso de Node es 24

- **Estado:** aceptada
- **Fecha:** 2026-09-08

## Contexto

La especificación se contradecía. `docs/spec/ARCHITECTURE.md` § Stack fijaba el runtime mínimo en **Node 24** ("LTS con `node:` builtins estables"), mientras que `docs/spec/ROADMAP.md` § M0 pedía CI en **Node 20 y 22**. Los dos criterios no se pueden cumplir a la vez: una matriz de CI en 20/22 obliga a escribir código que corra ahí.

## Decisión

Gana ARCHITECTURE. `engines.node` es `>=24`, y la matriz de CI corre en **24** (LTS activo) y **25** (current).

Se corrigió la línea de M0 en `ROADMAP.md` para que apunte a esta decisión.

## Por qué

Node 20 llegó a fin de vida en abril de 2026 y Node 22 está en mantenimiento. Sostener ese piso no gana usuarios reales: gana polyfills y un `tsconfig` con un target más bajo, y pone en riesgo el presupuesto de arranque en frío de < 80 ms, que es parte del producto y no un nice-to-have.

## Consecuencias

- Quien corra `npx driftwatch` con Node 22 o menos recibe el error de `engines` de npm en vez de un crash. Es un error claro, que es lo que `AGENTS.md` pide para los errores del usuario.
- Se pueden usar builtins de `node:` sin guardas de versión.
- Si aparece demanda concreta de Node 22, bajar el piso es una decisión reversible y barata; subirlo después no lo sería tanto. Este ADR se reabre con esa señal, no antes.
