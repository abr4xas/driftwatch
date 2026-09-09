/**
 * Los tres exit codes del contrato del CLI (SPEC.md § 4). Son parte de la API
 * pública: un pipeline de CI que distingue "encontré drift" de "la herramienta
 * se rompió" depende de que 1 y 2 no se confundan nunca.
 */
export const EXIT = {
  ok: 0,
  findings: 1,
  toolFailure: 2,
} as const

export type ExitCode = (typeof EXIT)[keyof typeof EXIT]

export type Counts = {
  errors: number
  warnings: number
}

export function exitCodeFor(counts: Counts, strict: boolean): ExitCode {
  const failing = strict ? counts.errors + counts.warnings : counts.errors
  return failing > 0 ? EXIT.findings : EXIT.ok
}
