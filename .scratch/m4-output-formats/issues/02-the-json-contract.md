# 02: `--format json`

**What to build:** the stable JSON contract of `SPEC.md` § 6 on stdout, plus the fix plan that M3 deferred to this milestone.

**Blocked by:** 01.

**Status:** done

## What has to change

- [ ] `src/report/json.ts`, rendering exactly the document in `SPEC.md` § 6: `version`, `root`, `durationMs`, `summary { sources, claims, errors, warnings, fixable }`, `findings[]` with `check`, `severity`, `file`, `line`, `column`, `endColumn`, `text`, `message` and an optional `suggestion { value, confidence, fixable }`.
- [ ] `file` is relative to `root` with posix separators — `Source.path` already is. `line` and `column` are 1-indexed — `Claim.range` already is. Assert both in a test rather than trusting this sentence.
- [ ] **The fix plan**, per the spec's decision:
  - a top-level `fixes: { applied, files, dryRun, edits[] }` whenever `--fix` was passed;
  - `fix: { start, end, replacement }` on an individual finding **only** under `--fix --dry-run`.
- [ ] `SPEC.md` § 6 gains both, and gains the sentence saying why the per-finding one is absent from a real fix run. ADR-0001: the document changes in this diff, not in a follow-up.
- [ ] `version` stays `1`. Adding optional fields is not a breaking change; the contract's promise is that a consumer reading `findings[].check` today reads it after the next minor too.

## What to decide

- [ ] Whether `durationMs` is rounded. `pretty` rounds it for display. The JSON should carry what was measured, but a float with fourteen decimals in a contract is noise in every diff a consumer commits. Round to the nearest millisecond, in the renderer, and say so.
- [ ] Trailing newline: yes, one. A file that does not end in a newline is a file every tool in the pipeline complains about.

## Tests

- [ ] The document parses and every documented field is present, on a fixture with at least one finding with a suggestion and one without.
- [ ] Zero findings still produces a valid document with `findings: []` — not `null`, not an absent key.
- [ ] `--fix --dry-run --format json`: the `fix` range, sliced out of the fixture's bytes, is exactly what the pretty diff said it would replace. The same assertion `fix-range.test.ts` makes, through the other door.
- [ ] `--fix --format json` (not dry): no finding carries `fix`, and the top-level `fixes.applied` is what was written.
- [ ] `--quiet --format json` is byte-identical to `--format json`.
- [ ] stdout parses as JSON when the dirty-tree warning fires, which is the regression test for "stderr is everything else".

## Out of scope

- A JSON Schema file for the contract. It would be the fourth place the shape is written down.

## Comments

Closed. 11 tests in `test/formats.test.ts`.

`endLine` was added to the contract and to `SPEC.md` § 6, which did not have it. An `endColumn` without it is ambiguous the moment a claim crosses a line, and a fenced block can.

The fix plan landed as the spec decided: top-level `fixes` under any `--fix`, per-finding `fix` only under `--dry-run`. The test that matters slices the file's bytes with the offsets it was given and asserts the result is what the pretty diff said it would replace — the same assertion `fix-range.test.ts` makes, through the other door.

The tests declare the contract's types **from the consumer's side** rather than importing them from the reporter. A test that imports the producer's type asserts that the code agrees with itself.
