# 09: Resolución relativa al `baseDir` de cada fuente

**What to build:** un `CLAUDE.md` anidado habla de su propio directorio, no de la raíz. Un `packages/api/CLAUDE.md` que menciona `` `src/db.ts` `` se verifica contra `packages/api/src/db.ts`, y por lo tanto **no** se reporta cuando ese archivo existe. Sin esto, cualquier monorepo genera una avalancha de falsos positivos.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] Cada claim de path se resuelve contra el `baseDir` de su fuente, según `docs/spec/SPEC.md` § 2
- [ ] Las rutas que empiezan con `/` se tratan como relativas a la raíz del repo, no al sistema de archivos
- [ ] Una ruta absoluta fuera del repo se descarta
- [ ] Existe un fixture con `CLAUDE.md` anidados donde la misma cadena de texto es válida en un directorio e inválida en otro
- [ ] El `file` de la salida JSON y de `pretty` sigue siendo relativo a la raíz del repo, no al `baseDir`
