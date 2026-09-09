# ADR-0005 — Una ruta cuya forma existe en algún lugar del repo no se reporta

- **Estado:** aceptada
- **Fecha:** 2026-09-09

## Contexto

Sobre el corpus de 13 repos reales, después de aplicar el descarte de artefactos generados, la detección de comandos, la decodificación de links y el fallback a la raíz del repo, quedaba **una sola clase dominante** de falso positivo: rutas escritas relativas a un directorio que la prosa menciona y que sólo una persona infiere.

Ejemplos, todos con la sugerencia que la propia herramienta calculó:

| Documento | Afirma | Existe realmente |
|---|---|---|
| `vercel/next.js` `AGENTS.md:30` | `src/cli/next-dev.ts` | `packages/next/src/cli/next-dev.ts` |
| `remix-run/react-router` `AGENTS.md:33` | `lib/components.tsx` | `packages/react-router/lib/components.tsx` |
| `sst/opencode` `packages/llm/AGENTS.md:87` | `route/auth-options.ts` | `packages/llm/src/route/auth-options.ts` |
| `BerriAI/litellm` `ui/.../chat/AGENTS.md:14` | `src/app/globals.css` | `ui/litellm-dashboard/src/app/globals.css` |
| `withastro/astro` `AGENTS.md:78` | `core/errors/errors-data.ts` | `packages/astro/src/core/errors/errors-data.ts` |

En todos, el documento dice antes, en prosa, "dentro de `packages/next`" o "en el paquete `llm`", y después escribe las rutas relativas a eso. No hay señal sintáctica que distinga ese caso de una ruta que se rompió: ni el `baseDir` de la fuente ni la raíz del repo las resuelven.

## Decisión

Antes de reportar, se comprueba si **alguna** ruta del repo termina con la ruta afirmada, tomando segmentos enteros. Si aparece, no se reporta.

`src/cli/next-dev.ts` no se reporta porque existe `packages/next/src/cli/next-dev.ts`. `src/cli/next-inventado.ts` sí se reporta, porque esa secuencia de segmentos no está en ninguna parte.

La búsqueda arranca por el último segmento, así que compara sólo contra los homónimos y no recorre el índice: sigue siendo O(1) amortizado por claim.

## Por qué

Era la última clase grande, y sin resolverla la tasa de falsos positivos no bajaba del 5% que `ROADMAP.md` § M1 exige para avanzar.

La regla que ordena el proyecto dice que un falso positivo cuesta más que diez falsos negativos. Acá el intercambio es explícito y hay que decirlo sin adornos.

## Lo que se pierde

**Un archivo que se movió de paquete deja de detectarse.** Si `packages/web/CLAUDE.md` dice `` `src/db.ts` `` y ese archivo hoy vive sólo en `packages/api/src/db.ts`, driftwatch se queda callado, porque no puede distinguir "el doc de web quedó viejo" de "el doc de web habla en relativo del paquete api".

Es una pérdida real y la más caro de todas las que aceptamos. El fixture `monorepo` documenta el caso exacto.

## Consecuencias

- `path/missing` pasa a reportar sólo rutas cuya **forma** no aparece en ninguna parte del repo. Es una señal más angosta y mucho más fuerte: sobre el corpus bajó de 231 findings a 24.
- La recuperación de lo que se pierde no es aflojar esta regla, es un check nuevo con su propia identidad y su propia severidad, del tipo "esta ruta existe pero no donde el documento dice". Sería tier 2 y emitiría aviso, no error. No está en el alcance de M1.
- El fixture `monorepo` se reescribió para probar la resolución contra el `baseDir` con una ruta que no existe en ninguna forma, y para dejar registrado el caso que ya no se reporta.
