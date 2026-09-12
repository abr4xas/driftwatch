# M4 (first batch) — The output formats, and the documentation someone reads first

The full specification lives in `docs/spec/`. This file only delimits the scope of this batch of tickets and records what was decided before writing them.

`docs/spec/ROADMAP.md` § M4 lists six things. This batch takes **two** of them, deliberately out of the order the milestone lists them in:

1. `--json`, `--github`, `--sarif`.
2. The README, cut down to what a stranger needs, with everything else moved into a new `docs/guide/`.

The GIF, the one-page site and the published Action come after, in their own batch. The reason for the inversion is that **three of the four remaining deliverables are about showing the tool, and one is about the tool actually being usable by something other than a human eye.** A GIF of a `pretty` reporter is a GIF of what already exists; a GitHub Action with nothing but `pretty` to emit is an Action that pipes a terminal report into a log nobody expands. The formats are the substrate the other three stand on, and the Action ticket in particular is unwritable until `github` and `sarif` exist.

The README comes with them rather than after, because the acceptance criterion for the whole milestone is about the README and only about the README, and because the formats add a section to it — which is the moment to notice it already has fourteen.

## Scope

- `01` — the reporter seam: what every format is handed, and what the run has to start counting for the JSON contract to be expressible.
- `02` — `--format json` (and `--json`), the stable contract of `SPEC.md` § 6, including the fix plan decision M3 left to this milestone.
- `03` — `--format github`, native GitHub Actions annotations.
- `04` — `--format sarif`, SARIF 2.1.0 for Code Scanning.
- `05` — `docs/guide/` and the README that points at it.

## What the formats are for, which is not "the same report in other brackets"

Each of the three has exactly one consumer, and the consumer decides the shape:

| Format | Consumer | What it must not do |
|---|---|---|
| `json` | another program — a script, an editor, a dashboard | change shape between minor versions |
| `github` | the GitHub Actions runner, which renders annotations inline on the diff | emit anything that is not an annotation, since the log is the transport |
| `sarif` | GitHub Code Scanning, uploaded as an artefact | omit the rule metadata, which is what makes an alert readable a month later |

`pretty` has a fourth consumer — a person at a terminal — and it is the only one of the four that may change freely.

## The decision M3 handed to this milestone

M3's close: *"no machine-readable form of the fix plan — M4 owns the output formats and will decide whether it belongs in the JSON contract."*

**It belongs, as an optional field, and only where it can be true.**

- A finding carries `fix: { start, end, replacement }` **only under `--fix --dry-run`**, where the findings being reported are the same objects the plan was built from. The offsets are absolute byte offsets into the file as it is on disk at that moment, which is the only frame in which they mean anything.
- A run carries a top-level `fixes` block whenever `--fix` was passed, dry or not: what was applied, to how many files, and the edits.
- Under a **real** `--fix`, no finding carries `fix`. What is reported after a real fix run comes from a second full run of the pipeline (M3's decision, and the right one), so those findings have no relationship to the plan that was applied — the edits are in the top-level block, where they describe the past rather than an offer.

That asymmetry is the honest one, and writing it down here is cheaper than discovering it from a consumer that trusted an offset into a file that had already been rewritten underneath it.

SARIF has its own native `fixes` property with `artifactChanges` / `replacements`, and it is the same information. `04` uses it rather than inventing a vendor extension.

## What the JSON contract needs that does not exist yet

`SPEC.md` § 6 specifies `summary.claims`. **Nothing counts claims today.** `run()` extracts them, verifies them, and returns findings; the claims themselves are garbage by the time the reporter runs. `01` adds the count — not the claims — to `RunResult`.

This is worth one sentence of scepticism: a number in a contract that nothing produced is a number nobody checked. It is in the spec, it is cheap, and it is the only figure in the output that says *how much was examined* rather than *what went wrong* — which is the difference between "no drift" and "nothing was looked at", a distinction this tool already refuses to blur elsewhere (`selection.ts` refuses a selection that leaves no check enabled).

## The rules that apply to every format

- **stdout is the report; stderr is everything else.** The dirty-working-tree warning already goes to stderr, and it stays there — a `--format json` whose stdout does not parse because git had something to say is a broken contract.
- **`--quiet` is a `pretty` concept and is ignored by the other three.** It means "show problems only, no summary". A JSON document without its summary is not quieter, it is invalid against its own contract; a SARIF file without its `tool` block does not upload.
- **Colour is a `pretty` concept.** `NO_COLOR` and the TTY check never reach the other three.
- **Exit codes do not depend on the format.** Same counts, same `--strict`, same three codes.
- **No new dependency.** SARIF is JSON with a schema url in it. The cold-start budget applies here like everywhere else, and the formats are behind the same dynamic import `pretty` is.

## What does not change

- The pipeline. `run()` already returns everything the formats need except the claim count; nothing about a check, an extractor or a fix learns that a second reporter exists.
- `pretty`'s output, byte for byte. It has snapshot tests and a fixture suite, and this batch is additive. If a `pretty` snapshot moves, something was refactored that should not have been.
- The exit-code contract, the config, the check ids.

## Acceptance for this batch

The milestone's own criterion — *someone who has never seen the project understands what it does in under 15 seconds, looking only at the README* — cannot be self-certified, and `05` does not pretend to. What it can do is make the claim falsifiable: the README's first screen must carry the sentence, the console example and the install line, and nothing else, so the 15 seconds are spent on those three.

For the formats, four things that are checkable:

- Every format renders the same run: same findings, same counts, same exit code. One fixture, four snapshots.
- The JSON output validates against the contract in `SPEC.md` § 6 — every documented field present, `file` relative to `root`, `line` and `column` 1-indexed — and the test asserts the **shape**, not a snapshot of one repo's findings.
- The SARIF output validates against the 2.1.0 schema, and a run with zero findings is still a valid SARIF document with its tool block.
- `--format github` emits one annotation per finding and nothing else on stdout, with the message escaped so a multi-line one cannot break out of its annotation.

## Out of scope in this batch

- The GIF, the one-page site, the `driftwatch/action@v1` repository. Next batch; `03` and `04` are what make them writable.
- Publishing. `.scratch/first-release/` owns it and it is a manual step that is not code.
- `--init`, owed since M2 and still ownerless. It is not made less ownerless by being mentioned in a fourth spec.
- `--watch` (M6), the tier 2 checks (M5).
- Any new check, any change to a heuristic. This batch must not move a corpus snapshot, and if it does, something is wrong that has nothing to do with output formats.

## Decisions taken

- [ADR-0001](../../docs/adr/0001-the-specification-lives-inside-the-repo.md): `SPEC.md` § 5 and § 6 are amended in the same change that implements them, not afterwards. Where the implementation needs a field § 6 does not list, the spec gains it in that ticket's diff.
- M3's deferral of the fix plan, closed above.

---

## Closed 2026-09-11

All five tickets are `done`. `--format json`, `--format github` and `--format sarif` render, the README is 82 lines, and `docs/guide/` holds the 130 it stopped carrying.

**What shipped:** `src/report/types.ts` (what every reporter is handed), `src/report/json.ts`, `src/report/github.ts`, `src/report/sarif.ts`, a format dispatch in `cli/main.ts` with one dynamic import per branch, `RunResult.claims`, `Check.title` / `Check.description`, `SPEC.md` § 5 and § 6 amended, five documents under `docs/guide/`, and `test/docs-links.test.ts`.

**Verification:** 521 tests (496 before), `pnpm lint`, `pnpm typecheck`, `pnpm build`, the tool silent over its own repo and over `docs/`, the anchor run over all 30 documents green — and **the corpus green at 66 repos with no snapshot moved**: 26 findings, 14 calibration and 12 validation, the same numbers M2 closed on. This batch was not supposed to move one, and it did not.

**The anchor run stopped being vacuous.** `driftwatch.docs.config.ts` was added in M2 with a note saying it resolved nothing, because no document in the repo wrote a `](...#...)` link, and that it was kept for the day somebody did. The guide is that day: it cross-references itself with anchors, and the run now checks 30 documents. Confirmed by breaking one on purpose and watching it fail.

**Three decisions worth carrying forward:**

- **The fix plan is asymmetric, and that is the honest shape.** A per-finding byte range only exists under `--fix --dry-run`. After a real fix the findings come from a second full run over rewritten files, so a range from the old plan would index a file that no longer exists in that form. The top-level `fixes` block still describes what was applied, as the past rather than as an offer.
- **`summary.claims` was a field in the contract with no producer.** Nothing counted claims; `run()` extracted them and dropped them. It is the only number that separates "no drift" from "nothing was looked at" — the distinction `selection.ts` already refuses to blur — and it is the one a green CI run should be read with.
- **A check now carries its own description.** SARIF's `rules[]` needed prose, and the alternative was a lookup table in a reporter that drifts from the checks it describes. It is also what `docs/guide/checks.md` is a longer form of.

**What this batch did not do, and said so up front:** the GIF, the one-page site, and `driftwatch/action@v1`. The `github` and `sarif` formats are what make the Action worth writing; before them it would have piped a terminal report into a log nobody expands.

**What is open:** `--init`, owed since M2 and still ownerless — four specs have now mentioned it. Two replacement validation repos, owed since M2's close. And the M4 acceptance criterion itself, which cannot be self-certified: the README's first screen is now the tagline, the console block and the install line, and whether that is fifteen seconds is a question for somebody who has not read this repository.
