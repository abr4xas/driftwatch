# 04: `RepoIndex` con `git ls-files` y fallback a glob

**What to build:** la pieza de la que depende todo el presupuesto de performance. Se construye una sola vez por corrida y a partir de ahí cada verificación es una consulta en memoria. Se puede demostrar con un comando que imprime el tamaño del índice y el tiempo que tardó en construirse.

**Blocked by:** 01

**Status:** done

- [x] `RepoIndex` tiene la forma de `docs/spec/ARCHITECTURE.md` § "El índice del repo": `files`, `dirs`, `byBasename`, `manifests`
- [x] Se construye con `git ls-files` cuando hay repo, porque ya respeta los ignores y es más rápido
- [x] Hay fallback a `tinyglobby` cuando no hay `.git`, honrando `.gitignore` a mano; cubierto por el fixture `no-git`
- [x] Es una struct con funciones, no una clase (`AGENTS.md` § Convenciones)
- [x] `byBasename` es un `Map` de arrays; la búsqueda difusa no se corre nunca sobre el índice completo
- [x] Ninguna llamada a `fs.stat` en el camino caliente: las consultas son O(1)
- [x] `manifests` mapea directorio a `package.json` parseado, resolviendo el más cercano hacia arriba para monorepos
- [x] Hay un test de presupuesto: sobre un repo sintético de 5.000 archivos, la construcción del índice queda bajo 200 ms

## Comments

Se trabajó antes del 02 aunque tenga número mayor: los dos estaban desbloqueados por el 01, y hacer el descubrimiento de fuentes primero habría significado escribir un recorrido de archivos que este ticket reemplaza.

Dos cosas que cambiaron respecto de lo planeado:

- **`buildRepoIndex` es asíncrona.** La primera versión era sincrónica y cargaba `tinyglobby` e `ignore` con `require()`. Los tests pasaban porque vitest lo transforma, pero el bundle ESM habría fallado en tiempo de ejecución. El import dinámico obliga a `async` y es lo que "ESM puro" de `AGENTS.md` pide de verdad.
- **Se agregó la dependencia `ignore`.** El fallback sin git tiene que aplicar `.gitignore` a mano, y escribir un matcher propio de gitignore es exactamente la clase de heurística que genera los falsos positivos que el proyecto no puede permitirse. Se carga solo en el camino sin git, que en cualquier repo real está frío, así que no toca el presupuesto de arranque.

`NEVER_WALK` se aplica con git y sin git, no solo como patrón de glob: un repo puede tener `dist/` commiteado y aun así su contenido no es una fuente.
