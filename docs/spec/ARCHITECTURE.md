# driftwatch — Architecture

## Ordering principle

The pipeline is linear and every stage has a narrow data boundary:

```
discover  →  parse  →  extract  →  verify  →  report
 Source[]    Doc[]     Claim[]    Finding[]   stdout
```

No stage knows the next one. A new check is a new file in `extract/` and/or `verify/`, without touching the rest. A new output format is a file in `report/`.

The CLI sits outside the pipeline: `cli/` translates arguments into a configuration and a configuration into an exit code, and knows nothing about checks. The pipeline imports nothing from `cli/`.

This matters for the project itself: most of the future work is *adding checks*, and that operation has to cost one file.

---

## Directory structure

```
src/
  cli.ts               bin entrypoint  (the only one touching process)
  index.ts             public API: run(), defineConfig, types
  run.ts               the whole pipeline; returns findings, not output
  cli/
    main.ts            the CLI body; receives the environment, returns the exit code
    args.ts            flag parsing on top of node:util parseArgs
    help.ts            the --help text, which is the SPEC.md § 4 contract
  core/
    types.ts           Source, Claim, Finding, Verdict, Config
    errors.ts          UserError and the exception normalization helpers
    exit-codes.ts      the three exit codes and how they derive from a count
    version.ts         reads the version from the nearest package.json
    discover.ts        finds sources, respects .gitignore
    config.ts          loads and validates config, merges with defaults
    ignores.ts         parses <!-- driftwatch-ignore --> directives
    check-id.ts        how a check id is matched by --only, --skip and the ignores
  parse/
    markdown.ts        mdast + positions, extracts inline code / links / code fences
    positions.ts       absolute offset -> 1-indexed line and column
    frontmatter.ts     YAML of the leading block
    anchors.ts         the anchors a document offers, keyed for matching
  extract/
    paths.ts           path Claim[]
    discard.ts         the discard rules of the path extractor
    context-prose.ts   the prose markers that disclaim a nearby claim
    scripts.ts         script Claim[] (npm/pnpm/make/deno)
    deps.ts            dependency Claim[]
    symbols.ts         symbol Claim[]
    links.ts           link Claim[]
  verify/
    repo-index.ts      in-memory repo index (the heart)
    check.ts           the shape of a check and its context
    resolve.ts         a claim's text -> path relative to the root
    generated.ts       directories whose contents are generated, not versioned
    anchor-index.ts    the anchors of the files some link points into
    manifest.ts        reads package.json / Makefile / pyproject / go.mod / Cargo
    git.ts             per-file churn, a source's last commit
    checks/
      path-missing.ts
      script-missing.ts
      skill-frontmatter.ts
      link-broken.ts
      dep-missing.ts
      symbol-missing.ts
      stale-churn.ts
      command-unknown.ts
  fix/
    apply.ts           applies range edits, preserves formatting
    suggest.ts         candidates + confidence scoring
  report/
    colors.ts          decides once whether there is color (NO_COLOR, tty)
    pretty.ts
    json.ts
    github.ts
    sarif.ts
test/
  fixtures/            complete synthetic repos, one per scenario
  corpus/              the real-repo corpus (see §Corpus)
    repos/             shallow clones pinned to a commit (gitignored, local cache)
    snapshots/         driftwatch's output per repo (committed)
    CLASSIFICATION.md  every finding reviewed by hand, true or false positive
```

---

## Data model

```ts
type Source = {
  path: string            // relative to root
  absPath: string
  kind: 'claude-md' | 'agents-md' | 'skill' | 'subagent' | 'command' | 'cursor-rule' | 'copilot'
  content: string
  baseDir: string         // directory that relative paths resolve against
}

type Claim = {
  kind: 'path' | 'script' | 'dep' | 'symbol' | 'link' | 'frontmatter'
  source: Source
  text: string            // the exact claimed fragment
  range: { line: number; column: number; endLine: number; endColumn: number }
  offset: [number, number]  // absolute offsets into content, for --fix
  context: 'inline-code' | 'code-fence' | 'link' | 'frontmatter' | 'prose'
  meta?: Record<string, unknown>   // e.g. { manager: 'pnpm' } for scripts
}

type Finding = {
  check: string           // 'path/missing'
  severity: 'error' | 'warning'
  claim: Claim
  message: string
  suggestion?: { value: string; confidence: number; fixable: boolean }
}
```

`offset` is what makes `--fix` possible without reformatting: exactly that byte range gets replaced.

---

## The repo index

`verify/repo-index.ts` is the piece the performance budget depends on. It is built **once** per run:

```ts
type RepoIndex = {
  files: Set<string>                    // every relative path
  dirs: Set<string>
  byBasename: Map<string, string[]>     // 'auth.ts' → ['src/auth.ts', 'test/auth.ts']
  manifests: Map<string, Manifest>      // dir → parsed package.json (monorepo)
}
```

Decisions:
- A single tree walk with `fast-glob` or `tinyglobby`, honouring `.gitignore`.
- If git is available, use `git ls-files` — it is faster and already respects ignores. Fall back to glob if there is no repo.
- `byBasename` is what feeds the `--fix` suggestions. It is a `Map` of arrays, not a fuzzy search: the fuzzy search only runs over the candidates for that basename, never over the whole index.
- Everything in memory. On a repo of 100k files that is a few MB; acceptable.

Verifications are then `O(1)` per claim. No `fs.stat` call on the hot path.

---

## Markdown parsing

Use **mdast** (`remark-parse` + `unist-util-visit`), not regex over raw text.

The reason is not purism: it is that we need to know **in what context** each fragment appears. `` `src/foo.ts` `` inside an example code block, inside a quote, or inside a table carries different weight. With regex that distinction is lost and the false positives that kill the project show up.

mdast gives `node.position` with line/column/offset, which maps directly to `Claim`'s `range` and `offset`.

Four node types matter from the tree:
- `inlineCode` → main source of path, script, dep and symbol claims
- `code` (fences) → script and command claims; ignored if `lang` is a non-shell language
- `link` → link claims
- `yaml` (frontmatter) → frontmatter claims

Raw prose (`text`) is **not** scanned by default, with one exception: `dep/missing` looks at it hunting for usage verbs. Scanning prose in general is the number one source of noise.

---

## Path extraction: the detail that defines quality

This is the most nuanced algorithm in the project. Rule order:

1. Discard if it parses as a URL with a protocol.
2. Discard if it contains glob or placeholder characters: `* ? { } < > $ [ ]`.
3. Discard if it is a single word with no `/` (`foo` is not a path, `foo.ts` is not either, `src/foo` is). The original parenthetical said `foo.ts` was one, contradicting `SPEC.md` § 3; see ADR-0003.
4. Discard common non-file extensions that confuse: `1.0`, `v2.1`, `node.js` when there is no `/` (a blocklist of words: `node.js`, `next.js`, `nuxt.js`, `vue.js`, a bare `d.ts`).
5. Normalize: strip a leading `./`, strip a trailing `:line`, strip leftover backticks, strip trailing punctuation (`.`, `,`, `)`).
6. Resolve against `source.baseDir`.
7. Look up `index.files` and `index.dirs`.

If it fails, generate a suggestion: look up `basename` in `index.byBasename`. Confidence = 1.0 if there is a single candidate and the parent directory is similar; 0.6 if there is a single candidate in a different directory; 0.3 if there are several.

**Every discard rule must have a case in `test/fixtures/`.** That is the contract against false positive regression.

---

## Anchor resolution

`link/broken` answers one question: does `#the-fix-flag` name a heading in the target document? The rendered id comes from GitHub's slug algorithm, and reproducing it — or depending on `github-slugger` — makes every divergence in a generated character class a reported finding on a link that works.

So both sides are reduced to a **canonical key** instead: lowercase, then drop everything that is not a letter or a number. It is strictly more permissive than the slug, so the divergence can cost a detection and cannot produce a report. [ADR-0010](../adr/0010-anchors-match-on-a-canonical-key.md) has the argument and what it gives up.

Two consequences shape the code:

- **The check never claims a target that does not exist.** `path/missing` already extracts the path half of every link and already suggests a candidate for it, so one broken link produces one finding. `link/broken` requires the target to be in the index before it says anything.
- **`Check.run` stays synchronous.** The target files a link points into are read once per run into `verify/anchor-index.ts`, before verification, the way `ignoredByGit` already is. A check that reads from disk on the hot path is how the budget in SPEC § 9 dies. Only files some claim actually targets are read; this is not an index of the repo.

---

## Stack

| Decision | Choice | Why |
|---|---|---|
| Language | TypeScript, pure ESM | It is what the target ecosystem uses |
| Minimum runtime | Node 24 | LTS with stable `node:` builtins |
| Build | `tsdown` or `unbuild` | ESM output + types, no ceremony |
| Args | our own parsing on `node:util parseArgs` | A 12-flag CLI does not justify a dependency |
| Markdown | `remark-parse` + `unist-util-visit` | Exact positions |
| Frontmatter | `yaml` | A correct parser; not regex |
| Glob | `tinyglobby` | Fast, small; only when there is no git |
| Colors | `picocolors` | 2 kB, respects `NO_COLOR` |
| Config | `jiti` or dynamic import | To load `.ts` config; **lazy**, only if a config exists |
| Tests | `vitest` | Ecosystem standard |

**Hard constraint:** the `npx driftwatch` path with no config cannot load more than ~6 dependencies. Cold start is part of the product.

---

## Testing

Three levels, in order of importance:

### 1. Fixtures (the bulk)
`test/fixtures/<scenario>.ts` **declares** a complete mini-repo: the file map (`CLAUDE.md`, `package.json`, a few source files) and the expected findings. A helper materializes it in a temporary directory, runs the pipeline and compares.

The files are declared as data instead of living committed as real `CLAUDE.md` files for a concrete reason: if they lived in the tree, driftwatch run over its own repo would discover them as sources and report the paths that are broken on purpose. A fixture has to be able to lie without contaminating the repo containing it.

Minimum scenarios:
- `happy-path` — everything correct, zero findings
- `broken-paths` — broken paths with and without a suggestion
- `monorepo` — nested CLAUDE.md files, relative resolution, multiple package.json
- `skills` — valid and invalid frontmatter
- `anchors` — `link/broken`, resolving and broken, plus the targets it must never claim
- `false-positive-traps` — the most important one: URLs, globs, placeholders, versions, `node.js`, paths in example blocks, quoted text. **Expected: zero findings.**
- `ignores` — inline directives working
- `no-git` — repo with no `.git`, glob fallback

### 2. Corpus of real repos
A `scripts/corpus.ts` script clones a list of public repos with real `CLAUDE.md`/`AGENTS.md` files, runs driftwatch and **stores the output as a snapshot**. It is not claimed to be correct — it is claimed not to change without intent. Every change in the snapshot is reviewed by hand.

It is the only way to measure false positives in practice.

How it is run, what a snapshot claims and why the commits are pinned is in [test/corpus/README.md](../../test/corpus/README.md). It is a **local** gate, not a CI job, and the reason is in [ADR-0007](../adr/0007-the-corpus-does-not-run-in-ci.md): CI can detect that a snapshot changed but cannot rule on whether the change is an improvement.

### 3. Unit
Only for the path extractor and the suggestion scoring. The rest is covered by fixtures.

---

## Extensibility (post-v1)

A check is a module with this shape:

```ts
export const check: Check = {
  id: 'path/missing',
  tier: 1,
  defaultSeverity: 'error',
  claimKinds: ['path'],
  run(claim, ctx): Finding | null { /* ... */ },
}
```

`ctx` exposes `index`, `manifests`, `git`, `config`. Static registry in `verify/checks/index.ts` — no dynamic plugin loading in v1. Third-party plugins are a v2 decision and must not shape the design now.
