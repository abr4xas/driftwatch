/**
 * Replacing a file so that it is never seen half-written.
 *
 * `--fix` rewrites documents the user owns. A plain `writeFile` truncates first
 * and writes after, so a crash, a full disk or a Ctrl+C in between leaves a
 * `CLAUDE.md` cut in the middle — and the one way back, `git checkout`, only
 * exists if the file was committed. Writing beside it and renaming over it
 * means a reader sees the old bytes or the new ones, never a mix.
 */
import { randomBytes } from 'node:crypto'
import { realpath, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'

export async function replaceFile(path: string, content: string): Promise<void> {
  // Through the symlink, not over it: renaming onto the link itself would turn
  // a `CLAUDE.md -> AGENTS.md` into a regular file and quietly end the sharing.
  const target = await realpath(path)
  // The temporary file is created with the default mode; carry the original's
  // over, or an executable that happened to be audited stops being one.
  const { mode } = await stat(target)
  const temp = join(dirname(target), `.${basename(target)}.${randomBytes(6).toString('hex')}.tmp`)

  await writeFile(temp, content, { encoding: 'utf8', flag: 'wx', mode: mode & 0o7777 })
  try {
    await rename(temp, target)
  } catch (error) {
    await rm(temp, { force: true })
    throw error
  }
}
