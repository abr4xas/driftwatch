/**
 * The discovery corpus's clone: file **names** for the whole repository, file
 * **contents** for the handful of things driftwatch actually reads.
 *
 * This is the seam ticket `06` of
 * [`.scratch/corpus-adjudication-at-scale/`](../.scratch/corpus-adjudication-at-scale/spec.md)
 * asks for, and it exists because of one observation:
 * [`repo-index.ts`](../src/verify/repo-index.ts) builds its index from
 * `git ls-files`, which reads the **index**, not the working tree. A blobless
 * clone carries the full index at a fraction of the bytes, so the checkout can
 * be narrowed to the files something opens with `readFile` — the sources, the
 * manifests, the config and the `.gitignore`s — and nothing else.
 *
 * Measured over all 66 corpus repos at their pinned commits: **3479 MB → 182
 * MB**, 2.8 MB per repo against 52.7, a ratio of 19.1×. All 66 produce
 * byte-identical driftwatch conclusions against a full clone of the same
 * commit. At 2000 repos that projects to ~5.4 GB rather than ~103 GB.
 *
 * **This is not for the certification corpus.** `corpus.ts` keeps its full
 * shallow clones: it is 66 repos and 3.4 GB, which is nobody's problem, and
 * ADR-0007 governs it. A blobless clone is a *partial* clone, which can in
 * principle reach the network later to fill in a blob, and that property has no
 * business anywhere near a measurement.
 *
 * Usage:
 *   discovery-clone <owner/repo> <sha> <dir>   clone one repo into dir
 *   discovery-clone --verify <slug>            clone a corpus repo into
 *                                              test/discovery/repos/ and diff
 *                                              it against test/corpus/repos/
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { messageOf } from '../src/core/errors.ts'
import { RUNNERS } from '../src/verify/manifest.ts'

/**
 * Extensions whose **contents** get read, and why the list is this short.
 *
 * It is tempting to reason from `buildAnchorIndex`, which opens
 * `join(root, target)` without looking at the extension — and to conclude that
 * any file at all can be read, so the cone can never be complete. That
 * reasoning skips a step. The claims it iterates are `kind === 'link'`, and
 * [`links.ts`](../src/extract/links.ts) only emits those for a target matching
 * its own `MARKDOWN` pattern, `.md` and `.markdown`. Everything else stays a
 * `path` claim, which is resolved against the **index** and never opened.
 *
 * Checked rather than argued. Against a document linking with anchors into
 * `.ts`, `.mdx`, `.mdc`, `.html`, `.md` and `.markdown`, exactly two become
 * link claims: the `.md` and the `.markdown`. So `[x](src/app.ts#L10)` cannot
 * diverge between a full and a narrowed checkout, because nothing opens
 * `src/app.ts` in either.
 *
 * `.mdx` and `.mdc` are excluded from `MARKDOWN` **deliberately** — `links.ts`
 * explains that remark cannot see headings emitted by JSX components, so the
 * anchors collected would be a subset of the real ones and every link into the
 * rest would be a finding. That exclusion is load-bearing for this list too,
 * which is why the test derives it from `MARKDOWN` rather than restating it.
 *
 * `.mdc` is in the cone all the same, but as a **source**: `.cursor/rules/*.mdc`
 * is a context file driftwatch audits, and `discover.ts` reads it.
 */
const ANCHOR_TARGETS = ['md', 'markdown'] as const

/** Source extensions that are not anchor targets. `.mdc` is Cursor's rules. */
const SOURCE_EXTENSIONS = ['mdc'] as const

/**
 * The extensions `loadConfig` resolves, in `config.ts`'s own order.
 *
 * Not imported, because `config.ts` keeps them as whole filenames in a private
 * constant. `discovery-clone.test.ts` reads that constant out of the source and
 * asserts the cone admits every one, which is the next best thing.
 */
const CONFIG_EXTENSIONS = ['ts', 'js', 'json', 'yaml', 'yml'] as const

/**
 * The sparse cone: every path whose **contents** are read somewhere.
 *
 * Deriving it, rather than guessing, is the whole safety argument. Anything
 * outside the cone still appears in the index, so `path/missing` and
 * `link/broken` resolve against it exactly as before; what a missing pattern
 * costs is a file somebody calls `readFile` on, and the list of those is short
 * and knowable. Each entry below names where in `src/` the read happens.
 *
 * - **`ANCHOR_TARGETS` and `SOURCE_EXTENSIONS` anywhere** — `discover.ts:281`
 *   for the sources themselves, `anchor-index.ts:60` for the documents a
 *   link's anchor resolves against.
 * - **`.cursorrules` anywhere** — `discover.ts` matches it by exact basename,
 *   and having no extension it is reached by no wildcard.
 * - **Every filename in `RUNNERS`, anywhere** — `manifest.ts:206` for a
 *   runner's task list, `repo-index.ts:114` for a directory's `package.json`,
 *   `config.ts:235` for the `driftwatch` key in the root one.
 * - **`.gitignore` anywhere** — `repo-index.ts:101`, and `git check-ignore`
 *   needs the nested ones too: `wrangler-dist/` in workers-sdk and
 *   `.agents/skills/` in prisma are both nested, and they are the reason the
 *   ignore rule reaches each project's own names.
 * - **`driftwatch.config.*` at the root** — `config.ts:132` and `:173`.
 * - **`.claude/**`** whole, because it is small, it is the directory this tool
 *   is about, and a skill can carry files that are not markdown.
 *
 * `version.ts:29` also reads a `package.json`, but driftwatch's own rather than
 * the analysed repo's, so it is not the cone's business.
 *
 * Two of these were missing from the first draft and both were found by a repo
 * rather than by reading: ticket `06` § "Five defects found" records which,
 * and the lesson is the shape of the list above — derived from `RUNNERS` and
 * checked against `classifySource`, not written out by hand.
 *
 * Patterns are git's **non-cone** syntax — gitignore syntax, leading `/`
 * anchored at the root. Cone mode cannot express "every `.md` at any depth",
 * which is the one thing this needs, so `sparseClone` turns it off explicitly.
 */
export const CONE: readonly string[] = [
  // Every document an anchor can be resolved against, and the source
  // extensions that are not one.
  ...[...ANCHOR_TARGETS, ...SOURCE_EXTENSIONS].map((extension) => `/**/*.${extension}`),
  // The one source with no extension, matched by exact basename.
  '/**/.cursorrules',
  // Every manifest, taken from the table that decides which file answers for a
  // runner rather than copied out of it. `turso` lost a `script/missing`
  // finding to a hand-copied list that had fallen behind by one entry.
  ...new Set(
    Object.values(RUNNERS).flatMap((facts) => facts.filenames.map((name) => `/**/${name}`)),
  ),
  // Nested ones included: they are why the ignore rule reaches each project's
  // own names.
  '/**/.gitignore',
  ...CONFIG_EXTENSIONS.map((extension) => `/driftwatch.config.${extension}`),
  '/.claude/**',
]

/*
 * What the cone cannot promise.
 *
 * One case, not two. An earlier version of this comment claimed a second — a
 * link anchored at a file that is not a document, `[x](src/app.ts#L10)`, going
 * silent because `buildAnchorIndex` opens any target it is given. That is true
 * of `buildAnchorIndex` and false of the pipeline: the claims it iterates are
 * `kind === 'link'`, and `links.ts` only emits those for `.md` and `.markdown`.
 * A link into `src/app.ts` stays a `path` claim, which is answered from the
 * index. Nothing opens it in either clone, so nothing can diverge. See
 * `ANCHOR_TARGETS`.
 *
 * The case that is real: **a config that declares its own sources.** `sources`
 * can be arbitrary globs and a `configured` source is whatever they match, so
 * no static cone covers it. It fails the **loud** way — the path is in the
 * index, discovery finds it, and the read raises `ENOENT`. A repo that crashes
 * is dropped from the discovery corpus and noticed; a repo that silently
 * analysed half its sources would be neither.
 *
 * That is for the runner to survive, by recording the failure and moving on.
 * Not this module's job, and worth saying because the temptation is to make
 * `sparseClone` tolerant instead.
 */

/** The cone as `.git/info/sparse-checkout` wants it: one pattern per line. */
export function coneSpec(): string {
  return `${CONE.join('\n')}\n`
}

function git(args: readonly string[], cwd?: string): void {
  execFileSync('git', [...args], {
    cwd,
    stdio: ['ignore', 'ignore', 'inherit'],
    timeout: 10 * 60 * 1000,
  })
}

function gitOut(args: readonly string[]): string {
  return execFileSync('git', [...args], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  })
}

/**
 * Clones `repo` at `sha` into `dir`, carrying names for everything and contents
 * for the cone.
 *
 * **The remote stays.** The first version of this removed it, reasoning that a
 * partial clone fetches missing blobs lazily and that a read outside the cone
 * should fail loudly rather than quietly reach the network. That was right
 * about the hazard and wrong about the price:
 * [`originSlug`](../src/verify/git.ts) reads `remote.origin.url` to learn what
 * repository this is, and `context-prose.ts` uses it for `namesAnotherRepo` —
 * the rule that stops a document's references to *other* people's repos from
 * being read as claims about this one. With no remote, `origin` is `undefined`
 * and the rule silently stops firing.
 *
 * `saubakirov/KZ-IT-telegram-list` is the case that caught it: 262 claims
 * against the narrowed clone versus 260 against the full one, same sources byte
 * for byte, no difference in findings. Two extra claims is a small symptom of
 * exactly the kind of difference this seam exists to not have.
 *
 * The lazy-fetch hazard is handled where it belongs instead — the verifier runs
 * with the network refused, so a fetch fails the check rather than hiding in
 * it. See `refuseGitNetwork`.
 */
export function sparseClone(repo: string, sha: string, dir: string): void {
  if (existsSync(join(dir, '.git'))) rmSync(dir, { recursive: true, force: true })
  mkdirSync(dirname(dir), { recursive: true })

  git(['init', '-q', dir])
  git(['remote', 'add', 'origin', `https://github.com/${repo}.git`], dir)
  git(['config', 'core.sparseCheckout', 'true'], dir)
  // Explicitly off, not merely unset: `core.sparseCheckoutCone` is inheritable
  // from a user's global config, and under cone mode these patterns mean
  // something else entirely. The cone cannot express "every `.md` at any
  // depth", so inheriting it would narrow the checkout silently.
  git(['config', 'core.sparseCheckoutCone', 'false'], dir)
  writeFileSync(join(dir, '.git', 'info', 'sparse-checkout'), coneSpec())
  git(['fetch', '-q', '--depth', '1', '--filter=blob:none', 'origin', sha], dir)
  git(['checkout', '-q', 'FETCH_HEAD'], dir)
}

/**
 * Refuses every git transport for the rest of the process.
 *
 * `GIT_ALLOW_PROTOCOL` is git's own allow-list; naming a protocol nobody uses
 * refuses https, ssh and file alike. It has to be set **after** cloning and not
 * in the caller's environment, because the clone itself is a fetch — setting it
 * outside makes `--verify` fail at `git fetch` with status 128, which is how
 * the first version of this was written.
 *
 * What it is for is narrow but worth having. Reading a discovery clone cannot
 * trigger a lazy fetch through driftwatch itself: the tool opens files with
 * node's `readFile`, so a blob outside the cone is simply not on disk and the
 * read raises `ENOENT`. Only a `git` subprocess could reach the network, and
 * the two driftwatch runs — `check-ignore` and `remote get-url` — are both
 * local. This pins that: if either ever grew a network path, the verification
 * fails instead of quietly getting slower.
 */
function refuseGitNetwork(): void {
  process.env['GIT_ALLOW_PROTOCOL'] = 'none'
}

/** Every path the index carries, which is what `repo-index.ts` will see. */
function indexPaths(dir: string): string[] {
  return gitOut(['-C', dir, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'])
    .split('\0')
    .filter((entry) => entry.length > 0)
    .toSorted()
}

/**
 * The check the ticket asks for: does the narrowed clone see what the full one
 * sees?
 *
 * It compares the **index**, because the index is the only thing the tool
 * builds its answers from. A working tree that differs is the point of the
 * exercise; an index that differs is the failure that would turn every path
 * outside the cone into a false `path/missing`.
 */
export function compareIndex(
  fullDir: string,
  sparseDir: string,
): { full: number; sparse: number; missing: string[]; extra: string[] } {
  const full = indexPaths(fullDir)
  const sparse = indexPaths(sparseDir)
  const inSparse = new Set(sparse)
  const inFull = new Set(full)
  return {
    full: full.length,
    sparse: sparse.length,
    missing: full.filter((path) => !inSparse.has(path)),
    extra: sparse.filter((path) => !inFull.has(path)),
  }
}

/**
 * A run rendered for comparison: everything the tool concluded, and nothing
 * about where it ran.
 *
 * The index check below is necessary and not sufficient — `turso` had an
 * identical index and lost a `script/missing` finding, because the Makefile it
 * reads is content rather than a name. So the real check runs driftwatch over
 * both clones and diffs the conclusions.
 */
async function conclusionsOf(dir: string): Promise<string> {
  const { run } = await import('../src/run.ts')
  const result = await run({ cwd: dir, paths: [] })
  return JSON.stringify(
    {
      sources: result.sources.map((source) => `${source.path} ${source.kind}`).toSorted(),
      claims: result.claims,
      checks: [...result.checks].toSorted(),
      counts: result.counts,
      fixable: result.fixable,
      findings: result.findings
        .map(
          (f) =>
            `${f.claim.source.path}:${f.claim.range.line} ${f.check} ${f.claim.text} :: ${f.message}`,
        )
        .toSorted(),
    },
    null,
    2,
  )
}

/**
 * Resolves a corpus slug to the two directories the comparison needs, refusing
 * anything that would make the comparison meaningless.
 *
 * The sha check is the subtle one: a full clone left behind by an older pin
 * would otherwise be diffed against the current commit, and every difference
 * would be misread as a defect in the cone rather than as two different
 * repositories.
 */
async function resolveVerifyTargets(
  slug: string,
): Promise<{ repo: string; sha: string; fullDir: string; sparseDir: string } | string> {
  const { CORPUS, slugOf } = await import('./corpus-repos.ts')
  const entry = CORPUS.find((candidate) => slugOf(candidate.repo) === slug)
  if (entry === undefined) return `no corpus repo with slug ${slug}`

  const fullDir = join(import.meta.dirname, '..', 'test', 'corpus', 'repos', slug)
  if (!existsSync(fullDir)) {
    return `${slug} is not cloned; run pnpm corpus --only ${slug} first`
  }

  const head = gitOut(['-C', fullDir, 'rev-parse', 'HEAD']).trim()
  if (head !== entry.sha) {
    return (
      `${slug} is at ${head.slice(0, 8)}, not the pinned ${entry.sha.slice(0, 8)}; ` +
      `re-run pnpm corpus --only ${slug}`
    )
  }

  return {
    repo: entry.repo,
    sha: entry.sha,
    fullDir,
    sparseDir: join(import.meta.dirname, '..', 'test', 'discovery', 'repos', slug),
  }
}

/** Prints the first differing lines of two renderings, for a readable failure. */
function reportDifference(full: string, sparse: string): void {
  process.stdout.write('conclusions DIFFER\n')
  const fullLines = full.split('\n')
  const sparseLines = sparse.split('\n')
  for (let i = 0; i < Math.max(fullLines.length, sparseLines.length); i += 1) {
    if (fullLines[i] !== sparseLines[i]) {
      process.stdout.write(`  full   ${fullLines[i] ?? '(none)'}\n`)
      process.stdout.write(`  sparse ${sparseLines[i] ?? '(none)'}\n`)
    }
  }
}

/**
 * The check ticket `06` asks for, end to end: clone one corpus repo through the
 * cone and establish that driftwatch cannot tell the difference.
 *
 * Two comparisons, and both are needed. The index catches a narrowed listing,
 * which would turn every path outside the cone into a false `path/missing`. The
 * conclusions catch a missing *content* — `turso` had an identical index and
 * still lost a `script/missing` finding, because the Makefile it reads is not a
 * name.
 */
async function verifyAgainstCorpus(slug: string): Promise<number> {
  const targets = await resolveVerifyTargets(slug)
  if (typeof targets === 'string') {
    process.stderr.write(`${targets}\n`)
    return 2
  }

  process.stdout.write(`cloning ${targets.repo} at ${targets.sha.slice(0, 8)}\n`)
  try {
    sparseClone(targets.repo, targets.sha, targets.sparseDir)
  } catch (cause) {
    process.stderr.write(`could not clone ${targets.repo}: ${messageOf(cause)}\n`)
    return 2
  }

  const index = compareIndex(targets.fullDir, targets.sparseDir)
  process.stdout.write(`index: full ${index.full}, sparse ${index.sparse}\n`)
  if (index.missing.length > 0 || index.extra.length > 0) {
    for (const path of index.missing.slice(0, 20)) process.stdout.write(`  missing ${path}\n`)
    for (const path of index.extra.slice(0, 20)) process.stdout.write(`  extra   ${path}\n`)
    return 1
  }

  // Cloning is done; from here on a git subprocess that reaches the network is
  // a finding, not a convenience.
  refuseGitNetwork()
  const full = await conclusionsOf(targets.fullDir)
  const sparse = await conclusionsOf(targets.sparseDir)
  if (full !== sparse) {
    reportDifference(full, sparse)
    return 1
  }

  process.stdout.write('index identical, conclusions identical\n')
  return 0
}

async function main(argv: readonly string[]): Promise<number> {
  if (argv[0] === '--verify') {
    const slug = argv[1]
    if (slug === undefined) {
      process.stderr.write('usage: discovery-clone --verify <slug>\n')
      return 2
    }
    return verifyAgainstCorpus(slug)
  }

  const [repo, sha, dir] = argv
  if (repo === undefined || sha === undefined || dir === undefined) {
    process.stderr.write('usage: discovery-clone <owner/repo> <sha> <dir> | --verify <slug>\n')
    return 2
  }
  sparseClone(repo, sha, dir)
  return 0
}

if (process.argv[1] === import.meta.filename) {
  process.exitCode = await main(process.argv.slice(2))
}
