/** What exists so far: how many the list names, how many are cloned, how many ran. */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { slugOf } from '../corpus/repos.ts'
import { LIST, readList, REPOS_DIR, RESULTS } from './files.ts'
import { recorded } from './journal.ts'

export function statusMain(): number {
  const repos = readList()
  const cloned = existsSync(REPOS_DIR)
    ? repos.filter((repo) => existsSync(join(REPOS_DIR, slugOf(repo), '.git'))).length
    : 0
  // Recorded and succeeded are separated deliberately. A run that failed on
  // half the list and a run that audited it are the same number of recorded
  // repositories, and reporting only the total would let the second read as
  // the first.
  const done = recorded()
  const failed = existsSync(RESULTS)
    ? readFileSync(RESULTS, 'utf8')
        .split('\n')
        .filter((line) => line.includes('"ok":false')).length
    : 0
  process.stdout.write(
    `list:     ${repos.length} repos (${LIST})\n` +
      `cloned:   ${cloned}\n` +
      `recorded: ${done.size} (${RESULTS})\n` +
      `  failed: ${failed}\n`,
  )
  return 0
}
