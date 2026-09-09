# 02: Descubrimiento de fuentes y reporter `pretty`

**What to build:** corriendo `driftwatch` sin argumentos en este mismo repo, la herramienta encuentra sus archivos de contexto de agente, los lista, y cierra con la línea de resumen. No verifica nada todavía, así que sale con 0. Es el primer momento en que la herramienta se ve como una herramienta.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Se descubren los siete patrones de fuente de `docs/spec/SPEC.md` § 2, con su `kind` correcto
- [ ] Se respeta `.gitignore`; nunca se entra a `node_modules`, `dist`, `build`, `.next`, `vendor` ni `target`
- [ ] La raíz se resuelve al directorio con `.git`, con fallback al cwd si no hay repo
- [ ] Cada fuente registra su `baseDir` propio, aunque todavía no se use para resolver nada
- [ ] Los argumentos posicionales limitan el alcance: `driftwatch AGENTS.md docs/` audita solo eso
- [ ] La línea de resumen respeta el formato de `docs/spec/SPEC.md` § 5, sin emojis, con `✓` cuando no hay problemas
- [ ] Los colores se desactivan si `NO_COLOR` está seteado o si stdout no es TTY
- [ ] **Aceptación de M0:** en este repo, la corrida lista las fuentes y sale con 0 en menos de 300 ms, medido y anotado en el ticket
