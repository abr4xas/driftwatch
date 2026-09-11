/**
 * What tasks each directory offers, per runner.
 *
 * Built once per run, before verification, for the same reason
 * `anchor-index.ts` is: `Check.run` is synchronous, and a check that reads from
 * disk on the hot path is how the 500 ms budget of `SPEC.md` § 9 dies.
 *
 * `package.json` costs nothing here — `repo-index.ts` already parsed every one
 * of them while walking the tree. The Makefiles and the Deno configs are read
 * from disk, and only when some claim names their runner: a repo full of
 * Makefiles that nobody's context file mentions is not read at all.
 */
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Claim, ScriptRunner } from '../core/types.ts'
import { scriptFactOf } from '../extract/scripts.ts'
import type { RepoIndex } from './repo-index.ts'

export type TaskFile = {
  /** Path relative to the root. It is what the message names. */
  path: string
  tasks: ReadonlySet<string>
  /**
   * Whether the task set is the whole truth. `package.json#scripts` and
   * `deno.json#tasks` are objects, so it always is; a Makefile is a program and
   * often is not.
   */
  enumerable: boolean
}

/** runner -> directory relative to the root -> the file that directory holds. */
export type TaskIndex = ReadonlyMap<ScriptRunner, ReadonlyMap<string, TaskFile>>

/**
 * What a runner reads and what it calls the thing it runs.
 *
 * One record per runner rather than three tables keyed on the same name: the
 * filenames, the lookup order and the noun a message uses all change together
 * when a runner is added.
 *
 * `lookup` is where `deno` differs: `deno task` runs `package.json` scripts
 * too, so its answer is the union of both files rather than the Deno config
 * alone.
 */
type RunnerFacts = {
  /** The filenames it reads, in the order the runner itself resolves them. */
  filenames: readonly string[]
  /** Every file kind it would consult, nearest first. */
  lookup: readonly ScriptRunner[]
  /** What it calls a task, so a message reads like the runner's own docs. */
  noun: string
}

export const RUNNERS: Readonly<Record<ScriptRunner, RunnerFacts>> = {
  package: { filenames: ['package.json'], lookup: ['package'], noun: 'script' },
  make: {
    filenames: ['Makefile', 'makefile', 'GNUmakefile'],
    lookup: ['make'],
    noun: 'target',
  },
  deno: {
    filenames: ['deno.json', 'deno.jsonc'],
    lookup: ['deno', 'package'],
    noun: 'task',
  },
}

/**
 * A rule's target list: one or more names, then a single or double colon that
 * is not an assignment. `FOO := gcc` and `FOO ?= -O2` are variables, and the
 * lookahead is what keeps them out.
 */
const RULE = /^([^\s:#=][^:#=]*)::?(?!=)/u

/** A line whose targets are somewhere we did not read, or are computed. */
const INCLUDE = /^\s*-?(?:s?include)\s/u
const COMPUTED = /[%$]/u

/**
 * The targets a Makefile declares.
 *
 * A Makefile is a program, not a table, so the honest answer is often "I
 * cannot enumerate this". Both refusals below are false positive classes: with
 * an `include`, the target the document names may be perfectly real and living
 * in another file; with a pattern rule, the set of valid targets is not the set
 * of literal names written down.
 */
export function readMakefile(content: string): { tasks: Set<string>; enumerable: boolean } {
  const tasks = new Set<string>()
  let enumerable = true

  for (const line of content.split('\n')) {
    // A recipe is what a tab introduces, and it holds arbitrary shell: a `scp
    // host:/tmp` in it is not a rule.
    if (line.startsWith('\t')) continue
    if (INCLUDE.test(line)) {
      enumerable = false
      continue
    }

    const match = RULE.exec(line)
    if (match === null) continue
    const left = match[1] ?? ''
    if (COMPUTED.test(left)) {
      enumerable = false
      continue
    }

    for (const name of left.trim().split(/\s+/u)) {
      // A special target (`.PHONY`, `.DEFAULT_GOAL`) is not something a reader
      // invokes, but `.PHONY`'s prerequisites are exactly the target names.
      if (!name.startsWith('.')) {
        tasks.add(name)
        continue
      }
      if (name !== '.PHONY') continue
      const prerequisites = line.slice(line.indexOf(':') + 1).trim()
      if (COMPUTED.test(prerequisites)) {
        enumerable = false
        continue
      }
      for (const phony of prerequisites.split(/\s+/u)) {
        if (phony !== '') tasks.add(phony)
      }
    }
  }

  return { tasks, enumerable }
}

/** The tasks a Deno config declares. A config we cannot parse is not an empty one. */
function readDenoConfig(content: string): { tasks: Set<string>; enumerable: boolean } {
  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    // `deno.jsonc` allows comments, which `JSON.parse` does not. Stripping them
    // by hand is a parser we would get wrong; saying "I cannot enumerate this"
    // costs a detection and cannot produce a finding.
    return { tasks: new Set(), enumerable: false }
  }
  if (typeof parsed !== 'object' || parsed === null) return { tasks: new Set(), enumerable: false }
  const tasks = (parsed as Record<string, unknown>).tasks
  if (typeof tasks !== 'object' || tasks === null) return { tasks: new Set(), enumerable: true }
  return { tasks: new Set(Object.keys(tasks)), enumerable: true }
}

/** The runners some claim actually names. Nothing else is read. */
function runnersIn(claims: readonly Claim[]): Set<ScriptRunner> {
  const runners = new Set<ScriptRunner>()
  for (const claim of claims) {
    if (claim.kind !== 'script') continue
    const fact = scriptFactOf(claim)
    if (fact !== undefined) runners.add(fact.runner)
  }
  return runners
}

/** The directories holding one of a runner's files, from the index. */
function directoriesWith(index: RepoIndex, filenames: readonly string[]): Map<string, string> {
  const found = new Map<string, string>()
  for (const filename of filenames) {
    for (const path of index.byBasename.get(filename) ?? []) {
      const slash = path.lastIndexOf('/')
      const dir = slash === -1 ? '' : path.slice(0, slash)
      // The first filename in the list wins, the way the runner itself resolves.
      if (!found.has(dir)) found.set(dir, path)
    }
  }
  return found
}

export async function buildTaskIndex(
  root: string,
  index: RepoIndex,
  claims: readonly Claim[],
): Promise<TaskIndex> {
  const wanted = runnersIn(claims)
  const built = new Map<ScriptRunner, ReadonlyMap<string, TaskFile>>()

  if (wanted.has('package') || wanted.has('deno')) {
    // Free: `repo-index.ts` parsed these while walking the tree.
    built.set(
      'package',
      new Map(
        [...index.manifests].map(([dir, manifest]) => [
          dir,
          {
            path: dir === '' ? 'package.json' : `${dir}/package.json`,
            tasks: new Set(Object.keys(manifest.scripts)),
            enumerable: true,
          },
        ]),
      ),
    )
  }

  for (const runner of ['make', 'deno'] as const) {
    if (!wanted.has(runner)) continue
    const files = directoriesWith(index, RUNNERS[runner].filenames)
    const read = runner === 'make' ? readMakefile : readDenoConfig
    const entries = await Promise.all(
      [...files].map(async ([dir, path]): Promise<[string, TaskFile] | undefined> => {
        let content: string
        try {
          content = await readFile(join(root, path), 'utf8')
        } catch {
          // Listed by git but unreadable: left out entirely, which the check
          // reads as "nothing to verify against".
          return undefined
        }
        const { tasks, enumerable } = read(content)
        return [dir, { path, tasks, enumerable }]
      }),
    )
    built.set(runner, new Map(entries.filter((entry) => entry !== undefined)))
  }

  return built
}

/** The nearest file of one kind, walking up from `dir`. */
function nearestOfKind(tasks: TaskIndex, kind: ScriptRunner, dir: string): TaskFile | undefined {
  let current = dir
  while (true) {
    const found = tasks.get(kind)?.get(current)
    if (found !== undefined) return found
    if (current === '') return undefined
    const slash = current.lastIndexOf('/')
    current = slash === -1 ? '' : current.slice(0, slash)
  }
}

/**
 * Every file the runner would consult from `dir`, nearest first — one per kind
 * in its lookup order.
 *
 * It is what makes a monorepo work, and the first entry is what a message
 * names: the file the reader is going to open. For `deno` there can be two,
 * because `deno task` runs `package.json` scripts as well, and both halves have
 * to be one namespace here too — otherwise a near-miss of a `package.json`
 * script would be reported without the suggestion that names it.
 */
export function nearestTaskFiles(tasks: TaskIndex, runner: ScriptRunner, dir: string): TaskFile[] {
  const found: TaskFile[] = []
  for (const kind of RUNNERS[runner].lookup) {
    const file = nearestOfKind(tasks, kind, dir)
    if (file !== undefined) found.push(file)
  }
  return found
}

/**
 * Whether the script exists in **any** of the runner's files.
 *
 * Not just the nearest one, and that is [ADR-0005](../../docs/adr/0005-a-path-that-exists-somewhere-is-not-drift.md)
 * applied to scripts: something that exists somewhere in the repo is not
 * drift. A monorepo's `packages/api/CLAUDE.md` saying `pnpm test` with the
 * script defined at the root is the same situation as a path written from the
 * root, it is just as common, and reporting it is the false positive that gets
 * a tool uninstalled. What it gives up is a script that moved between
 * packages, which is the loss ADR-0005 already accepted.
 *
 * Enumerability is **not** answered here, but on the nearest file alone (see
 * the check). A nested `Makefile` we cannot read through says nothing about the
 * targets available where the document is written, and letting it silence the
 * whole repo would mean one `include` line anywhere turns the check off.
 */
export function hasTaskAnywhere(tasks: TaskIndex, runner: ScriptRunner, script: string): boolean {
  for (const kind of RUNNERS[runner].lookup) {
    for (const file of tasks.get(kind)?.values() ?? []) {
      if (file.tasks.has(script)) return true
    }
  }
  return false
}
