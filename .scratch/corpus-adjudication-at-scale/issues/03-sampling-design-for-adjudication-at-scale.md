# 03: The sampling design that keeps a 300-repo corpus honest

**What to find out:** what replaces "a person reviewed every finding" when there are ~118
findings instead of 26, without the certification quietly becoming a claim about a model.

**Type:** research

**Blocked by:** `01`

**Status:** open

## The problem stated precisely

[`test/corpus/README.md`](../../../test/corpus/README.md) says the verdict requires a person,
and [ADR-0007](../../../docs/adr/0007-the-corpus-does-not-run-in-ci.md) keeps the corpus out
of CI for that reason. `CLASSIFICATION.md` earns its authority by honouring that 26 times
over 17 rounds.

At 0.39 findings per repo, 300 repos produce ~118 findings, ~92 of them new. Nobody will
review 92 findings the way 26 were reviewed. Two dishonest ways out exist and both should be
named so they are recognisable if anyone reaches for them: review a subset and report as if
it were the whole, or let a model sign the verdicts and keep quoting the precision figure.

## The shape of an answer

Not designed here, but the constraints it has to satisfy are known:

- **100% human review of the uncertain band**, however that band is defined.
- **A fixed random sample within every class the model was confident about**, sized so it
  can actually estimate that class's error rate. This is the part that makes the whole thing
  a measurement rather than an assertion.
- **The model's own error rate reported next to the conditions**, not buried. If the
  certification depends on a classifier being right 97% of the time, the reader is entitled
  to the 97% and to how it was obtained.
- **Per-class verdicts stay auditable.** Today any finding can be traced to the round that
  ruled on it. Whatever replaces that has to preserve the trace, including "adjudicated by
  class, sample of N reviewed, reviewer, date".

## The prediction worth writing down first

The deferred plan predicted the ~92 new findings land in **15-25 classes, with ~5 genuinely
new**. Write that down before running anything, and check it after. If they land in 60
classes, class-based adjudication does not work and the honest response is that the corpus
does not scale past hand review — which is a real finding, not a failure.

## Where the bookkeeping goes

`CLASSIFICATION.md` is 1120 lines and mixes a 17-round narrative with its data tables.
The deferred plan already flagged splitting them. This ticket makes that non-optional: a
sampling design needs a machine-readable table of findings, and `corpus-bookkeeping.test.ts`
already asserts that the totals cited in the document match the snapshots. Whatever shape
the table takes has to keep that test meaningful.
