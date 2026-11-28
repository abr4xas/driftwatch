import pc from 'picocolors'

export type Colors = Pick<typeof pc, 'red' | 'yellow' | 'green' | 'cyan' | 'dim' | 'bold'>

/**
 * SPEC.md § 5: whether stdout gets colour, decided once and passed downwards
 * instead of every reporter querying the environment.
 *
 * Precedence, first match wins: a non-empty `NO_COLOR` turns it off;
 * `FORCE_COLOR` turns it on, unless it is `0` or `false`; `TERM=dumb` turns it
 * off; otherwise it follows whether stdout is a terminal.
 */
export function colorEnabled(env: NodeJS.ProcessEnv, isTty: boolean): boolean {
  const noColor = env.NO_COLOR
  if (noColor !== undefined && noColor !== '') return false
  const force = env.FORCE_COLOR
  if (force !== undefined) return force !== '0' && force !== 'false'
  if (env.TERM === 'dumb') return false
  return isTty
}

export function colorsFor(enabled: boolean): Colors {
  return pc.createColors(enabled)
}
