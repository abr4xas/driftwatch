import pc from 'picocolors'

export type Colors = Pick<typeof pc, 'red' | 'yellow' | 'green' | 'dim' | 'bold'>

/**
 * SPEC.md § 5: los colores se apagan si `NO_COLOR` esta seteado o si stdout no
 * es una terminal. Se decide una vez y se pasa hacia abajo, en vez de que cada
 * reporter consulte el entorno.
 */
export function colorEnabled(env: NodeJS.ProcessEnv, isTty: boolean): boolean {
  const noColor = env.NO_COLOR
  if (noColor !== undefined && noColor !== '') return false
  return isTty
}

export function colorsFor(enabled: boolean): Colors {
  return pc.createColors(enabled)
}
