import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)

/** Cuantas rutas se pasan por invocacion, para no rozar el limite de argv. */
const BATCH = 400

/**
 * Cuales de estas rutas ignoraria git.
 *
 * Es la respuesta general a una clase entera de falso positivo: si git ignora
 * una ruta, el indice no puede saber si existe, asi que afirmar que falta es
 * inventar. Cubre `dist/` y `node_modules/`, pero tambien los nombres propios
 * de cada proyecto: `wrangler-dist/` en workers-sdk, `scripts/pr-status/` en
 * next.js, `.agents/skills/` en prisma. Ninguna lista escrita a mano llega a
 * eso; el `.gitignore` del repo si, incluidos los anidados.
 *
 * Solo se pregunta por las rutas que algun check va a consultar, que son unas
 * decenas por corrida.
 */
export async function gitIgnoredPaths(
  root: string,
  paths: readonly string[],
): Promise<ReadonlySet<string>> {
  const ignored = new Set<string>()
  if (paths.length === 0) return ignored

  for (let i = 0; i < paths.length; i += BATCH) {
    const batch = paths.slice(i, i + BATCH)
    let stdout: string
    try {
      // `-n` para que no haga falta que la ruta exista, que es justo el caso.
      // `check-ignore` sale con 1 cuando no matchea nada, asi que el catch
      // cubre tanto "ninguna ignorada" como "no hay git".
      const result = await run('git', ['-C', root, 'check-ignore', '-n', '-v', '--', ...batch], {
        maxBuffer: 16 * 1024 * 1024,
        encoding: 'utf8',
      })
      stdout = result.stdout
    } catch (cause) {
      // Salida 1 con stdout vacio es "ninguna ignorada", no un fallo.
      const partial = (cause as { stdout?: string }).stdout
      if (typeof partial !== 'string' || partial.length === 0) continue
      stdout = partial
    }

    for (const line of stdout.split('\n')) {
      // Formato de -v: `<fuente>:<linea>:<patron>\t<ruta>`. Sin patron, `::`.
      const tab = line.lastIndexOf('\t')
      if (tab === -1) continue
      if (line.slice(0, tab) === '::') continue
      ignored.add(line.slice(tab + 1))
    }
  }

  return ignored
}

/**
 * `owner/repo` del remoto `origin`, o `undefined` si no hay.
 *
 * Sirve para una sola cosa: saber cuando un documento esta hablando de **otro**
 * repositorio. Un `AGENTS.md` que dice "estas skills viven en
 * [prisma/ignite](https://github.com/prisma/ignite) (`skills/.pilot/`)" no
 * afirma que `skills/.pilot/` exista aca.
 */
export async function originSlug(root: string): Promise<string | undefined> {
  try {
    const { stdout } = await run('git', ['-C', root, 'remote', 'get-url', 'origin'], {
      encoding: 'utf8',
    })
    const match = /[/:]([^/:]+\/[^/]+?)(?:\.git)?\s*$/u.exec(stdout.trim())
    return match?.[1]?.toLowerCase()
  } catch {
    return undefined
  }
}
