/**
 * The acquisition runner: the half that was missing between tickets `02` and
 * `06`.
 *
 * `02` established that repositories can be enumerated — one code search facet
 * yields ~780 unique repos per minute of rate limit, so two thousand is a
 * matter of minutes. `06` built the clone that fits them on a laptop, 2.8 MB
 * per repo against 52.7. Nobody wrote the part in between, and until it exists
 * the discovery corpus is two solved problems with nothing joining them.
 *
 * Three stages, each resumable on its own, because they fail for unrelated
 * reasons: enumeration runs out of rate limit, cloning runs out of network or
 * disk, and a run dies on one repository at a time.
 *
 *   pnpm discovery enumerate [--target N]   fill test/discovery/repos.txt
 *   pnpm discovery clone     [--limit N]    sparse-clone what the list names
 *   pnpm discovery run       [--limit N]    audit each clone, record the result
 *   pnpm discovery discards  [--limit N]    what the extractor threw away (`07`)
 *   pnpm discovery sample    [--sample N]   n of each rule's discards, to read
 *   pnpm discovery families  [--dry-run]    one observation per template (`17`)
 *   pnpm discovery filter    [--dry-run]    the acquisition filter's two judgements
 *   pnpm discovery scope     [--family F]   what a gate rules over (`27`)
 *   pnpm discovery diff --before A --after B   what a rule change moved
 *   pnpm discovery status                   what exists so far
 *
 * **Nothing here is a measurement.** Ticket `09` § "What it must not do" and
 * the [spec](../.scratch/corpus-adjudication-at-scale/spec.md) § "The hard
 * limit" say it in one rule: no number computed over the discovery corpus is a
 * precision, none of it enters `CLASSIFICATION.md`, and none of it moves a
 * condition of ADR-0006. What comes out is material to read — classes of
 * finding and classes of discard — and the rule that a person then writes is
 * measured the way every rule in this project is measured, against the 66 repos
 * that carry human rulings.
 *
 * It does not touch `corpus.ts` either. The certification corpus keeps its full
 * shallow clones and its pinned shas, and is governed by ADR-0007.
 *
 * **Exercised end to end 2026-09-19**, and what that produced is written down
 * in ticket `09` rather than here. The rule above is a rule about where numbers
 * may live, and a count of findings over the discovery corpus pinned into
 * permanent source is the first step towards being quoted as one — a file that
 * states the rule and then breaks it four lines later teaches the wrong half.
 * What belongs here is what the **runner** costs, because that is a fact about
 * this code:
 *
 * - Enumeration: 2486 repositories from 26 pages of code search, a few minutes
 *   of rate limit, and the facets overlap by almost nothing. Every page of 100
 *   hits contributed 77 to 100 repositories the list did not have. `02`'s
 *   784-unique-per-1000 figure was one facet exhausted over ten pages, where a
 *   repository repeats *within* a facet; across facets the `size:` bands are as
 *   disjoint at the repository level as at the file level.
 * - Cloning, over the first 135: mean 1.74 MB per repository, median ~0.6 MB,
 *   one at 11.6 MB. None failed to clone. One failed to audit, and it turned
 *   out to be a defect in driftwatch rather than in the runner — ticket `13`.
 */
import { messageOf } from '../../src/core/errors.ts'
import { countFlag, stringFlag } from '../lib/argv.ts'
import { cloneMain } from './clone.ts'
import { enumerateMain } from './enumerate.ts'
import { runMain } from './run.ts'
import { statusMain } from './status.ts'

async function main(argv: readonly string[]): Promise<number> {
  const [command] = argv
  switch (command) {
    case 'enumerate':
      return enumerateMain(countFlag(argv, '--target') ?? 2000)
    case 'clone':
      return cloneMain(countFlag(argv, '--limit'))
    case 'run':
      return runMain(countFlag(argv, '--limit'))
    case 'discards': {
      // Imported on demand, like `run.ts` below: `enumerate` and `clone` have
      // no use for the analyser and they are what a long session spends its
      // time in.
      const { discardsMain } = await import('./discards.ts')
      return discardsMain(countFlag(argv, '--limit'))
    }
    case 'findings': {
      const { findingsMain } = await import('../jev/findings.ts')
      return findingsMain(
        countFlag(argv, '--per-block') ?? 60,
        countFlag(argv, '--per-repo') ?? 2,
        countFlag(argv, '--concurrency') ?? 10,
        argv.includes('--dry-run'),
        countFlag(argv, '--blocks') ?? 3,
      )
    }
    case 'claims': {
      const { claimsMain } = await import('../jev/claims.ts')
      return claimsMain(
        stringFlag(argv, '--cause') ?? 'bare-word',
        countFlag(argv, '--sample') ?? 800,
        countFlag(argv, '--per-repo') ?? 2,
        countFlag(argv, '--concurrency') ?? 8,
        argv.includes('--dry-run'),
      )
    }
    case 'table': {
      const { tableMain } = await import('./discards.ts')
      return tableMain()
    }
    case 'sample': {
      const { sampleMain } = await import('./discards.ts')
      return sampleMain(countFlag(argv, '--sample') ?? 20)
    }
    case 'diff': {
      const before = stringFlag(argv, '--before')
      const after = stringFlag(argv, '--after')
      if (before === undefined || after === undefined) {
        process.stderr.write('diff wants --before and --after, each a results.jsonl\n')
        return 2
      }
      const { diffMain } = await import('./diff.ts')
      return diffMain(before, after)
    }
    case 'scope': {
      const { scopeMain } = await import('../jev/scope.ts')
      const family = stringFlag(argv, '--family') ?? 'both'
      if (family !== 'both' && family !== 'sentence' && family !== 'section') {
        process.stderr.write(`--family takes sentence, section or both; got ${family}\n`)
        return 2
      }
      return scopeMain(
        family,
        countFlag(argv, '--per-marker') ?? 120,
        countFlag(argv, '--per-repo') ?? 2,
        countFlag(argv, '--concurrency') ?? 8,
        argv.includes('--dry-run'),
      )
    }
    case 'filter': {
      const { filterMain } = await import('../jev/filter.ts')
      return filterMain(
        countFlag(argv, '--limit'),
        argv.includes('--dry-run'),
        countFlag(argv, '--concurrency') ?? 8,
      )
    }
    case 'families': {
      const { familiesMain } = await import('../jev/families.ts')
      return familiesMain(
        countFlag(argv, '--limit'),
        argv.includes('--dry-run'),
        countFlag(argv, '--sample'),
        countFlag(argv, '--concurrency') ?? 8,
      )
    }
    case 'status':
    case undefined:
      return statusMain()
    default:
      process.stderr.write(
        'usage: discovery <enumerate|clone|run|discards|table|claims|findings|sample|families|filter|scope|diff|status>\n',
      )
      return 2
  }
}

if (process.argv[1] === import.meta.filename) {
  try {
    process.exitCode = await main(process.argv.slice(2))
  } catch (cause) {
    process.stderr.write(`${messageOf(cause)}\n`)
    process.exitCode = 2
  }
}
