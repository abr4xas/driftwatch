/**
 * `--init`: write a commented `driftwatch.config.ts` (`SPEC.md` § 4).
 *
 * It is a different command wearing a flag's clothes — it writes a new file
 * and then exits, without running the audit or sharing anything with `--fix`,
 * which rewrites ranges inside documents it has already parsed and verified.
 */
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { findConfig } from '../core/config.ts'
import { UserError } from '../core/errors.ts'

const CONFIG_FILENAME = 'driftwatch.config.ts'

/**
 * The file `--init` writes.
 *
 * **Only the keys that do something are live.** `sources` and `checks` reach
 * `src/run.ts`; `ignore`, `knownPaths` and `staleThreshold` are validated by
 * the loader and read by nobody, so they are commented out with the reason.
 * A template presenting all five as working config would be a document
 * claiming more than the code delivers, written by the tool that reports
 * exactly that.
 *
 * As it stands, with nothing uncommented, it is valid input to the loader it
 * documents: an empty `sources` and an empty `checks` both validate.
 *
 * The type is imported, not `defineConfig`. `defineConfig` is a value, so a
 * config using it does not load unless the package is in `node_modules` — and
 * the advertised way to run this tool is `npx`, which installs nothing in the
 * target repo. An `import type` is erased by the same type stripping that
 * loads the file, so the config works whether or not the package is installed,
 * and an editor that has it still gets completion.
 */
export const INIT_TEMPLATE = `import type { Config } from '@abr4xas/driftwatch'

const config: Config = {
  // Context files beyond the ones discovery finds on its own. Literal paths or
  // globs, matched against the files git lists, relative to the repo root.
  // An entry matching nothing is an error: a source that disappeared is drift.
  sources: [],

  // Severity per check: 'error' | 'warning' | 'off'. The ids are listed by
  // \`driftwatch --help\` and described in the guide.
  checks: {
    // 'path/missing': 'error',
    // 'dep/missing': 'off',
  },

  // The three keys below are in the specification and accepted by the loader,
  // but nothing reads them yet. They are commented out so this file does not
  // promise more than the tool does.

  // Excluded from discovery.
  // ignore: ['**/fixtures/**'],

  // Paths that are real but not on disk, such as build outputs.
  // knownPaths: ['dist/**', '.next/**'],

  // Days before a document counts as stale. Tier 2, so it lands with them.
  // staleThreshold: 15,
}

export default config
`

/**
 * Writes the template at the repo root, or refuses.
 *
 * The refusal covers every shape the loader looks for, not just the file about
 * to be written: dropping a `.ts` config next to a `.json` one creates the
 * two-configs-in-one-repo case `loadConfig` deliberately refuses to merge, and
 * the one that loses is the one it did not write.
 */
export async function writeInitConfig(root: string): Promise<string> {
  const existing = await findConfig(root)
  if (existing !== undefined) {
    throw new UserError(
      `a config already exists: ${existing.where}`,
      'remove it first, or edit it — --init never overwrites',
    )
  }

  const path = join(root, CONFIG_FILENAME)
  await writeFile(path, INIT_TEMPLATE, 'utf8')
  return CONFIG_FILENAME
}
