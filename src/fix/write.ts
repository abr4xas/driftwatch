/**
 * The only module in `src/fix/` that touches the disk.
 *
 * Everything upstream of it is pure — `range.ts` decides what may be replaced,
 * `apply.ts` decides what the file becomes — so the writing is the one step
 * that cannot be undone, and it is three lines with its own file so that is
 * obvious.
 */
import { realpathSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { applyPlan, type FixPlan } from './apply.ts'

/** One source written, with every path that now holds the new content. */
export type FixWrite = {
  plan: FixPlan
  /** The audited path first, then the aliases that were separate files. */
  paths: readonly string[]
}

/**
 * The alias paths that are really a second file.
 *
 * `Source.aliases` holds two different things. A byte-identical `CLAUDE.md`
 * next to an `AGENTS.md` is a second file and has to be written, or the two
 * stop being copies and the user silently loses the fact the reporter told them
 * they had. A symlink alias is the *same* file under another name, and writing
 * through it would rewrite bytes that are already correct.
 *
 * They are told apart by `realpath`, which is how `collapseSymlinks` decided
 * they were aliases in the first place.
 */
function separateFiles(root: string, plan: FixPlan): string[] {
  let real: string
  try {
    real = realpathSync(plan.source.absPath)
  } catch {
    // Unreadable now, having been read a moment ago. Write the audited path
    // and nothing else: guessing about the rest is not worth a write.
    return []
  }

  return plan.source.aliases.filter((alias) => {
    try {
      return realpathSync(join(root, alias)) !== real
    } catch {
      return false
    }
  })
}

/**
 * Applies every plan, one write per file.
 *
 * A source with no plan is not written at all — not even to identical bytes.
 * Touching a file's mtime for nothing makes every watcher in the user's editor
 * fire, and `planFixes` has already dropped the edits that would change
 * nothing.
 */
export async function writePlans(
  root: string,
  plans: readonly FixPlan[],
): Promise<readonly FixWrite[]> {
  const writes: FixWrite[] = []

  for (const plan of plans) {
    const content = applyPlan(plan)
    const paths = [plan.source.path, ...separateFiles(root, plan)]
    await Promise.all(paths.map((path) => writeFile(join(root, path), content, 'utf8')))
    writes.push({ plan, paths })
  }

  return writes
}
