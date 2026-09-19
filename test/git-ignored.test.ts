/**
 * `gitIgnoredPaths` is the general answer to a whole class of false positive:
 * a path git ignores cannot be claimed to be missing, because the index cannot
 * know whether it exists. Every caller depends on it answering completely.
 *
 * It asks git in batches, and a batch is where the risk lives: one pathspec git
 * refuses can take the other 399 with it.
 */
import { execFileSync, execFile } from 'node:child_process'
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { gitIgnoredPaths } from '../src/verify/git.ts'

/** A repo with a `generated/` ignore rule and a symlinked directory. */
function repoWithSymlink(): string {
  const root = mkdtempSync(join(tmpdir(), 'driftwatch-git-'))
  writeFileSync(join(root, '.gitignore'), 'generated/\n', 'utf8')
  mkdirSync(join(root, 'real'), { recursive: true })
  writeFileSync(join(root, 'real', 'file.ts'), '', 'utf8')
  // `.agents/skills -> ../real`, the shape `emdash-cms/emdash` has.
  mkdirSync(join(root, '.agents'), { recursive: true })
  symlinkSync('../real', join(root, '.agents', 'skills'), 'dir')
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root })
  execFileSync('git', ['add', '-A'], { cwd: root })
  return root
}

describe('gitIgnoredPaths', () => {
  it('answers a plain batch', async () => {
    const root = repoWithSymlink()
    const ignored = await gitIgnoredPaths(root, ['generated/out.js', 'real/file.ts'])
    expect(ignored.has('generated/out.js')).toBe(true)
    expect(ignored.has('real/file.ts')).toBe(false)
  })

  it('does not lose the batch to one pathspec git refuses', async () => {
    // `git check-ignore` exits **128** on a pathspec that crosses a symlink and
    // writes nothing to stdout — for the whole invocation, not just that path.
    // Treating that like exit 1 ("none ignored") silently drops the suppression
    // for up to 400 paths, which is how `emdash` reported 18 findings for paths
    // its own `.gitignore` covers.
    const root = repoWithSymlink()
    const ignored = await gitIgnoredPaths(root, [
      '.agents/skills/__driftwatch_probe__',
      'generated/out.js',
    ])
    expect(ignored.has('generated/out.js')).toBe(true)
  })

  it('still reports nothing when genuinely nothing is ignored', async () => {
    // Exit 1 with empty stdout is the normal "no matches" answer and must not
    // be mistaken for a failure worth retrying.
    const root = repoWithSymlink()
    expect((await gitIgnoredPaths(root, ['real/file.ts'])).size).toBe(0)
  })

  it('survives a refused pathspec among many', async () => {
    const root = repoWithSymlink()
    const many = Array.from({ length: 60 }, (_, i) => `generated/out-${i}.js`)
    const ignored = await gitIgnoredPaths(root, [
      ...many.slice(0, 30),
      '.agents/skills/__driftwatch_probe__',
      ...many.slice(30),
    ])
    expect(ignored.size).toBe(60)
  })
})
