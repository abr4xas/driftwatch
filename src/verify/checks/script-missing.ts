import { scriptFactOf } from '../../extract/scripts.ts'
import { suggestScript } from '../../fix/suggest.ts'
import type { Check } from '../check.ts'
import { hasTaskAnywhere, nearestTaskFiles, RUNNERS } from '../manifest.ts'

/**
 * `SPEC.md` § 3: a package manager command whose script does not exist.
 *
 * Everything ambiguous has already been dropped by the extractor, which refuses
 * to guess which token is a script name. What is left here are two refusals of
 * a different kind, and both are about the manifest rather than the command:
 *
 * - **No manifest means silence.** With no `package.json`, `Makefile` or
 *   `deno.json` anywhere there is nothing to verify against, the same way
 *   `link/broken` says nothing about a target that does not exist.
 * - **The script only has to exist somewhere**, not in the nearest manifest.
 *   `manifest.ts` § `hasTaskAnywhere` has the argument: it is ADR-0005 applied
 *   to scripts. The nearest manifest is still what the message names and where
 *   the suggestion comes from, because it is the file the reader will open.
 * - **A manifest whose tasks cannot be enumerated answers nothing.** A Makefile
 *   with an `include`, or a `deno.jsonc` we could not parse: the target the
 *   document names may be perfectly real and living where we did not look.
 */
export const scriptMissing: Check = {
  id: 'script/missing',
  tier: 1,
  defaultSeverity: 'error',
  claimKinds: ['script'],

  run(claim, ctx) {
    const fact = scriptFactOf(claim)
    if (fact === undefined) return null

    const nearest = nearestTaskFiles(ctx.tasks, fact.runner, claim.source.baseDir)
    const primary = nearest[0]
    if (primary === undefined) return null
    if (!nearest.every((file) => file.enumerable)) return null
    if (hasTaskAnywhere(ctx.tasks, fact.runner, fact.script)) return null

    // The candidates come from every file the runner would consult, not just
    // the first: for `deno task` the tasks and the package scripts are one
    // namespace, and a suggestion drawn from half of it names the wrong thing.
    const available = nearest.flatMap((file) => [...file.tasks])
    const suggestion = suggestScript(available, fact, claim.text)
    return {
      claim,
      // The manifest is named by its path, not its basename: in a monorepo
      // `script not in packages/api/package.json` says which of the four the
      // reader has to open, and at the root the two read the same.
      message: `${RUNNERS[fact.runner].noun} not in ${primary.path}`,
      ...(suggestion === undefined ? {} : { suggestion }),
    }
  },
}
