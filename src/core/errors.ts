/**
 * Un problema atribuible a quien invoco la herramienta: un flag mal escrito, un
 * config invalido, una ruta que no existe. Se imprime como una linea y sale con
 * 2. Cualquier otra excepcion es un bug nuestro y se reporta como tal.
 */
export class UserError extends Error {
  /** Pista opcional de una linea: que hacer a continuacion. */
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
