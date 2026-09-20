# Output formats

```bash
driftwatch                      # pretty, for a person at a terminal
driftwatch --format json        # for a program
driftwatch --format github      # for GitHub Actions annotations
driftwatch --format sarif       # for GitHub Code Scanning
```

`--json` is the same flag as `--format json`.

Four rules hold across all of them: **stdout is the report and stderr is everything else**; the **exit code does not depend on the format**; `--quiet` and colour are `pretty` concepts the other three ignore; and no format changes what was found, only how it is said.

## pretty

```console
$ driftwatch
CLAUDE.md
  ✗ 12  src/lib/auth.ts                  path does not exist  → src/auth/index.ts?
  ✗ 34  pnpm run test:e2e                script not in package.json

2 files · 5 problems (4 errors, 1 warning) · 340ms
3 fixable with --fix
```

Grouped by file and ordered by line, with `file:line` clickable in a modern terminal. The quoted fragment is truncated to 40 characters. Colour is off when `NO_COLOR` is set or stdout is not a TTY. No emojis — only `✗ ⚠ ✓`. A clean run closes with `✓ 14 files · no drift · 210ms`.

`pretty` is the only format with a human as its consumer, and the only one that may change freely between versions.

## json

A **stable contract**. Breaking changes only on a major; adding an optional field is not one. `version` is what you branch on, and it is `1`.

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
      "endLine": 12,
      "endColumn": 19,
      "text": "src/lib/auth.ts",
      "message": "path does not exist",
      "suggestion": { "value": "src/auth/index.ts", "confidence": 0.86, "fixable": true }
    }
  ]
}
```

`file` is always relative to `root`, with posix separators. `line` and `column` are 1-indexed.

`summary.claims` is the one number that says how much was **looked at** rather than what went wrong. A clean run over 212 claims and a clean run that discovered no sources both report zero findings, and only this field tells them apart — which matters most in CI, where nobody reads the output of a green run.

<a id="the-fix-plan"></a>

## The fix plan

Two additions under `--fix`, and they are deliberately not symmetric.

**`fixes`**, at the top level, whenever `--fix` was passed:

```jsonc
"fixes": {
  "applied": 1,
  "files": 1,
  "dryRun": true,
  "edits": [
    { "file": "AGENTS.md", "line": 3, "start": 1204, "end": 1219,
      "before": "src/util/date.ts", "after": "src/helpers/date.ts" }
  ]
}
```

**`fix`** on an individual finding — `{ start, end, replacement }` — **only under `--fix --dry-run`**.

The offsets are absolute byte offsets into the file as it is on disk. After a real `--fix`, what gets reported comes from a second full run over files that have already been rewritten, so those findings have no relationship to the plan that was applied: offering them a range would be offering an index into a file that no longer exists in that form. What was applied is still described, in the top-level block, as the past rather than as an offer.

## github

One native annotation per finding, and **nothing else** — the job log is the transport, so any line that is not a workflow command is noise in the output.

```
::error file=CLAUDE.md,line=12,col=4,endColumn=19,title=path/missing::path does not exist → src/auth/index.ts?
```

`::warning` for a warning-severity finding. `title` carries the check id, which is the only stable thing to group and search by. A run with no findings emits nothing at all — not a blank line. No fix diff reaches the log, because there is no workflow command for "I changed this file".

```yaml
- uses: abr4xas/driftwatch@v0.5.0
```

See [ci.md](./ci.md) for the action's inputs.

## sarif

SARIF 2.1.0, for upload to Code Scanning.

```yaml
- uses: abr4xas/driftwatch@v0.5.0
  id: drift
  with:
    sarif: true
    fail-on-drift: false
- uses: github/codeql-action/upload-sarif@v4
  with:
    sarif_file: ${{ steps.drift.outputs.sarif-file }}
```

The document carries `tool.driver.rules` — one rule per check that actually **ran**, with its description and a link into [checks.md](./checks.md). That is the half that decides whether an alert is readable a month after it was raised: the result says what is wrong on one line, the rule says what the check means and when it is wrong.

Under `--fix --dry-run` it carries SARIF's own `fixes`, with `deletedRegion` / `insertedContent` — the same information the JSON contract puts in a `fix` field, in the format's own vocabulary.

There are no `partialFingerprints`. Without them Code Scanning fingerprints on location, so an alert reappears as new when the file shifts by a line. With them we own a hashing decision for as long as the tool exists, and changing it later re-raises every alert at once. The first cost is visible and recoverable; the second is neither.
