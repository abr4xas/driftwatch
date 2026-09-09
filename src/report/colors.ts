import pc from 'picocolors'

export type Colors = Pick<typeof pc, 'red' | 'yellow' | 'green' | 'dim' | 'bold'>

/**
 * SPEC.md § 5: colors are turned off if `NO_COLOR` is set or if stdout is not a
 * terminal. It is decided once and passed downwards, instead of every reporter
 * querying the environment.
 */
export function colorEnabled(env: NodeJS.ProcessEnv, isTty: boolean): boolean {
  const noColor = env.NO_COLOR
  if (noColor !== undefined && noColor !== '') return false
  return isTty
}

export function colorsFor(enabled: boolean): Colors {
  return pc.createColors(enabled)
}
