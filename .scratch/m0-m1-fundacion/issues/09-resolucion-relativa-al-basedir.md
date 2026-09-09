# 09: Resolución relativa al `baseDir` de cada fuente

**What to build:** un `CLAUDE.md` anidado habla de su propio directorio, no de la raíz. Un `packages/api/CLAUDE.md` que menciona `` `src/db.ts` `` se verifica contra `packages/api/src/db.ts`, y por lo tanto **no** se reporta cuando ese archivo existe. Sin esto, cualquier monorepo genera una avalancha de falsos positivos.

**Blocked by:** 05

**Status:** done

- [x] Cada claim de path se resuelve contra el `baseDir` de su fuente, según `docs/spec/SPEC.md` § 2
- [x] Las rutas que empiezan con `/` se tratan como relativas a la raíz del repo, no al sistema de archivos
- [x] Una ruta absoluta fuera del repo se descarta
- [x] Existe un fixture con `CLAUDE.md` anidados donde la misma cadena de texto es válida en un directorio e inválida en otro
- [x] El `file` de la salida JSON y de `pretty` sigue siendo relativo a la raíz del repo, no al `baseDir`

## Comments

Fixture `monorepo` con tres `CLAUDE.md` anidados, donde **la misma cadena** (`` `src/db.ts` ``) es cierta en `packages/api` y falsa en `packages/web`. Fixture `no-git` agregado también, que ejercita el fallback de glob.

**El fixture destapó un problema de precisión real en el scoring del ticket 07.** La sugerencia para `packages/web/src/db.ts` era `packages/api/src/db.ts` con **confianza 1 y `fixable: true`**, es decir: `--fix` habría reescrito el documento del paquete `web` para que apuntara a un archivo del paquete `api`. Un autofix equivocado.

La causa era que `parentSimilarity` medía solapamiento de segmentos **como conjunto**: `packages/web/src` y `packages/api/src` comparten dos de tres, así que daba 0.667. Pero el segmento que difiere es justo el que identifica al paquete. Se cambió a **prefijo común** — hasta dónde coinciden antes de divergir — que da 0.333 y deja la sugerencia en 0.6, no corregible. Los casos del ticket 07 siguen dando lo mismo.

Esto es lo que el fixture de monorepo estaba ahí para encontrar, y lo encontró.

**Una barra inicial es ambigua y se resuelve mirando el primer segmento.** `` `/src/index.ts` `` casi siempre significa "desde la raíz del repo", pero `` `/etc/hosts` `` o `` `/Users/alguien/notas.md` `` son rutas del filesystem de quien escribió el documento. Si el primer segmento existe en la raíz del repo, se verifica; si no, se deja pasar. El costo es un falso negativo (`/directorio-nuevo/x.ts` no se reporta); el beneficio es no reportar nunca la ruta absoluta de otra máquina, que sería ruido garantizado en cualquier documento escrito por una persona.

## Dos cosas que salieron mal y quedan anotadas

1. **El fixture de monorepo estuvo importado pero sin correr, y la suite quedó verde.** Prettier había reformateado el array del registro a varias líneas y mi edición no matcheó, así que el `import` entró y la entrada en el array no. Se cambió el registro a `test/fixtures/index.ts` con un test que compara la lista contra los archivos del directorio: un fixture que se olvide de registrar ahora hace fallar la suite.

2. **`no-git` fija un falso positivo conocido como comportamiento actual.** Un `generado/salida.js` que existe en disco pero está gitignoreado no entra al índice, así que se reporta como faltante. `SPEC.md` § 7 lo resuelve con `knownPaths`, que es M2. El fixture lo documenta como lo que hoy pasa, no como lo que debería pasar.
