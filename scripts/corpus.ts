/**
 * The corpus of real repos.
 *
 * A green fixture proves nothing about false positives: we wrote it, with the
 * traps we already know exist. The corpus runs the tool over context files
 * other people wrote, without knowing driftwatch exists, and stores the output
 * as a snapshot.
 *
 * The snapshot **does not claim to be correct**. It claims not to change
 * without intent. Every diff is reviewed by hand, and that review is the only
 * real precision-regression signal the project has.
 *
 * Usage:
 *   pnpm corpus                    clone what is missing and rewrite snapshots
 *   pnpm corpus --check            fail if a snapshot differs from the stored one
 *   pnpm corpus --only <pattern>   only the repos matching the pattern
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { run } from '../src/run.ts'

type CorpusRepo = {
  repo: string
  /**
   * Validation set. These repos were added **after** tuning the heuristics, and
   * were not looked at to derive any rule. Their false positive rate is the
   * only honest out-of-sample precision estimate: the calibration group's
   * number is contaminated by having been the material the rules were written
   * against.
   *
   * ADR-0006 condition 9: if the findings or the discards of a repo in this
   * group are **inspected**, that repo moves to calibration and a new one has
   * to be added here. Classifying its findings is the measurement and does not
   * contaminate; opening the repo to see what the tool discarded does.
   */
  holdout?: boolean
  /**
   * Pinned commit. Without pinning, the snapshot would change every time the
   * upstream repo moves, and the diff would stop meaning "driftwatch changed".
   */
  sha: string
}

/**
 * Public repos with real `AGENTS.md` or `CLAUDE.md` files, verified by hand.
 *
 * There are 34: 26 calibration and 8 validation, which is what ADR-0006
 * condition 8 requires.
 *
 * Cloning them all costs ~2.7 GB, so the list is kept deliberately short and
 * new additions are chosen small. `oven-sh/bun` and `supabase/supabase` have
 * good context files but add ~1.5 GB between them, and are not needed. If they
 * are added, warn about the size before starting the download.
 *
 * With `--only <pattern>` a subset runs without re-cloning the rest.
 */
const CORPUS: readonly CorpusRepo[] = [
  { repo: 'openai/codex', sha: '73a1148c9c775c2a4616ce5096291740a00ed68a' },
  { repo: 'sst/opencode', sha: '830d5eb5354874105cc31599635a80c1662609e8' },
  { repo: 'cloudflare/workers-sdk', sha: 'a549e58af707e84d6aeddaadc6566103ae236dbb' },
  { repo: 'vercel/next.js', sha: '59b76e42ba93e5323484283ee5d1b81176c83d2d' },
  { repo: 'withastro/astro', sha: 'de5cc2d54e92d8746959e39fee1a8f0b4ddfe4bf' },
  { repo: 'browserbase/stagehand', sha: '9f4f878e99ac82cd35480a7dd841dfe3dbb78093' },
  { repo: 'calcom/cal.com', sha: 'b3321936c347744a759e0f36a9793bb78c9bca78' },
  { repo: 'prisma/prisma', sha: 'a51922e3252a2a9d94a00d11b9f9e9008f5ddf74' },
  { repo: 'BerriAI/litellm', sha: '47b15ffb677902fc4550a4471b82e09f77ec77d7' },
  { repo: 'langchain-ai/langchain', sha: 'f092c9a78b3c532ef4c01935c0d4514209ff9f96' },
  { repo: 'remix-run/react-router', sha: 'a05ad5bbda1759d0adfbde13fd17eaca4c86db42' },
  { repo: 'modelcontextprotocol/servers', sha: 'd73f99efbfd40c3aa1b61e88728b3d49fb52608f' },
  { repo: 'block/goose', sha: 'e84de9fe08eb27cd42eca022c2bf59e13baed39e' },

  // These were validation in the first round. Their two findings were reviewed
  // and the uppercase-placeholder rule came out of them, so they became
  // calibration material: they can no longer measure out-of-sample precision.
  { repo: 'microsoft/playwright-mcp', sha: '8a13ef8e9f7385a0f89477922127f31cbfde9761' },
  { repo: 'anthropics/anthropic-sdk-typescript', sha: 'ba14b1f4fdf2e840a7b32297965342a099f6201d' },
  { repo: 'github/spec-kit', sha: '4dd2402ea6d644ee655b78213a1f6d679fc88b0b' },
  { repo: 'unjs/nitro', sha: '3b8980bb824e8552053426243a4755a71a44b377' },
  { repo: 'colinhacks/zod', sha: '36f17960d1defca5d0896d9424f4e1059fbbf081' },

  // These were validation in the second round. The possessive-filler-name rule
  // and the create-instruction rule came out of one of their findings, so they
  // moved to calibration too.
  { repo: 'charmbracelet/crush', sha: 'aee8760458b9b7eaeb58655aee150e3ffef21cd0' },
  { repo: 'tursodatabase/turso', sha: '85e234697d687d4482b693483ac13fb6c93ae99d' },
  { repo: 'sveltejs/svelte', sha: 'ce89035ecbf88ee131838527d29584b968d450fb' },

  // These were validation in the fourth round. Their discards were inspected to
  // understand why the group came out silent, and the prose-window correction
  // came out of that. By ADR-0006 condition 9 that contaminates them:
  // inspecting is contaminating, even when the resulting change favours
  // reporting more rather than reporting less.
  { repo: 'jina-ai/reader', sha: '1574bfd380d249c86c82db4dace0d9c8fe17e2b1' },
  { repo: 'simonw/llm', sha: '1df47ddcac20d58726a993949da8ef84f4081085' },
  { repo: 'cyanheads/git-mcp-server', sha: 'd34d83af201dc0c9012ca501336c3df6171da932' },
  { repo: 'unjs/h3', sha: 'aa50e96a4a3da1732aa54542c498b37e0f8e3508' },

  // This was validation in the fifth round. Its only finding,
  // `test_action_EventNameHere.py`, was a CamelCase placeholder, and the
  // PLACEHOLDER_CAMEL rule came out of it. By condition 9, it moves to
  // calibration.
  //
  // The measurement it produced, 3 true out of 4 findings = 75%, stands as the
  // last valid out-of-sample precision measurement for this group. It is not
  // replaced by the number it would give now: that would be a measurement taken
  // on the very sample that decided the fix.
  { repo: 'browser-use/browser-use', sha: '2b1f9d377999a59fe7627c1a5aa88c12aa42e11f' },

  // --- Validation: never inspected ---
  // Eight repos, which is what ADR-0006 condition 8 requires. They are chosen
  // small on purpose, because the full corpus already weighs ~2.7 GB of clones,
  // and they are cloned only when a measurement is needed:
  // `pnpm corpus --only <pattern>`.
  { repo: 'vitest-dev/vitest', sha: 'c119be016295b45a005e2a36367ea7d133b4f385', holdout: true },
  {
    repo: 'rust-lang/rust-analyzer',
    sha: 'f3120321073d8046795c6824976be8b0ae92c999',
    holdout: true,
  },
  { repo: 'nuxt/nuxt', sha: '03e9df01a1256d214ac5c5c14514f95803ecb244', holdout: true },
  { repo: 'openai/openai-node', sha: 'b4168065d3839b3008d557fdbb8972da2e247f24', holdout: true },
  {
    repo: 'modelcontextprotocol/typescript-sdk',
    sha: '5119ee7fd7790e335a3fb60ef36f85334e2a6326',
    holdout: true,
  },
  {
    repo: 'modelcontextprotocol/python-sdk',
    sha: '9972c21aa42054fb1450c5fc614761ed11847ec6',
    holdout: true,
  },
  { repo: 'openai/openai-python', sha: 'f348ec87b934c98889102668913e0a3ae7fc303d', holdout: true },
  { repo: 'railwayapp/cli', sha: 'dee356855b6a88ed52cb3fac42956da7a9200474', holdout: true },
]

const HERE = dirname(fileURLToPath(import.meta.url))
const CORPUS_DIR = join(HERE, '..', 'test', 'corpus')
const REPOS_DIR = join(CORPUS_DIR, 'repos')
const SNAPSHOTS_DIR = join(CORPUS_DIR, 'snapshots')

function slugOf(repo: string): string {
  return repo.replace('/', '__')
}

function git(args: readonly string[], cwd?: string): void {
  execFileSync('git', [...args], {
    cwd,
    stdio: ['ignore', 'ignore', 'inherit'],
    timeout: 10 * 60 * 1000,
  })
}

/**
 * Shallow-clones and parks on the pinned commit. If the directory is already
 * there and points at the right sha, it is left alone: the corpus is cloned
 * once and is a local cache afterwards.
 */
function ensureClone({ repo, sha }: CorpusRepo): string {
  const dir = join(REPOS_DIR, slugOf(repo))

  if (existsSync(join(dir, '.git'))) {
    const head = execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim()
    if (head === sha) return dir
    // The pin changed: redo it, because a shallow clone cannot navigate.
    rmSync(dir, { recursive: true, force: true })
  }

  mkdirSync(dirname(dir), { recursive: true })
  git(['init', '-q', dir])
  git(['remote', 'add', 'origin', `https://github.com/${repo}.git`], dir)
  git(['fetch', '-q', '--depth', '1', 'origin', sha], dir)
  git(['checkout', '-q', 'FETCH_HEAD'], dir)
  return dir
}

/** Stable, diffable rendering of a run. */
async function snapshotOf(repo: string, dir: string): Promise<string> {
  const result = await run({ cwd: dir, paths: [] })
  const lines: string[] = [
    `# ${repo}`,
    '',
    `sources: ${result.sources.length}`,
    `errors: ${result.counts.errors}`,
    `warnings: ${result.counts.warnings}`,
    `fixable: ${result.fixable}`,
    '',
    '## sources',
    ...result.sources.map((source) => `${source.kind}  ${source.path}`),
    '',
    '## findings',
  ]

  if (result.findings.length === 0) {
    lines.push('(none)')
  } else {
    for (const finding of result.findings) {
      const { source, range, text, context } = finding.claim
      const suggestion =
        finding.suggestion === undefined
          ? ''
          : `  -> ${finding.suggestion.value} (${finding.suggestion.confidence}${
              finding.suggestion.fixable ? ', fixable' : ''
            })`
      lines.push(
        `${source.path}:${range.line}:${range.column}  [${finding.check}] ${context}  ${text}${suggestion}`,
      )
    }
  }

  // Time does not enter the snapshot: it changes on every run and says nothing
  // about precision.
  return `${lines.join('\n')}\n`
}

/** `--only <pattern>`: run only the repos whose name contains the pattern. */
function onlyPattern(argv: readonly string[]): string | undefined {
  const at = argv.indexOf('--only')
  return at === -1 ? undefined : argv[at + 1]
}

async function main(): Promise<number> {
  const check = process.argv.includes('--check')
  const only = onlyPattern(process.argv)
  mkdirSync(SNAPSHOTS_DIR, { recursive: true })

  let differing = 0
  let totalFindings = 0
  let totalSources = 0
  let holdoutFindings = 0

  for (const entry of CORPUS) {
    // With --only the rest are skipped without touching their snapshot, so a
    // new repo can be added without re-cloning the whole corpus.
    if (only !== undefined && !entry.repo.includes(only)) continue
    process.stderr.write(`${entry.repo}${entry.holdout === true ? ' [validation]' : ''} ... `)
    let dir: string
    try {
      dir = ensureClone(entry)
    } catch {
      process.stderr.write('could not clone, skipping\n')
      continue
    }

    const snapshot = await snapshotOf(entry.repo, dir)
    const path = join(SNAPSHOTS_DIR, `${slugOf(entry.repo)}.txt`)

    const findings = snapshot.split('\n## findings\n')[1] ?? ''
    const n = findings.trim() === '(none)' ? 0 : findings.trim().split('\n').length
    totalFindings += n
    if (entry.holdout === true) holdoutFindings += n
    totalSources += Number(/sources: (\d+)/u.exec(snapshot)?.[1] ?? 0)

    if (check) {
      const previous = existsSync(path) ? readFileSync(path, 'utf8') : ''
      if (previous !== snapshot) {
        differing += 1
        process.stderr.write('CHANGED\n')
      } else {
        process.stderr.write(`ok (${n})\n`)
      }
      continue
    }

    writeFileSync(path, snapshot, 'utf8')
    process.stderr.write(`${n} findings\n`)
  }

  const snapshotCount = existsSync(SNAPSHOTS_DIR)
    ? readdirSync(SNAPSHOTS_DIR).filter((name) => name.endsWith('.txt')).length
    : 0

  process.stderr.write(
    `\n${snapshotCount} repos · ${totalSources} sources · ${totalFindings} findings\n` +
      `  calibration: ${totalFindings - holdoutFindings} · validation: ${holdoutFindings}\n`,
  )

  if (check && differing > 0) {
    process.stderr.write(
      `\n${differing} snapshot(s) changed. Review the diff by hand before accepting it:\n` +
        `that diff is the only real precision-regression signal.\n`,
    )
    return 1
  }
  return 0
}

process.exit(await main())
