import type { Check } from '../check.ts'
import { pathMissing } from './path-missing.ts'

/**
 * Registro estatico de checks. ARCHITECTURE.md § Extensibilidad: sin carga
 * dinamica de plugins en v1, asi que agregar un check es agregar un archivo al
 * lado y una entrada aca.
 */
export const CHECKS: readonly Check[] = [pathMissing]

export const CHECK_IDS: readonly string[] = CHECKS.map((check) => check.id)
