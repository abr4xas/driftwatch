# 01: The reporter seam, and the number nothing counts

**What to build:** the shared surface every format is handed, so that `02`, `03` and `04` are three files that read a result rather than three variations on `renderPretty`.

**Blocked by:** nothing.

**Status:** done

## What has to change

- [ ] **`FixOutcome` and `FixEntry` move out of `report/pretty.ts`** into `src/report/types.ts`. They are already imported by `cli/main.ts` and `fix/session.ts`, neither of which wants the pretty reporter; with four formats, the pretty one owning the type is just where it happened to be written first.
- [ ] **`FixEntry` gains the offsets and the finding it came from.** `entriesOf` in `fix/session.ts` already pairs `plan.edits[i]` with `plan.findings[i]` and then throws the pairing away, keeping only `file`/`line`/`before`/`after`. `02` and `04` both need the byte range, and `02` needs to know *which finding* an edit belongs to in order to attach it. Carry the `Finding` by reference rather than inventing a synthetic id: object identity is exact, and any key built from `file:line:column` is a key that two findings on one line can collide on.
- [ ] **`RunResult` gains `claims: number`.** `SPEC.md` § 6's `summary.claims` has no producer. Count them in `run()` where they exist — the array, not the claims, survives the function.
- [ ] **A `format` dispatch in `cli/main.ts`.** One place that maps the parsed `Format` to a renderer, replacing `assertNotYetImplemented`'s `if (args.format !== 'pretty')`. Keep the dynamic import: a `pretty` run must not pay to load the SARIF builder, and vice versa.

## What to decide

- [ ] Whether the three new formats take `PrettyOptions` or their own. They should not: `color` and `quiet` are meaningless to all three (spec, § "The rules that apply to every format"). Give each renderer the narrowest input it needs — most of them need `RunResult` and, optionally, `FixOutcome`.

## Tests

- [ ] The existing `pretty` snapshots do not move. That is the assertion that this ticket refactored rather than changed.
- [ ] `claims` is greater than zero on a fixture that produces no findings at all. This is the whole reason the field is in the contract: a clean run that examined 200 claims and a clean run that examined none are not the same result.

## Out of scope

- Rendering anything new. This ticket ends with `--format json` still refused, on the same code path as before.

## Comments

Closed. No new tests of its own beyond the `claims` assertion in `test/formats.test.ts`; the `pretty` snapshots not moving is what says this was a refactor.

`FixOutcome` and `FixEntry` now live in `src/report/types.ts`. `FixEntry` gained `range` and the `Finding` by reference, and `entriesOf` in `fix/session.ts` became a `flatMap` that **drops** an edit whose finding is missing rather than reporting one with a fabricated line number — the old `?? 0` would have produced an entry pointing at line zero.

`RunResult.claims` is the claim count and not the claims: the array does not survive `run()`, and nothing downstream wants it to.

The format dispatch is `rendererFor` in `cli/main.ts`, one dynamic import per branch, and it is where `--quiet` and colour stop. The question the ticket asked — whether the three new formats take `PrettyOptions` — answered itself the moment the dispatch was written: `github` takes nothing but the result.
