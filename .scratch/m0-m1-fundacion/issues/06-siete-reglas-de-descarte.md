# 06: Las siete reglas de descarte del extractor de rutas

**What to build:** el ticket que decide si el proyecto vale la pena. Un archivo de contexto lleno de trampas —URLs, globs, placeholders, números de versión, `node.js`, rutas dentro de bloques de ejemplo, texto entre comillas— produce **cero findings**. Es lo que separa una herramienta que se usa todos los días de una que se desinstala en el primer uso.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] Las siete reglas están implementadas en el orden exacto de `docs/spec/ARCHITECTURE.md` § "Extracción de rutas: el detalle que define la calidad"
- [ ] Cada regla de descarte lleva un comentario de una línea explicando **qué falso positivo concreto evita** (`AGENTS.md` § Convenciones)
- [ ] Cada regla de descarte tiene su propio caso en `test/fixtures/false-positive-traps/`, que es el contrato contra la regresión
- [ ] **El fixture `false-positive-traps` cierra con cero findings.** Un solo finding ahí es el ticket sin cerrar
- [ ] La normalización quita `./` inicial, `:línea` final, backticks residuales y puntuación final
- [ ] La lista negra de palabras que parecen archivo pero no lo son (`node.js`, `next.js`, `nuxt.js`, `vue.js`, `d.ts` suelto) está cubierta
- [ ] Ante la duda entre reportar y dejar pasar, la implementación deja pasar, y el test que lo fija dice explícitamente que ese es el comportamiento buscado
