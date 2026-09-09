# 01: Andamiaje del paquete y CLI que arranca

**What to build:** alguien clona el repo, corre el build, y el binario responde. `--help` imprime la lista de flags de `docs/spec/SPEC.md` § 4, `--version` imprime la versión del `package.json`, y una invocación con un flag desconocido falla con un mensaje legible y sale con 2. Todavía no audita nada.

**Blocked by:** None (can start immediately)

**Status:** done, con dos reservas anotadas abajo

- [x] `pnpm typecheck && pnpm test && pnpm build && node ./dist/cli.js --help` corre en verde de punta a punta
- [x] TypeScript con `strict: true` y `noUncheckedIndexedAccess: true`; ESM puro; sin `any` ni `as`
- [x] `bin` del `package.json` apunta al CLI compilado y `engines.node` es `>=24` (ADR-0002)
- [x] El parseo de argumentos usa `node:util parseArgs`, sin dependencia de terceros
- [x] Los tres exit codes de `docs/spec/SPEC.md` § 4 están cableados y cubiertos por test: 0 sin errores, 1 con al menos un error, 2 por fallo de la herramienta
- [x] Un flag inválido o una ruta posicional inexistente producen un mensaje claro y exit 2, nunca un stack trace crudo
- [ ] `--version` no carga nada más que lo necesario para imprimirlo

## Reservas al cerrar

Dos criterios quedan cumplidos solo en parte. Se anotan acá en vez de darlos por hechos.

1. **El exit code 1 está cableado pero todavía es inalcanzable.** `main()` llama a `exitCodeFor`, pero le pasa un recuento vacío por construcción, porque no hay checks que produzcan findings. La función está cubierta por unit test en sus cinco casos; lo que falta es un camino real que la haga devolver 1. Lo cierra el ticket 05, que es el primero que produce un finding.

2. **`--version` sigue cargando el cuerpo del CLI.** `cli.ts` importa `main.ts`, que arrastra `node:fs`, `node:path`, el parser y el texto de ayuda. El arranque en frío medido es de ~30 ms contra un presupuesto de 80 ms, así que no se optimizó: cortar el import costaría duplicar el despacho de flags para ganar milisegundos que sobran. Si el presupuesto se ajusta al agregar dependencias, este es el primer lugar donde mirar.

Además, queda un único `as` en el código: `(FORMATS as readonly string[]).includes(value)`, dentro del type predicate `isFormat`. Cae en la excepción documentada de `AGENTS.md` ("salvo en fronteras de parseo con validación adyacente"): el `as` *es* la validación.

## Comments

Revisión de dos ejes corrida sobre el diff contra `main`. Se aplicaron: `main()` ya no toca `process` (recibe `cwd`), se eliminó el scope creep de `defineConfig`/`Config`/`UserConfig`/`--dry-run` y el modelo de datos sin consumidores, `readVersion` lanza en vez de devolver `'0.0.0'`, se unificó la política de flags no implementados, se extrajeron `messageOf`/`codeOf`, se tipó la lista de pendientes a las claves booleanas reales, y se actualizó el árbol de directorios de `ARCHITECTURE.md`, que el review detectó desactualizado respecto del código en el mismo commit.
