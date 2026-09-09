# ADR-0004 — Un directorio de un solo segmento no es una afirmación verificable

- **Estado:** aceptada
- **Fecha:** 2026-09-09

## Contexto

`SPEC.md` § 3 dice que un texto es una ruta si "termina en `/` (directorio)". Sobre el corpus de 13 repos reales, esa regla sola produjo una de las clases de falso positivo más grandes: referencias de un solo segmento como `` `feat/` ``, `` `fix/` ``, `` `partners/` ``, `` `security/` ``, `` `exports/` ``, `` `app/` ``, `` `src/` ``, `` `ppr/` ``.

Casos concretos del corpus:

- `sst/opencode` `AGENTS.md:9` dice `` `feat/` `` y `` `fix/` ``. Son **prefijos de nombre de rama**, no directorios.
- `BerriAI/litellm` `tests/e2e/CLAUDE.md` enumera `` `embeddings/` ``, `` `realtime/` ``, `` `ratelimit/` ``, `` `budgets/` ``, `` `spend_tracking/` ``: son **categorías de test**, escritas como una lista de temas.
- `vercel/next.js` dice `` `ppr/` `` y `` `ppr-full/` ``, que son **nombres de modo**, no carpetas.
- `langchain-ai/langchain` dice `` `partners/` `` y `` `standard-tests/` ``, refiriéndose a paquetes cuya ubicación real es más profunda.

## Decisión

**Una referencia a directorio de un solo segmento (`` `foo/` ``) no se verifica.** Hace falta al menos una barra interna: `` `src/lib/` `` sí es una afirmación, `` `lib/` `` no.

## Por qué

Es la extensión natural de [ADR-0003](./0003-una-ruta-necesita-una-barra.md). Ahí se decidió que un nombre de archivo suelto (`` `foo.ts` ``) no fija una ubicación y por lo tanto no afirma nada verificable. Un nombre de directorio suelto tiene exactamente la misma debilidad: la barra final dice "esto es un directorio", no "este directorio está acá".

La evidencia del corpus es que la gente usa `nombre/` como notación para *categorías, ramas, modos y namespaces*, no sólo para rutas. Verificar eso contra la raíz del repo garantiza ruido en cualquier documento lo bastante largo, y el ruido es lo que hace que la herramienta se desinstale.

## Consecuencias

- Se pierde la detección de un directorio de primer nivel que de verdad desapareció. Es un falso negativo real y acotado, del tipo que el proyecto declaró preferir.
- La regla se aplica **después** de las de descarte y **antes** de consultar el índice, y tiene su caso en el fixture `false-positive-traps`.
- Un directorio con barra interna (`` `src/lib/router/` ``) sigue verificándose entero.
