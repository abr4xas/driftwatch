# 04: `RepoIndex` con `git ls-files` y fallback a glob

**What to build:** la pieza de la que depende todo el presupuesto de performance. Se construye una sola vez por corrida y a partir de ahí cada verificación es una consulta en memoria. Se puede demostrar con un comando que imprime el tamaño del índice y el tiempo que tardó en construirse.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] `RepoIndex` tiene la forma de `docs/spec/ARCHITECTURE.md` § "El índice del repo": `files`, `dirs`, `byBasename`, `manifests`
- [ ] Se construye con `git ls-files` cuando hay repo, porque ya respeta los ignores y es más rápido
- [ ] Hay fallback a `tinyglobby` cuando no hay `.git`, honrando `.gitignore` a mano; cubierto por el fixture `no-git`
- [ ] Es una struct con funciones, no una clase (`AGENTS.md` § Convenciones)
- [ ] `byBasename` es un `Map` de arrays; la búsqueda difusa no se corre nunca sobre el índice completo
- [ ] Ninguna llamada a `fs.stat` en el camino caliente: las consultas son O(1)
- [ ] `manifests` mapea directorio a `package.json` parseado, resolviendo el más cercano hacia arriba para monorepos
- [ ] Hay un test de presupuesto: sobre un repo sintético de 5.000 archivos, la construcción del índice queda bajo 200 ms
