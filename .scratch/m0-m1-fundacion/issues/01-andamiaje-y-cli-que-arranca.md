# 01: Andamiaje del paquete y CLI que arranca

**What to build:** alguien clona el repo, corre el build, y el binario responde. `--help` imprime la lista de flags de `docs/spec/SPEC.md` § 4, `--version` imprime la versión del `package.json`, y una invocación con un flag desconocido falla con un mensaje legible y sale con 2. Todavía no audita nada.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `pnpm typecheck && pnpm test && pnpm build && node ./dist/cli.js --help` corre en verde de punta a punta
- [ ] TypeScript con `strict: true` y `noUncheckedIndexedAccess: true`; ESM puro; sin `any` ni `as`
- [ ] `bin` del `package.json` apunta al CLI compilado y `engines.node` es `>=24` (ADR-0002)
- [ ] El parseo de argumentos usa `node:util parseArgs`, sin dependencia de terceros
- [ ] Los tres exit codes de `docs/spec/SPEC.md` § 4 están cableados y cubiertos por test: 0 sin errores, 1 con al menos un error, 2 por fallo de la herramienta
- [ ] Un flag inválido o una ruta posicional inexistente producen un mensaje claro y exit 2, nunca un stack trace crudo
- [ ] `--version` no carga nada más que lo necesario para imprimirlo
