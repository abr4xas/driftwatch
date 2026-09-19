# driftwatch — Functional specification

Everything below describes **observable behaviour**. The implementation is in `ARCHITECTURE.md`.

---

## 1. Conceptual model

driftwatch operates on three concepts:

**Source (`Source`)** — an agent context file. It is what gets audited.

**Claim (`Claim`)** — a fragment of a source that asserts something verifiable about the repo. Example: the text `` `src/lib/auth.ts` `` on line 12 claims that file exists.

**Verdict (`Verdict`)** — the result of verifying a claim: `ok`, `broken`, `suspect` or `skipped`.

The tool's job is: discover sources → extract claims → verify them → report.

---

## 2. Source discovery

By default, from the repo root (the directory holding `.git`, or the cwd if there is none):

| Pattern | Kind |
|---|---|
| `CLAUDE.md`, `CLAUDE.local.md` (in any directory) | `claude-md` |
| `AGENTS.md` (in any directory) | `agents-md` |
| `.claude/`, `.agents/`, `.cursor/`, `.codex/`, `.github/`, `.opencode/` + `skills/**/SKILL.md` | `skill` |
| `.claude/agents/*.md` | `subagent` |
| `.claude/commands/**/*.md` | `command` |
| `.cursor/rules/**/*.mdc`, `.cursorrules` | `cursor-rule` |
| `.github/copilot-instructions.md` | `copilot` |

**On the skills roots.** There is no single install location and `.claude/skills/` is not the busiest one. `npx skills add` writes to `.agents/skills/` by default — the "universal" target covering Amp, Cline, Codex, Cursor, GitHub Copilot, Gemini CLI, Kilo, Kimi, OpenCode, Warp and Zed among others — and offers fifty-odd more behind a picker, including `.aider-desk/skills`, `.augment/skills`, `.bob/skills`, `data/skills`, and a bare `skills/` for OpenClaw. The corpus agrees: 83 `SKILL.md` files under `.agents/skills/` against 32 under `.claude/skills/`.

Six roots are read today. The rest are a deliberate omission rather than an oversight: each root added audits more files in every repository that has one, which moves corpus snapshots and has to be priced against that diff (ADR-0007). They are taken one at a time, with the measurement in hand.

What that measurement should count is **repositories, not files**. `.flue/skills/` holds eleven `SKILL.md` files — more than any other candidate root — and all eleven are in one project, which is the same project in the certification corpus and the only one of 700 repositories sampled from the wider ecosystem. A file count cannot tell a convention from a project. `.github/skills/` arrived last for the same reason inverted: it is the most widely used of the candidates, and what held it was a defect it exposed rather than a cost of its own.

Rules:
- `.gitignore` is respected. `node_modules`, `dist`, `build`, `.next`, `vendor`, `target` are never walked into.
- Nested files resolve **relative to their own directory**. A `packages/api/CLAUDE.md` mentioning `src/db.ts` refers to `packages/api/src/db.ts`.
- Positional arguments narrow the scope: `driftwatch CLAUDE.md .claude/skills` audits only that.

---

## 3. Checks

Every check has a **stable id** (used in config and ignores) and a **confidence level** that determines whether it emits an error or a warning.

### Tier 1 — High confidence (emit `error`)

They extract syntactically unambiguous claims. They must have ~0 false positives.

#### `path/missing`
A path that does not exist in the repo.

Extracted from: inline code (`` `src/foo.ts` ``), relative Markdown links (`[x](./docs/y.md)`), and frontmatter values that are paths.

It counts as a path if **any** of these holds:
- It contains `/` and a final segment with a known extension.
- It starts with `./`, `../` or `/` and contains `/`.
- It ends in `/` (a directory).

It is **discarded** if: it is a URL, contains a glob (`*`, `?`, `{`), contains a placeholder (`<...>`, `{{...}}`, `$VAR`, `[name]`), or is an absolute path outside the repo.

When it fails, a candidate is looked up by basename in the repo and suggested: `→ src/auth/index.ts?`. If there is exactly one candidate, it is autofixable.

#### `script/missing`
A package manager command whose script does not exist.

Detects `npm run S` (and `npm run-script S`), `pnpm run S`, `yarn run S`, `bun run S`, `deno task S`, `make S` in code blocks and in inline code. Verifies against `package.json#scripts` (the nearest one in the tree, for monorepos), `Makefile`, or `deno.json#tasks`.

The **bare** form (`pnpm S`, `yarn S`) is deliberately not detected: it runs a script *or* a binary from `node_modules/.bin`, and the two cannot be told apart without indexing dependencies. See [ADR-0012](../adr/0012-a-bare-pnpm-x-is-not-a-script-claim.md). `make S` is bare because make has no such fallback.

Nothing is reported when there is no manifest of that runner's kind, when the `Makefile` cannot be enumerated (an `include`, a pattern rule), or when the script exists in some other manifest in the repo (ADR-0005 applied to scripts: a monorepo's document is often written from the root).

Nor is a command claimed at all when:

- It carries a flag that moves the question elsewhere, wherever the flag sits: `--filter`, `--workspace`/`-w`, `-r`, `--prefix`, `-C`, or `--if-present`, which says the absence is already fine.
- The name is a hole rather than a name: a placeholder (`<script>`, `{{task}}`, `$TASK`), a metavariable (`X`, `TARGET`, any all-caps or single-character name), a filler (`foo`, `your-script`), the word for the concept (`script`, `task`, `target`), or a path (`bun run ./x.ts`, which runs a file).
- The line is a column layout rather than a command — two spaces in a row, which is how a code block holding a table reads.
- The fence declares a non-shell language.

If the script does not exist but there is one with a similar name (edit distance ≤ 2), it is suggested and autofixable.

#### `skill/frontmatter`
Structural problems in a `SKILL.md` frontmatter:
- Missing `name` or `description`.
- `name` does not match the containing directory's name.
- `name` is not kebab-case.
- `description` empty or shorter than 20 characters (a poor description means the skill never gets invoked).
- Unknown keys in the frontmatter.

#### `link/broken`
A relative Markdown link to a file that does not exist, or to an anchor (`#section`) that does not exist in the target file.

#### `frontmatter/invalid`
Frontmatter YAML that does not parse, or fields with the wrong type.

### Tier 2 — Medium confidence (emit `warning`)

They require inference. They are on by default but can be degraded to `off` in config.

#### `dep/missing`
The text names a technology that is not in the project manifest.

It only fires for names from a **curated dictionary** of popular dependencies (`prisma`, `drizzle`, `tailwind`, `vitest`, `jest`, `playwright`, `zod`, `trpc`, …), and only when the name appears with a usage verb nearby (`we use`, `built with`, `powered by`) or in inline code. Verifies against `package.json` (every deps section), `requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`.

It never fires on a bare prose mention with no usage marker. This check carries the highest false positive risk: when in doubt, do not report.

#### `symbol/missing`
An identifier referenced as `` `functionX()` `` or `` `ClassY` `` that does not appear exported in any source file.

Only applies to identifiers in inline code with a symbol shape (camelCase with parentheses, or PascalCase). A textual search over source files, not semantic analysis. If it appears *anywhere* in the code, it counts as `ok`.

#### `stale/churn`
The source has not been modified for N commits while the files it mentions changed a lot.

Heuristic: if a mentioned file has ≥ `staleThreshold` commits (default 15) after the last commit that touched the source, a warning is emitted. It is a "review this" signal, not an assertion of error. Requires git; skipped silently if there is no repo.

#### `command/unknown`
A shell command in a code block whose binary is neither in `PATH` nor in `node_modules/.bin` nor a known builtin.

Only the first word of the line. A broad allowlist of POSIX builtins. Blocks marked with a non-shell language are skipped.

---

## 4. Command line interface

```
driftwatch [paths...] [options]

Options
  --fix                  Apply the unambiguous fixes
  --dry-run              With --fix, show what it would change without writing
  --json                 JSON output on stdout (see §6)
  --format <fmt>         pretty | json | github | sarif   (default: pretty)
  --only <ids>           Only these checks (comma-separated, accepts a prefix: --only path)
  --skip <ids>           Exclude these checks
  --strict               Warnings count as errors for the exit code
  --no-tier2             Turn off every tier 2 check
  --config <path>        Explicit path to the config
  --no-config            Ignore any config found
  --quiet                Show problems only, no summary
  --watch                Re-run whenever a source changes
  --init                 Write a commented driftwatch.config.yaml
  --migrate-config       Convert a .ts or .js config to YAML
  --version, -v
  --help, -h
```

With no arguments: audit the whole repo with the default configuration.

### Exit codes

| Code | Meaning |
|---|---|
| `0` | No errors (there may be warnings, unless `--strict`) |
| `1` | At least one error was found |
| `2` | The tool itself failed (invalid config, nonexistent path, crash) |

With `--fix`, the exit code reflects what **remains** after fixing.

---

## 5. `pretty` output

```
CLAUDE.md
  ✗ 12  src/lib/auth.ts                  path does not exist  → src/auth/index.ts?
  ✗ 34  pnpm run test:e2e                script not in package.json
  ⚠ 51  "we use Prisma as the ORM"       not in dependencies

2 files · 5 problems (4 errors, 1 warning) · 340ms
```

Formatting rules:
- Grouped by file, ordered by line.
- `file:line` must be clickable in modern terminals (`file:line:column` format on the header path when `--no-group`).
- Colors: red for errors, yellow for warnings, dim for suggestions. Turned off if `NO_COLOR` is set or if stdout is not a TTY.
- The quoted fragment is truncated to 40 characters with `…`.
- With no problems: `✓ 14 files · no drift · 210ms`.
- A document git lists and the working tree does not have gets a dim line **above** the summary, because it qualifies everything the summary says:

  ```
  skipped CLAUDE.md: a symlink whose target is not in the working tree
  ```

  Dim, and with no symbol: `✗ ⚠ ✓` are the three this format allows, and none of them fits something that is not a finding.
- No emojis. Only the `✗ ⚠ ✓` symbols.
- When autofixes are available, close with: `3 fixable with --fix`.

`--quiet` drops the summary and keeps the skipped-source lines: a document that was found and not opened is nearer a problem than it is to the summary, and it is the one line that changes how the list above should be read.

`--quiet` and colour are `pretty` concepts. The other three formats ignore both: a JSON document without its summary is not quieter, it is invalid against its own contract.

### `github` format
Emits one native GitHub Actions annotation per finding, and **nothing else** — the job log is the transport, so a line that is not a workflow command is noise in the output:

```
::error file=CLAUDE.md,line=12,col=4,endColumn=19,title=path/missing::path does not exist → src/auth/index.ts?
```

Skipped sources are **not** emitted here, and that is the one format where they are not: the job log is the transport, so anything that is not an annotation about a finding is noise in the output. They reach CI through `sarif` instead.

`::warning` for a warning-severity finding. `title` carries the check id, which is the only stable label to group and search by. Property values escape `%`, `\r`, `\n`, `:` and `,`; the message escapes the first three. A run with no findings emits nothing at all.

### `sarif` format
SARIF 2.1.0, for upload to GitHub Code Scanning. One `run`, with:

- `invocations[0].toolExecutionNotifications` — one `note` per skipped source, present only when there is one. SARIF's own notion of "something the run could not do", and this is the format that feeds Code Scanning, which is where an incomplete checkout would otherwise be an entirely silent green.
- `tool.driver` carrying `name`, `informationUri`, `semanticVersion` and **`rules[]`** — one rule per check that *ran*, with its title, its description and a `helpUri` into `docs/guide/checks.md`. The rules are what make an alert readable a month after it was raised.
- `results[]` with `ruleId`, `level`, `message.text` and a physical location resolved against `%SRCROOT%`.
- `fixes[]`, SARIF's own, under `--fix --dry-run`. See § 6 for why only then.

No `partialFingerprints`: without them Code Scanning fingerprints on location and an alert reappears when the file shifts by a line; with them the hashing decision is owned forever and changing it re-raises every alert at once. The first cost is visible and recoverable.

---

## 6. JSON output

Stable contract. Breaking changes only on a major.

```jsonc
{
  "version": 1,
  "root": "/abs/path/to/repo",
  "durationMs": 340,
  "summary": { "sources": 14, "claims": 212, "skipped": 0, "errors": 4, "warnings": 1, "fixable": 3 },
  "findings": [
    {
      "check": "path/missing",
      "severity": "error",
      "file": "CLAUDE.md",
      "line": 12,
      "column": 4,
      "endColumn": 19,
      "text": "src/lib/auth.ts",
      "message": "path does not exist",
      "suggestion": { "value": "src/auth/index.ts", "confidence": 0.86, "fixable": true }
    }
  ]
}
```

`file` is always relative to `root`. `line` and `column` are 1-indexed, and `endLine` accompanies `endColumn` so the span is unambiguous when a claim crosses a line.

### Sources that were found and not read

`summary.skipped` counts the documents git lists that the working tree does not have, and a top-level `skipped[]` names them:

```jsonc
"skipped": [{ "path": "CLAUDE.md", "reason": "absent-from-worktree" }]
```

`summary.skipped` is **always present**, at zero when there is nothing to report. A consumer that has to tell "nothing was skipped" from "this version does not report skips" is a consumer that will get it wrong.

Two `reason` values, split by what was **observed** rather than by what is suspected:

| `reason` | What was checked |
|---|---|
| `dangling-symlink` | `lstat` succeeds: the entry is there and its target is not |
| `absent-from-worktree` | the path itself is gone — an uninitialised submodule, a `git rm --cached`, or a file deleted while the run was in flight, and nothing can tell those apart |

Only a read that fails with `ENOENT` becomes a skip. A permission error, a directory where a file was expected, an I/O fault: none of those is a fact about a checkout anybody can act on, and admitting them would turn every future read bug into silence.

They are not findings and they do not move the exit code. Nothing in the document went stale, so it is not drift; the tool did not fail, so it is not a tool failure. What they are is the difference between "no drift" and "no drift in the files I could open".

### The fix plan

Two additions, and they are not symmetric:

- **`fixes`**, top level, whenever `--fix` was passed: `{ applied, files, dryRun, edits[] }`, each edit `{ file, line, start, end, before, after }`.
- **`fix`** on an individual finding, `{ start, end, replacement }` — **only under `--fix --dry-run`**.

The asymmetry is the honest part. `start` and `end` are absolute byte offsets into the file as it is on disk, and after a real `--fix` what gets reported comes from a second full run over files that have already been rewritten (§ 4). Those findings have no relationship to the plan that was applied, so offering them a range would be offering an index into a file that no longer exists in that form. What was applied is still described, in the top-level block, as the past rather than as an offer.

Adding an optional field is not a breaking change. `version` stays `1`.

---

## 7. Configuration

Optional. `driftwatch.config.json`, `.yaml`, `.yml`, or the `driftwatch` key in `package.json` is looked up, in that lookup order: `.json`, `.yaml`, `.yml`, then the manifest. The first one found wins and the search stops.

**A config is data, not a program.** `.ts`, `.js` and `.mjs` were accepted until 2026-09-18 and are not loaded any more: [ADR-0013](../adr/0013-a-config-is-data-not-a-program.md) withdrew them rather than keep a path by which driftwatch executes code it finds in a repository. They keep their place in the lookup order and **fail** with the conversion command in the message, because a withdrawn format that is silently skipped would let the next candidate load while the author believes the module is in effect. `driftwatch --migrate-config` converts one to YAML.

**`--init` writes the YAML one**, because driftwatch audits repositories in any language, and unlike JSON it holds the comments the generated file is mostly made of.

```yaml
# What --init writes, minus the commentary.
sources:
  - 'docs/agent-notes.md'

ignore:
  - '**/fixtures/**'

# 'error' | 'warning' | 'off' — quoted, because `off` is a YAML 1.1 boolean
checks:
  'dep/missing': 'off'
  'stale/churn': 'warning'
  'symbol/missing': 'error'

knownPaths:
  - 'dist/**'
  - '.next/**'

staleThreshold: 15
```

The same config as JSON, for a repository that would rather not add a YAML file:

```json
{
  "sources": ["docs/agent-notes.md"],
  "ignore": ["**/fixtures/**"],
  "checks": {
    "dep/missing": "off",
    "stale/churn": "warning",
    "symbol/missing": "error"
  },
  "knownPaths": ["dist/**", ".next/**"],
  "staleThreshold": 15
}
```

### Inline ignores

Inside any Markdown source:

```markdown
<!-- driftwatch-ignore-next-line -->
`src/planned/feature.ts` does not exist yet, it is the plan

<!-- driftwatch-ignore path/missing -->
<!-- driftwatch-ignore-file -->
```

An ignore with no id applies to every check on that line. With an id, only to that check.

---

## 8. `--fix` behaviour

It only applies when the correction is **unambiguous**: there is exactly one candidate and its confidence is above 0.8.

Autofixable:
- `path/missing` with a single candidate by basename.
- `script/missing` with a single script at edit distance ≤ 2.
- `skill/frontmatter`: a `name` that does not match the directory (corrected to the directory's). Withheld when the directory name is not itself kebab-case: applying it would trade the finding for the kebab-case one, and a fix whose output is a finding is not a fix.

  Withheld, equally, when the directory is longer than 64 characters, which is the [specification](https://agentskills.io/specification.md)'s limit and what `skills-ref validate` enforces. That limit is a **gate and not a rule**: an over-long `name` is reported nowhere, because it is as wrong the day it is written as a year later and this tool is about documents that no longer match their repository. It still has to be known here, or the fix hands somebody an edit that makes their skill invalid.

  Verified against the ecosystem rather than against the specification alone, because ADR-0006 condition 2 admits no false positive here at any rate (ticket `10`). `skills-ref validate` — the reference implementation the specification names — rejects the unfixed skill on exactly this rule and calls the fixed one **valid**; the alternative resolution, renaming the directory to match the name, leaves it invalid. `npx skills` was observed to install by the source **directory** and leave the frontmatter untouched, and Claude Code's command name is the directory per its documentation, so rewriting `name` changes no identity anything invokes by.
- `link/broken` with a single candidate target.

Never autofixable: any tier 2 check, and any case with more than one candidate.

Rules:
- Preserves the file's original formatting. Only the claim's exact range is replaced.
- Prints a summarized diff of what was applied.
- With `--fix --dry-run`, shows the diff without writing.
- If the working tree has uncommitted changes in a file to be modified, it warns but proceeds (this is not a git tool).

---

## 9. Performance

Budget, measured on a repo of 5,000 files with 20 sources:

| Phase | Budget |
|---|---|
| Discovery + repo index | < 200 ms |
| Source parsing | < 50 ms |
| Verification (all tier 1 checks) | < 100 ms |
| **Total end-to-end** | **< 500 ms** |

CLI cold start (require + arg parsing) has to stay under 80 ms. That rules out heavy dependencies on the main path: no `typescript`, `ts-morph` or `esbuild` loaded eagerly.

**How these are measured.** The budgets are asserted in the test suite, which runs one worker per test file — so a single wall-clock sample measures the scheduler alongside the code. Each budget is therefore the **fastest of several runs** (`test/helpers/budget.ts`): contention only ever adds time, so the minimum converges on what the code costs with the machine to itself, and work that genuinely exceeds a budget has no run under it. Raising a budget because it failed is not an option; that is how a budget stops being one.
