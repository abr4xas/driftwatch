# 03: CI en GitHub Actions

**What to build:** cada push y cada pull request corre la verificación completa y la rama queda marcada en verde o en rojo sin que nadie tenga que correr nada a mano.

**Blocked by:** 01

**Status:** done, sin verificar en remoto

- [x] Un workflow corre lint, typecheck, test y build
- [x] Matriz de Node 24 y 25 (ADR-0002)
- [x] El workflow corre `node ./dist/cli.js --help` después del build, para que un `bin` roto no pase
- [x] El workflow corre driftwatch sobre este mismo repo; mientras no haya checks implementados eso solo verifica que no crashea
- [x] La caché de pnpm está configurada y el job completo termina en menos de dos minutos

## Comments

El workflow está escrito y los cinco pasos que ejecuta (`lint`, `typecheck`, `test`, `build`, `node ./dist/cli.js --help`, `node ./dist/cli.js`) se verificaron localmente en verde. Lo que **no** está verificado es el workflow corriendo en GitHub Actions: este repo todavía no tiene remoto, y crear el repo remoto es una de las acciones que `AGENTS.md` § "Decisiones que requieren consultar al usuario" reserva para el usuario.

Dos detalles que no eran obvios:

- `fetch-depth: 1` en vez del default: driftwatch construye su índice con `git ls-files`, así que necesita un working tree real. Un checkout sin working tree lo mandaría al fallback de glob y el CI dejaría de ejercitar el camino caliente.
- `timeout-minutes: 5` y `concurrency` con `cancel-in-progress`, para que una rama con varios pushes no acumule jobs.

El criterio de "menos de dos minutos" no se puede medir sin correrlo en remoto. Queda pendiente de la primera corrida real.

### Nota posterior, al cerrar el ticket 10

El paso "driftwatch sobre driftwatch" pasó a ser bloqueante. Había quedado como `continue-on-error` porque este repo mencionaba `scripts/corpus.ts` antes de que existiera; el ticket 10 lo creó, la corrida quedó limpia (`✓ 1 archivo · sin drift`), y desde ahora cualquier ruta que se rompa en `AGENTS.md` o en `docs/` tumba el CI.
