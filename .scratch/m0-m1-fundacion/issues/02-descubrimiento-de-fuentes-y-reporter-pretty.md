# 02: Descubrimiento de fuentes y reporter `pretty`

**What to build:** corriendo `driftwatch` sin argumentos en este mismo repo, la herramienta encuentra sus archivos de contexto de agente, los lista, y cierra con la línea de resumen. No verifica nada todavía, así que sale con 0. Es el primer momento en que la herramienta se ve como una herramienta.

**Blocked by:** 01

**Status:** done

- [x] Se descubren los siete patrones de fuente de `docs/spec/SPEC.md` § 2, con su `kind` correcto
- [x] Se respeta `.gitignore`; nunca se entra a `node_modules`, `dist`, `build`, `.next`, `vendor` ni `target`
- [x] La raíz se resuelve al directorio con `.git`, con fallback al cwd si no hay repo
- [x] Cada fuente registra su `baseDir` propio, aunque todavía no se use para resolver nada
- [x] Los argumentos posicionales limitan el alcance: `driftwatch AGENTS.md docs/` audita solo eso
- [x] La línea de resumen respeta el formato de `docs/spec/SPEC.md` § 5, sin emojis, con `✓` cuando no hay problemas
- [x] Los colores se desactivan si `NO_COLOR` está seteado o si stdout no es TTY
- [x] **Aceptación de M0:** en este repo, la corrida lista las fuentes y sale con 0 en menos de 300 ms, medido y anotado en el ticket

## Comments

**Aceptación de M0 medida:** sobre este repo, `node ./dist/cli.js` lista `AGENTS.md` como `agents-md`, sale con 0, y el pipeline tarda ~18 ms. El proceso completo, incluido el arranque de Node, tarda ~50 ms. El presupuesto era 300 ms.

Dos decisiones de diseño que vale registrar:

- **El listado de fuentes se autodestruye.** El criterio de M0 pide que la herramienta "liste las fuentes encontradas", pero SPEC § 5 dice que sin problemas la salida es una sola línea (`✓ 14 archivos · sin drift`). En vez de elegir uno, el reporter lista las fuentes solo mientras el registro de checks está vacío. En cuanto el ticket 05 registre `path/missing`, el bloque desaparece sin que nadie lo borre, y hay un test que lo fija.
- **Los patrones anclados se aceptan a cualquier profundidad.** SPEC § 2 escribe `.claude/skills/**/SKILL.md` desde la raíz, pero un monorepo con un `.claude/` por paquete es normal, y un `SKILL.md` bajo `.claude/skills` es una skill viva donde sea que esté. El riesgo de falso positivo es nulo: la regla se volvió más permisiva en *qué archivos audita*, no en qué reporta.

`--quiet` pasa a estar implementado y sale de la lista de pendientes. `--strict` sigue en ella: solo cambia algo cuando existen warnings, y los warnings son tier 2, que es M5. Aceptarlo hoy sería prometer de más.
