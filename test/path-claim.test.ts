import { describe, expect, it } from 'vitest'
import type { Claim, Source } from '../src/core/types.ts'
import type { CheckContext } from '../src/verify/check.ts'
import { verifyPathClaim, type PathVerdict } from '../src/verify/path-claim.ts'
import type { RepoIndex } from '../src/verify/repo-index.ts'

function group(paths: readonly string[]): Map<string, string[]> {
  const out = new Map<string, string[]>()
  for (const path of paths) {
    const basename = path.slice(path.lastIndexOf('/') + 1)
    out.set(basename, [...(out.get(basename) ?? []), path])
  }
  return out
}

/**
 * A repo index built by hand. The whole point of the module under test is that
 * every rule it composes is answered from the index and from the git set, so
 * the matrix below needs no temporary directory and no clone.
 */
function indexOf(
  files: readonly string[],
  dirs: readonly string[] = [],
  packages: readonly string[] = [],
): RepoIndex {
  const allDirs = new Set(dirs)
  for (const file of files) {
    const segments = file.split('/')
    for (let i = 1; i < segments.length; i += 1) allDirs.add(segments.slice(0, i).join('/'))
  }
  return {
    root: '/repo',
    files: new Set(files),
    dirs: allDirs,
    byBasename: group(files),
    dirsByBasename: group([...allDirs]),
    manifests: new Map(
      packages.map((name, i) => [`packages/p${i}`, { dir: `packages/p${i}`, name, scripts: {} }]),
    ),
    listing: 'git',
  }
}

function contextOf(index: RepoIndex, ignoredByGit: readonly string[] = []): CheckContext {
  return { index, ignoredByGit: new Set(ignoredByGit), anchors: new Map(), tasks: new Map() }
}

function claimOf(text: string, baseDir = ''): Claim {
  const source: Source = {
    path: baseDir === '' ? 'AGENTS.md' : `${baseDir}/AGENTS.md`,
    absPath: `/repo/${baseDir === '' ? '' : `${baseDir}/`}AGENTS.md`,
    kind: 'agents-md',
    content: '',
    baseDir,
    aliases: [],
  }
  return {
    kind: 'path',
    source,
    text,
    raw: text,
    range: { line: 1, column: 1, endLine: 1, endColumn: 1 },
    offset: [0, 0],
    context: 'inline-code',
  }
}

/** Every rule that can decline the question, as one table. */
const MATRIX: readonly {
  name: string
  claim: Claim
  index: RepoIndex
  ignored?: readonly string[]
  expected: PathVerdict
}[] = [
  {
    name: 'a path that escapes above the root',
    claim: claimOf('../../elsewhere/x.ts'),
    index: indexOf([]),
    expected: { kind: 'unanswerable', rule: 'escapes-root' },
  },
  {
    name: 'an absolute path whose first segment is not in the repo',
    claim: claimOf('/Users/someone/notes.md'),
    index: indexOf(['src/x.ts']),
    expected: { kind: 'unanswerable', rule: 'outside-repo' },
  },
  {
    name: "another assistant's root, in a repo that does not use it",
    claim: claimOf('.cursor/rules/x.mdc'),
    index: indexOf(['src/x.ts']),
    expected: { kind: 'unanswerable', rule: 'absent-tool' },
  },
  {
    name: 'a path through a directory whose contents are generated',
    claim: claimOf('node_modules/x/index.js'),
    index: indexOf(['src/x.ts']),
    expected: { kind: 'unanswerable', rule: 'generated' },
  },
  {
    /**
     * Ticket `21`. React Router's typegen writes `+types/` next to every route
     * module and nothing tracks it — not in `remix-run/react-router` itself,
     * and not in any of the three discovery repositories that mention it. It
     * is the same category as `.react-router`, `.next` and `.astro`, which the
     * list already carries: a framework's generated output, named in context
     * files because that is where the types come from.
     */
    name: 'a path through a framework directory written by codegen',
    claim: claimOf('app/routes/+types/home.ts'),
    index: indexOf(['app/routes/home.tsx']),
    expected: { kind: 'unanswerable', rule: 'generated' },
  },
  {
    name: 'a path git ignores',
    claim: claimOf('reports/latest.html'),
    index: indexOf(['src/x.ts']),
    ignored: ['reports/latest.html'],
    expected: { kind: 'unanswerable', rule: 'ignored-by-git' },
  },
  {
    name: 'a directory whose contents git ignores',
    claim: claimOf('scripts/pr-status/'),
    index: indexOf(['src/x.ts']),
    ignored: ['scripts/pr-status/__driftwatch_probe__'],
    expected: { kind: 'unanswerable', rule: 'ignored-by-git' },
  },
  {
    name: 'a path written relative to a directory the prose named',
    claim: claimOf('src/cli/next-dev.ts'),
    index: indexOf(['packages/next/src/cli/next-dev.ts']),
    expected: { kind: 'unanswerable', rule: 'exists-as-suffix' },
  },
  {
    name: 'a path that is there',
    claim: claimOf('src/x.ts'),
    index: indexOf(['src/x.ts']),
    expected: { kind: 'satisfied' },
  },
  {
    name: 'a nested source writing from the root',
    claim: claimOf('src/x.ts', 'packages/api'),
    index: indexOf(['src/x.ts']),
    expected: { kind: 'satisfied' },
  },
  {
    name: 'a nested source writing from its own directory',
    claim: claimOf('src/x.ts', 'packages/api'),
    index: indexOf(['packages/api/src/x.ts']),
    expected: { kind: 'satisfied' },
  },
  {
    name: 'a path that is nowhere, in no shape',
    claim: claimOf('src/nope.ts'),
    index: indexOf(['src/x.ts']),
    expected: { kind: 'missing', local: 'src/nope.ts' },
  },
]

describe('the verdict on a path claim', () => {
  for (const row of MATRIX) {
    it(row.name, () => {
      expect(verifyPathClaim(row.claim, contextOf(row.index, row.ignored ?? []))).toEqual(
        row.expected,
      )
    })
  }
})

describe('the order the rules are asked in', () => {
  /**
   * A generated directory that also exists in the index still declines: the
   * suppression is asked before the existence, so a tracked `dist/` does not
   * turn the rule off for the paths under it that are not tracked.
   */
  it('the generated rule is asked before the index', () => {
    const verdict = verifyPathClaim(
      claimOf('node_modules/x/index.js'),
      contextOf(indexOf(['node_modules/x/index.js'])),
    )
    expect(verdict).toEqual({ kind: 'unanswerable', rule: 'generated' })
  })
})

/**
 * A path whose first segment is the name of a package **in this repo** is a
 * package specifier, not a path from the repo root.
 *
 * Real case (remix-run/react-router), sixteen findings in one skill, which
 * states the convention itself:
 *
 *     When this skill references `react-router/docs/...`, read the matching
 *     file under `node_modules/react-router/docs/`. If the installed version
 *     does not include local docs, use the repo `docs/` directory
 *
 * That sentence is one of the sixteen.
 */
describe('a path prefixed with a package name', () => {
  const INDEX = indexOf(
    ['docs/start/modes.md', 'packages/react-router/package.json'],
    [],
    ['react-router'],
  )

  it('declines a claim whose first segment names a package in the repo', () => {
    expect(verifyPathClaim(claimOf('react-router/docs/start/modes.md'), contextOf(INDEX))).toEqual({
      kind: 'unanswerable',
      rule: 'package-specifier',
    })
  })

  it('still answers when the first segment is a real top-level directory', () => {
    // The gate is absence, as in `belongsToAbsentTool`. A repo with a package
    // called `docs` *and* a `docs/` directory is talking about the directory,
    // and a file missing from it is drift like any other.
    const index = indexOf(['docs/start/modes.md'], [], ['docs'])
    expect(verifyPathClaim(claimOf('docs/gone.md'), contextOf(index))).toEqual({
      kind: 'missing',
      local: 'docs/gone.md',
    })
  })

  it('leaves a path alone when no package carries that name', () => {
    expect(verifyPathClaim(claimOf('other-pkg/docs/x.md'), contextOf(INDEX))).toEqual({
      kind: 'missing',
      local: 'other-pkg/docs/x.md',
    })
  })

  it('does not fire on a single segment, which is not a path anyway', () => {
    // `bare-word` discards these before they reach here (ADR-0003), and the
    // index answers this one as a suffix of `packages/react-router`. What
    // matters is that *this* rule is not the one declining.
    const verdict = verifyPathClaim(claimOf('react-router'), contextOf(INDEX))
    expect(verdict.kind === 'unanswerable' && verdict.rule).not.toBe('package-specifier')
  })
})
