# 03: CI en GitHub Actions

**What to build:** cada push y cada pull request corre la verificación completa y la rama queda marcada en verde o en rojo sin que nadie tenga que correr nada a mano.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Un workflow corre lint, typecheck, test y build
- [ ] Matriz de Node 24 y 25 (ADR-0002)
- [ ] El workflow corre `node ./dist/cli.js --help` después del build, para que un `bin` roto no pase
- [ ] El workflow corre driftwatch sobre este mismo repo; mientras no haya checks implementados eso solo verifica que no crashea
- [ ] La caché de pnpm está configurada y el job completo termina en menos de dos minutos
