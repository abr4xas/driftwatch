# 07: What is driftwatch's false negative rate?

**What to find out:** what [`discardReason()`](../../../src/extract/discard.ts) and the prose
gates throw away that was a real claim — the one measurement this project has never been
able to take.

**Type:** research

**Blocked by:** `06`

**Status:** open — highest ceiling in this directory

## The gap

Everything the project measures is on one side of the tool. `CLASSIFICATION.md` counts
findings and rules each one true or false, so **precision** is measured to four rounds of
detail and nine conditions. Nothing counts what never became a finding.

That is not an oversight, it is structural. Discards appear in no snapshot. There is no
artifact listing them. And inspecting them in a validation repo is precisely what ADR-0006
condition 9 forbids — [`corpus-repos.ts`](../../../scripts/corpus-repos.ts) draws the line in
those words: "Classifying its findings is the measurement and does not contaminate; opening
the repo to see what the tool discarded does."

So recall has never been estimated, and there is no hand-review route to estimating it. At
66 repos the discards are already tens of thousands of strings, and unlike findings they
have no natural ordering that puts the interesting ones first.

The discovery corpus removes both obstacles at once: nothing there is validation, so nothing
is contaminated by looking, and there are hundreds of thousands of discards to look at.

## What to do

Instrument the extractor to emit every discarded candidate with its `DiscardReason`, the
surrounding prose window, and the offset — the reason string already exists and the tests
already pin each rule by it, so the taxonomy is free. Run it over the discovery corpus. Then
ask, per discard, whether the document claims that path exists, and group the answers by
`DiscardReason`.

The output is a table: **rule → how many of its discards look like real claims**. That table
is the deliverable. It is not a recall figure, and it must not be quoted as one.

## Where the suspicion already points

The source files name their own costs, which is the most useful starting point:

- **`CONDITIONAL`** in [`context-prose.ts`](../../../src/extract/context-prose.ts) — the file
  calls it "the riskiest list in the file". It was measured over a 44-repo corpus where it
  suppressed exactly one finding, and the file says plainly: "that is evidence, not proof".
  `would`, `could` and `might` are common words; the rule is scoped to the sentence for that
  reason, and whether that scoping is enough is unknown.
- **`PLACEHOLDER_INDEXED`** — `/^[a-z]+[NMKXYZ]([-+]\d+)?$/`. The comment admits what it
  gives up: "a directory genuinely named `moduleX` or `partN`, which a tutorial repo really
  might have."
- **`isBareDirectory`** and **`isBareWord`** (ADR-0003, ADR-0004) — the two broadest rules in
  the file by volume. They are almost certainly right, and "almost certainly" has never been
  given a number.
- **`CREATE_IMPERATIVES`** — scoped to the opening of a sentence precisely because `add` and
  `create` are everywhere. The scoping is an argument, not a measurement.

## The trap to avoid

**A high number here is not a bug report.** Every one of these rules exists because a false
positive was worse than a false negative — `discard.ts` opens by saying so: "one false
positive costs more than ten false negatives, so when in doubt we discard." A rule that
throws away nine real claims to prevent one false positive may be correctly tuned.

What the table is for is **finding the rule that throws away ninety and prevents none**, and
distinguishing that from the ordinary cost the project already chose to pay. The output that
would justify a code change is a `DiscardReason` with a high rate of real-looking claims
*and* no corresponding false-positive class in `CLASSIFICATION.md` that it is defending.

## Why this is blocked by `06`

It needs the discovery corpus to exist, and the discovery corpus needs to fit on a disk.

## The honest outcome to be prepared for

The most likely result is that the broad rules are boringly correct and the interesting
signal is in one or two of the narrow ones. That is still worth having: "`isBareWord`
discards 40,000 strings and 30 of them looked like claims" converts an argued design
decision into a measured one, and ADR-0003 currently rests on the argument.
