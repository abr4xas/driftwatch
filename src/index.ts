/**
 * API pública. Hoy expone solo lo que existe: los exit codes y el error de
 * usuario. `run()`, `defineConfig` y los tipos del pipeline se van a exportar
 * desde acá a medida que los tickets que los necesitan los introduzcan.
 */
export { EXIT, exitCodeFor, type Counts, type ExitCode } from './core/exit-codes.ts'
export { UserError } from './core/errors.ts'
