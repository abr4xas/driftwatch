# 07: Sugerencias por basename con scoring de confianza

**What to build:** cuando una ruta está rota, la herramienta no solo lo dice: propone el destino probable. La salida pasa de `ruta no existe` a `ruta no existe  → src/auth/index.ts?`, y cada sugerencia lleva una confianza que más adelante va a decidir qué puede tocar `--fix`.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] La búsqueda de candidatos parte de `byBasename`; la comparación difusa se corre solo sobre los candidatos de ese basename
- [ ] El scoring sigue `docs/spec/ARCHITECTURE.md`: 1.0 con candidato único y directorio padre similar, 0.6 con candidato único y directorio distinto, 0.3 con varios candidatos
- [ ] Con varios candidatos se reporta el problema pero la sugerencia se marca como no autofixable
- [ ] `suggestion` aparece en el modelo de `Finding` con `value`, `confidence` y `fixable`, aunque `--fix` sea M3
- [ ] La sugerencia se renderiza en `dim` y no rompe la alineación de columnas de la salida `pretty`
- [ ] Hay unit tests del scoring, que junto con el extractor de rutas es lo único que `docs/spec/ARCHITECTURE.md` § Testing pide cubrir a ese nivel
