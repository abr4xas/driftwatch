import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

export type TempRepoOptions = {
  /** Mapa de ruta relativa a contenido. Los directorios se crean solos. */
  files: Record<string, string>
  /** Si es false, no se corre `git init`: ejercita el fallback a glob. */
  git?: boolean
}

/**
 * Crea un mini-repo en un directorio temporal. Es la base de los fixtures: un
 * escenario es un arbol de archivos mas una expectativa sobre la salida.
 */
export function makeTempRepo({ files, git = true }: TempRepoOptions): string {
  const root = mkdtempSync(join(tmpdir(), 'driftwatch-'))
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel)
    mkdirSync(dirname(abs), { recursive: true })
    writeFileSync(abs, content, 'utf8')
  }
  if (git) {
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root })
    execFileSync('git', ['add', '-A'], { cwd: root })
  }
  return root
}
