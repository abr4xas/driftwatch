import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

export type TempRepoOptions = {
  /** A map of relative path to content. Directories are created as needed. */
  files: Record<string, string>
  /** When false, `git init` is not run: exercises the glob fallback. */
  git?: boolean
}

/**
 * Creates a mini-repo in a temporary directory. It is the basis of the
 * fixtures: a scenario is a file tree plus an expectation about the output.
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
