# 01: Is Jev calibrated against the 26 verdicts we already recorded by hand?

**What to find out:** whether a System One model's probabilities mean anything on *our*
distribution, measured against the only labelled data the project has.

**Type:** research

**Blocked by:** nothing

**Status:** open

This is the cheapest ticket in the directory and it gates the other three research ones. It
touches no driftwatch source, adds no dependency, and its output is a paragraph in this
directory saying yes or no.

## The setup

The corpus produces **26 findings, 20 true and 6 false**, every one of them classified by
hand against the real repository across 17 rounds, with the round recorded per repo in
[`CLASSIFICATION.md`](../../../test/corpus/CLASSIFICATION.md). Eleven false-positive classes
have been named and closed; five were open as of round seventeen. That is a labelled set
with provenance, which is rare and is the whole reason this ticket is possible.

Feed each finding — rule id, the claimed string, the sentence around it, the context it sat
in (link / inline code / table / prose) — and ask for two structured outputs:

1. The false-positive class it belongs to, from the closed list, or `new`.
2. True or false positive, with the probability.

Then compare against what a person actually wrote.

## What would count as a pass

- **Class agreement** on the findings whose class is already named. Disagreement here is
  disqualifying in a way the verdict is not: if it cannot reproduce classes a human already
  drew, it cannot propose new ones.
- **Calibration in the band that matters.** The only use proposed for this model is a
  threshold that routes uncertain findings to a person. So the question is not accuracy, it
  is whether the things it calls 0.9 are right about nine times in ten. Check the high-
  confidence band specifically.
- **No confident false "true positive".** A false positive waved through with high
  confidence is the exact failure the corpus exists to catch. One of those is worth more
  evidence against than ten hedged mistakes.

## What this cannot establish

**26 is a small sample and 6 false positives is a very small one.** Nothing measured here
generalises to 118 findings; at best it rules the approach out. Say so in the write-up
rather than quoting a percentage — the project has been here before, and
[ADR-0009](../../../docs/adr/0009-precision-is-counted-in-quiet-repos.md) is the record of
what happens when a ratio over a small numerator is treated as a criterion.

There is also a subtler contamination risk worth naming: several of these repos are public
and `CLASSIFICATION.md` itself is public. A model that has seen this repository is not
being tested on held-out data. It cannot be ruled out, only noted.

## Practical

Confirm early access is actually obtainable before planning anything around it. If it is
not, this whole directory stays a document and that is a fine outcome.

## Comments

The result of this ticket is *not* a decision to use the model. It is a decision about
whether `02`, `03` and `04` are worth opening.
