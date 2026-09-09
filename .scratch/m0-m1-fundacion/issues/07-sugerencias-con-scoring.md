# 07: Sugerencias por basename con scoring de confianza

**What to build:** cuando una ruta está rota, la herramienta no solo lo dice: propone el destino probable. La salida pasa de `ruta no existe` a `ruta no existe  → src/auth/index.ts?`, y cada sugerencia lleva una confianza que más adelante va a decidir qué puede tocar `--fix`.

**Blocked by:** 05

**Status:** done, con dos huecos anotados

- [x] La búsqueda de candidatos parte de `byBasename`; la comparación difusa se corre solo sobre los candidatos de ese basename
- [x] El scoring sigue `docs/spec/ARCHITECTURE.md`: 1.0 con candidato único y directorio padre similar, 0.6 con candidato único y directorio distinto, 0.3 con varios candidatos
- [x] Con varios candidatos se reporta el problema pero la sugerencia se marca como no autofixable
- [x] `suggestion` aparece en el modelo de `Finding` con `value`, `confidence` y `fixable`, aunque `--fix` sea M3
- [x] La sugerencia se renderiza en `dim` y no rompe la alineación de columnas de la salida `pretty`
- [x] Hay unit tests del scoring, que junto con el extractor de rutas es lo único que `docs/spec/ARCHITECTURE.md` § Testing pide cubrir a ese nivel

## Comments

Salida real del fixture `suggestions`, que cubre los tres niveles de confianza:

```
CLAUDE.md
  ✗ 3  src/lib/auth.ts    ruta no existe  → src/auth/auth.ts?
  ✗ 5  src/seed.ts        ruta no existe  → scripts/db/seed.ts?
  ✗ 7  src/util/fecha.ts  ruta no existe  → paquetes/a/fecha.ts?

1 archivo · 3 problemas (3 errores) · 27ms
1 corregible con --fix
```

**El parecido entre directorios se mide por segmentos compartidos, no por distancia de edición.** Mover un archivo de `src/lib` a `src/auth` conserva un segmento, y esa es la señal que interesa; que las cadenas se parezcan letra a letra no dice nada útil sobre un movimiento de archivo. La distancia de edición sí se usa, pero en `script/missing` (M2), donde lo que se compara son nombres de script.

## Dos huecos, anotados en vez de tapados

1. **Un directorio faltante nunca recibe sugerencia.** `byBasename` indexa archivos, no directorios, así que `` `public/imagenes/` `` se reporta sin candidato. Cerrarlo significa cambiar el contrato de `RepoIndex`, que no es lo que este ticket pedía. Es una decisión para M3, cuando `--fix` defina qué necesita de verdad.

2. **El ejemplo del `BRIEF.md` no es alcanzable por búsqueda de basename.** El brief muestra `src/lib/auth.ts → src/auth/index.ts?`, que es un renombre *más* un movimiento: el basename cambia de `auth.ts` a `index.ts`, así que `byBasename` no lo encuentra nunca. `ARCHITECTURE.md` prescribe explícitamente la búsqueda por basename, y ampliarla a "un `index.*` dentro de un directorio con el nombre del archivo viejo" es una heurística nueva con riesgo propio de sugerencia equivocada, que además `--fix` aplicaría con confianza alta. No la inventé. Queda como observación: el ejemplo del brief es ilustrativo, no un caso que la implementación actual produzca.

### Nota posterior, al cerrar el ticket 09

El scoring de este ticket tenía un problema de precisión que el fixture de monorepo destapó. `parentSimilarity` medía solapamiento de segmentos como conjunto, y eso daba 0.667 para `packages/web/src` contra `packages/api/src`, con lo que la sugerencia salía con confianza 1 y `fixable: true`. `--fix` habría reescrito el documento de un paquete apuntando al archivo de otro.

Se cambió a prefijo común: hasta dónde coinciden los dos directorios antes de divergir. Los tres casos del fixture `suggestions` dan lo mismo que antes; el caso de monorepo baja a 0.333 y la sugerencia deja de ser corregible.
