/**
 * A context file git lists and the working tree does not have.
 *
 * Found by the discovery corpus on its 135th repository (ticket `13`):
 * `Rspoon3/Shotbot`'s `CLAUDE.md` is a symlink into a git **submodule** that
 * has not been initialised. Both entries are in the index, so `git ls-files`
 * lists the document, `discoverSources` finds it, and the read raises `ENOENT`.
 *
 * What driftwatch did with that was tell the user to file a bug report about
 * their own checkout — "internal failure … this is a driftwatch bug" — and
 * audit nothing at all, in a repository whose other sources were fine. Nothing
 * is broken in driftwatch here, and a plain `git clone` without
 * `--recurse-submodules` reproduces it, so it is not the sparse cone either.
 *
 * Rare and total: 1 unreadable source in 1070 across 201 repositories, costing
 * that one repository 100% of its output.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync, symlinkSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { run } from '../src/run.ts'
import { renderPretty } from '../src/report/pretty.ts'
import { renderJson } from '../src/report/json.ts'
import { renderSarif } from '../src/report/sarif.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

const roots: string[] = []

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

/**
 * A repo whose `CLAUDE.md` is in the index and not on disk.
 *
 * The submodule of the real case is reproduced by its effect rather than by a
 * submodule: a symlink to a path that does not exist is what an uninitialised
 * submodule leaves behind, and it is what `readFile` meets.
 */
function repoWithADanglingSource(): string {
  const root = makeTempRepo({
    files: {
      'AGENTS.md': 'See `src/present.ts` and `src/missing.ts`.\n',
      'src/present.ts': 'export const present = 1\n',
      'CLAUDE.md': 'placeholder, replaced below\n',
    },
  })
  roots.push(root)
  unlinkSync(join(root, 'CLAUDE.md'))
  symlinkSync('vendor/not-checked-out/CLAUDE.md', join(root, 'CLAUDE.md'))
  execFileSync('git', ['add', '-A'], { cwd: root })
  return root
}

describe('a source git lists but the working tree does not have', () => {
  it('does not stop the run, and the other sources are audited', async () => {
    // The whole point. Before this, one dangling symlink cost the repository
    // every answer it had: `src/missing.ts` went unreported because a
    // different file could not be opened.
    const result = await run({ cwd: repoWithADanglingSource(), paths: [] })
    expect(result.sources.map((source) => source.path)).toEqual(['AGENTS.md'])
    expect(result.findings.map((finding) => finding.claim.text)).toContain('src/missing.ts')
  })

  it('is recorded rather than passed over in silence', async () => {
    const result = await run({ cwd: repoWithADanglingSource(), paths: [] })
    expect(result.skipped).toEqual([{ path: 'CLAUDE.md', reason: 'dangling-symlink' }])
  })

  it('names the file and the likely cause in the pretty output', async () => {
    const result = await run({ cwd: repoWithADanglingSource(), paths: [] })
    const output = renderPretty(result, { color: false, quiet: false })
    // The message has to point at the checkout, because that is where the
    // problem is. Telling somebody to report a driftwatch bug sends them to
    // the one place the answer is not.
    expect(output).toContain('skipped CLAUDE.md: a symlink whose target is not in the working tree')
    expect(output).not.toContain('driftwatch bug')
  })

  it('separates a path that is simply not there from a link that dangles', async () => {
    // Only `lstat` can tell them apart, and only one of the two is checkable.
    // A path with no entry at all is an uninitialised submodule, a
    // `git rm --cached`, or a file deleted while the run was in flight — and
    // nothing here can say which, so the reason does not pretend to.
    const root = makeTempRepo({ files: { 'AGENTS.md': 'x\n', 'CLAUDE.md': 'y\n' } })
    roots.push(root)
    unlinkSync(join(root, 'CLAUDE.md'))

    const result = await run({ cwd: root, paths: [] })
    expect(result.skipped).toEqual([{ path: 'CLAUDE.md', reason: 'absent-from-worktree' }])
    expect(renderPretty(result, { color: false, quiet: false })).toContain(
      'skipped CLAUDE.md: listed by git, absent from the working tree',
    )
  })

  it('survives --quiet, which drops the summary and not this', async () => {
    const result = await run({ cwd: repoWithADanglingSource(), paths: [] })
    const quiet = renderPretty(result, { color: false, quiet: true })
    expect(quiet).toContain('skipped CLAUDE.md')
    expect(quiet).not.toContain('no drift')
  })

  it('says nothing about skipping when nothing was skipped', async () => {
    const root = makeTempRepo({ files: { 'AGENTS.md': 'Nothing to see.\n' } })
    roots.push(root)
    const result = await run({ cwd: root, paths: [] })
    expect(result.skipped).toEqual([])
    expect(renderPretty(result, { color: false, quiet: false })).not.toContain('skipped')
  })

  it('carries the skipped source in the JSON document', async () => {
    const result = await run({ cwd: repoWithADanglingSource(), paths: [] })
    const document: unknown = JSON.parse(renderJson(result, {}))
    const { summary, skipped } = document as {
      summary: { skipped: number }
      skipped: Array<{ path: string; reason: string }>
    }
    expect(summary.skipped).toBe(1)
    expect(skipped).toEqual([{ path: 'CLAUDE.md', reason: 'dangling-symlink' }])
  })

  it('carries the skipped source into SARIF, where Code Scanning reads it', async () => {
    // The format that feeds Code Scanning is the one place an incomplete
    // checkout would otherwise be an entirely silent green: no annotation, no
    // alert, no human looking at stdout.
    const result = await run({ cwd: repoWithADanglingSource(), paths: [] })
    const document: unknown = JSON.parse(renderSarif(result))
    const { runs } = document as {
      runs: Array<{
        invocations?: Array<{ toolExecutionNotifications: Array<{ message: { text: string } }> }>
      }>
    }
    const notifications = runs[0]?.invocations?.[0]?.toolExecutionNotifications ?? []
    expect(notifications).toHaveLength(1)
    expect(notifications[0]?.message.text).toContain('CLAUDE.md was not audited')
  })

  it('records nothing about the invocation when there was nothing to record', async () => {
    const root = makeTempRepo({ files: { 'AGENTS.md': 'Nothing to see.\n' } })
    roots.push(root)
    const document: unknown = JSON.parse(renderSarif(await run({ cwd: root, paths: [] })))
    expect((document as { runs: Array<Record<string, unknown>> }).runs[0]).not.toHaveProperty(
      'invocations',
    )
  })

  it('leaves the exit code to the findings, because this is neither drift nor a crash', async () => {
    // A repository whose every source is unreadable answers 0: the document
    // did not go stale, so it is not drift, and the tool did not break, so it
    // is not a tool failure. What stops it being a vacuous green is that the
    // skip is printed, which the test above pins.
    const root = makeTempRepo({ files: { 'CLAUDE.md': 'placeholder\n' } })
    roots.push(root)
    unlinkSync(join(root, 'CLAUDE.md'))
    symlinkSync('nowhere/CLAUDE.md', join(root, 'CLAUDE.md'))
    execFileSync('git', ['add', '-A'], { cwd: root })

    const result = await run({ cwd: root, paths: [] })
    expect(result.sources).toEqual([])
    expect(result.skipped).toHaveLength(1)
    expect(result.counts).toEqual({ errors: 0, warnings: 0 })
  })

  it('still fails loudly for a read that is not a missing file', async () => {
    // The narrow case is "listed and absent". A permission error, a directory
    // where a file was expected, an I/O fault: those are not facts about a
    // checkout the user can act on, and swallowing them would turn every
    // future read bug into a silent skip.
    const root = makeTempRepo({ files: { 'AGENTS.md': 'x\n' } })
    roots.push(root)
    // The index keeps `AGENTS.md`; the working tree gets a directory in its
    // place, so the read fails with EISDIR rather than ENOENT. No `git add`
    // after this, or git would notice and the file would leave the index.
    unlinkSync(join(root, 'AGENTS.md'))
    mkdirSync(join(root, 'AGENTS.md'))
    await expect(run({ cwd: root, paths: [] })).rejects.toThrow(/EISDIR|illegal operation/u)
  })
})
