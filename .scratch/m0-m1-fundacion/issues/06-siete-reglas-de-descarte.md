# 06: Las siete reglas de descarte del extractor de rutas

**What to build:** el ticket que decide si el proyecto vale la pena. Un archivo de contexto lleno de trampas —URLs, globs, placeholders, números de versión, `node.js`, rutas dentro de bloques de ejemplo, texto entre comillas— produce **cero findings**. Es lo que separa una herramienta que se usa todos los días de una que se desinstala en el primer uso.

**Blocked by:** 05

**Status:** done

- [x] Las siete reglas están implementadas en el orden exacto de `docs/spec/ARCHITECTURE.md` § "Extracción de rutas: el detalle que define la calidad"
- [x] Cada regla de descarte lleva un comentario de una línea explicando **qué falso positivo concreto evita** (`AGENTS.md` § Convenciones)
- [x] Cada regla de descarte tiene su propio caso en `test/fixtures/false-positive-traps/`, que es el contrato contra la regresión
- [x] **El fixture `false-positive-traps` cierra con cero findings.** Un solo finding ahí es el ticket sin cerrar
- [x] La normalización quita `./` inicial, `:línea` final, backticks residuales y puntuación final
- [x] La lista negra de palabras que parecen archivo pero no lo son (`node.js`, `next.js`, `nuxt.js`, `vue.js`, `d.ts` suelto) está cubierta
- [x] Ante la duda entre reportar y dejar pasar, la implementación deja pasar, y el test que lo fija dice explícitamente que ese es el comportamiento buscado

## Comments

**El fixture `false-positive-traps` cierra en cero findings.** Cubre las cuatro reglas de descarte con sus casos, más tres clases de trampa que no son reglas sino consecuencias del diseño: rutas dentro de bloques de código de ejemplo (no se escanean los fences), rutas en prosa sin backticks (no se escanea la prosa), y rutas que se escapan de la raíz del repo.

**Efecto medido sobre este repo.** Antes del ticket la corrida reportaba tres problemas, dos de ellos falsos:

```
✗ 23  .scratch/<feature>/issues/  ruta no existe     <- falso positivo
✗ 46  scripts/corpus.ts           ruta no existe     <- verdadero
✗ 70  .scratch/<feature>/         ruta no existe     <- falso positivo
```

Después:

```
✗ 46  scripts/corpus.ts  ruta no existe
```

Los dos falsos positivos eran placeholders `<feature>`, que ahora caen en la regla 2. El que queda es verdadero: `scripts/corpus.ts` lo crea el ticket 10.

**Hubo que resolver una contradicción de la spec para poder implementar la regla 3.** `SPEC.md` § 3 exige que una ruta contenga una barra; `ARCHITECTURE.md` regla 3 decía en un paréntesis que `` `foo.ts` `` suelto sí era una ruta. Gana SPEC, por ser la lectura con menos falsos positivos, y quedó registrado en **ADR-0003** porque es difícil de revertir una vez que existan snapshots del corpus. El paréntesis de `ARCHITECTURE.md` se corrigió.

El costo es un falso negativo real: un `` `tsconfig.json` `` que no existe en la raíz no se reporta. Es el intercambio que el proyecto declaró preferir.

**Un caso que descubrí escribiendo los tests:** la normalización puede dejar algo que ya no tiene forma de ruta. `` `a/b:1` `` normaliza a `a/b`, que no tiene extensión conocida ni empieza con marcador, así que se descarta con la razón `sin-forma-de-ruta`. La forma se evalúa **después** de normalizar, no antes.
