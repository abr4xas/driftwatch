import { describe, expect, it } from 'vitest'
import { EXIT } from '../src/core/exit-codes.ts'
import { main } from '../src/cli/main.ts'

const CWD = process.cwd()

/** La forma de un frame de stack: dos espacios, "at ", y algo con linea:columna. */
const STACK_FRAME = /\n\s+at .*:\d+:\d+/u

/** SPEC.md § 5: sin emojis. Los simbolos permitidos son solo tres. */
const EMOJI = /\p{Extended_Pictographic}/u

function capture() {
  const out: string[] = []
  const err: string[] = []
  return {
    io: {
      out: (s: string) => out.push(s),
      err: (s: string) => err.push(s),
      isTty: false,
      env: {} as NodeJS.ProcessEnv,
    },
    stdout: () => out.join(''),
    stderr: () => err.join(''),
  }
}

describe('main', () => {
  it('--help imprime el uso en stdout y sale con 0', async () => {
    const c = capture()
    await expect(main(['--help'], c.io, CWD)).resolves.toBe(EXIT.ok)
    expect(c.stdout()).toContain('driftwatch [paths...]')
    expect(c.stderr()).toBe('')
  })

  it('el texto de --help documenta cada flag de la especificacion', async () => {
    const c = capture()
    await main(['--help'], c.io, CWD)
    const help = c.stdout()
    for (const flag of [
      '--fix',
      '--json',
      '--format',
      '--only',
      '--skip',
      '--strict',
      '--no-tier2',
      '--config',
      '--no-config',
      '--quiet',
      '--watch',
      '--init',
      '--version',
      '--help',
    ]) {
      expect(help, `falta ${flag} en --help`).toContain(flag)
    }
  })

  it('--version imprime solo la version y sale con 0', async () => {
    const c = capture()
    await expect(main(['--version'], c.io, CWD)).resolves.toBe(EXIT.ok)
    expect(c.stdout().trim()).toMatch(/^\d+\.\d+\.\d+/u)
  })

  it('un flag desconocido sale con 2 y explica el problema sin stack trace', async () => {
    const c = capture()
    await expect(main(['--turbo'], c.io, CWD)).resolves.toBe(EXIT.toolFailure)
    expect(c.stderr()).toContain('--turbo')
    expect(c.stderr()).not.toMatch(STACK_FRAME)
    expect(c.stdout()).toBe('')
  })

  it('una ruta posicional inexistente sale con 2 y la nombra', async () => {
    const c = capture()
    await expect(main(['no-existe-este-archivo.md'], c.io, CWD)).resolves.toBe(EXIT.toolFailure)
    expect(c.stderr()).toContain('no-existe-este-archivo.md')
    expect(c.stderr()).not.toMatch(STACK_FRAME)
  })

  it('sin nada que reportar sale con 0', async () => {
    const c = capture()
    await expect(main([], c.io, CWD)).resolves.toBe(EXIT.ok)
  })

  it.each([
    ['--fix'],
    ['--watch'],
    ['--init'],
    ['--strict'],
    ['--no-tier2'],
    ['--only'],
    ['--skip'],
    ['--no-config'],
  ])('%s todavia no esta implementado y lo dice, en vez de ignorarse', async (flag) => {
    const c = capture()
    const argv = flag === '--only' || flag === '--skip' ? [flag, 'path'] : [flag]
    await expect(main(argv, c.io, CWD)).resolves.toBe(EXIT.toolFailure)
    expect(c.stderr()).toContain(flag)
    expect(c.stderr()).toContain('no esta implementado'.replace('esta', 'está'))
  })

  it('un formato distinto de pretty todavia no esta implementado', async () => {
    const c = capture()
    await expect(main(['--format', 'sarif'], c.io, CWD)).resolves.toBe(EXIT.toolFailure)
    expect(c.stderr()).toContain('sarif')
  })

  it('no hay emojis en ninguna salida', async () => {
    const c = capture()
    await main(['--help'], c.io, CWD)
    await main([], c.io, CWD)
    expect(c.stdout()).not.toMatch(EMOJI)
  })
})
