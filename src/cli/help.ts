/** El texto de --help. Es el contrato de SPEC.md § 4 escrito una sola vez. */
export const HELP = `driftwatch [paths...] [opciones]

Encuentra las afirmaciones de tus archivos de contexto de agente que ya no son ciertas.

Opciones
  --fix                  Aplica las correcciones inequívocas
  --json                 Salida JSON en stdout
  --format <fmt>         pretty | json | github | sarif   (default: pretty)
  --only <ids>           Solo estos checks (coma-separados, acepta prefijo: --only path)
  --skip <ids>           Excluye estos checks
  --strict               Los warnings cuentan como errores para el exit code
  --no-tier2             Desactiva todos los checks de tier 2
  --config <ruta>        Ruta explícita al config
  --no-config            Ignora cualquier config encontrado
  --quiet                Solo muestra problemas, sin resumen
  --watch                Re-ejecuta al cambiar cualquier fuente
  --init                 Escribe un driftwatch.config.ts comentado
  --version, -v          Imprime la versión
  --help, -h             Imprime esta ayuda

Exit codes
  0  Sin errores
  1  Se encontró al menos un error
  2  Fallo de la propia herramienta
`
