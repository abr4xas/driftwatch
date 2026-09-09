/**
 * Un problema atribuible a quien invocó la herramienta: un flag mal escrito, un
 * config inválido, una ruta que no existe. Se imprime como una línea y sale con
 * 2. Cualquier otra excepción es un bug nuestro y se reporta como tal.
 */
export class UserError extends Error {
  /** Pista opcional de una línea: qué hacer a continuación. */
  readonly hint: string | undefined

  constructor(message: string, hint?: string) {
    super(message)
    this.name = 'UserError'
    this.hint = hint
  }
}

export function isUserError(value: unknown): value is UserError {
  return value instanceof UserError
}

/** El mensaje de algo que se lanzó, sea o no un Error. */
export function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause)
}

/** La propiedad `code` de un error de Node, si la tiene. */
export function codeOf(cause: unknown): string | undefined {
  if (typeof cause !== 'object' || cause === null || !('code' in cause)) return undefined
  return typeof cause.code === 'string' ? cause.code : undefined
}

/**
 * Un flag que el parser acepta porque está en el contrato de SPEC.md § 4, pero
 * cuyo comportamiento todavía no existe. Falla en vez de ignorarse en silencio:
 * un `--json` que promete un documento y devuelve 0 vacío es una mentira peor
 * que un error explícito.
 */
export function notYetImplemented(flag: string): UserError {
  return new UserError(
    `${flag} todavía no está implementado`,
    'llega en un milestone posterior; ver docs/spec/ROADMAP.md',
  )
}
