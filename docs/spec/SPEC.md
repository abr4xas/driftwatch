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
| `.claude/skills/**/SKILL.md` | `skill` |
| `.claude/agents/*.md` | `subagent` |
| `.claude/commands/**/*.md` | `command` |
| `.cursor/rules/**/*.mdc`, `.cursorrules` | `cursor-rule` |
| `.github/copilot-instructions.md` | `copilot` |

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

Detects `npm run X`, `pnpm run X`, `pnpm X`, `yarn X`, `bun run X`, `deno task X`, `make X` in code blocks and in inline code. Verifies against `package.json#scripts` (the nearest one in the tree, for monorepos), `Makefile`, or `deno.json#tasks`.

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
  --init                 Write a commented driftwatch.config.ts
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
- No emojis. Only the `✗ ⚠ ✓` symbols.
- When autofixes are available, close with: `3 fixable with --fix`.

### `github` format
Emits `::error file=X,line=Y::message` for native GitHub Actions annotations.

### `sarif` format
SARIF 2.1.0, for upload to GitHub Code Scanning.

---

## 6. JSON output

Stable contract. Breaking changes only on a major.

```jsonc
{
  "version": 1,
  "root": "/abs/path/to/repo",
  "durationMs": 340,
  "summary": { "sources": 14, "claims": 212, "errors": 4, "warnings": 1, "fixable": 3 },
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

`file` is always relative to `root`. `line` and `column` are 1-indexed.

---

## 7. Configuration

Optional. `driftwatch.config.ts`, `.js`, `.json`, or the `driftwatch` key in `package.json` is looked up.

```ts
import { defineConfig } from 'driftwatch'

export default defineConfig({
  // Additional sources beyond the ones discovered by default
  sources: ['docs/agent-notes.md'],

  // Exclude from discovery
  ignore: ['**/fixtures/**'],

  // Adjust severity per check: 'error' | 'warning' | 'off'
  checks: {
    'dep/missing': 'off',
    'stale/churn': 'warning',
    'symbol/missing': 'error',
  },

  // Aliases for paths that exist but not on disk (e.g. build outputs)
  knownPaths: ['dist/**', '.next/**'],

  staleThreshold: 15,
})
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
- `skill/frontmatter`: a `name` that does not match the directory (corrected to the directory's).
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
