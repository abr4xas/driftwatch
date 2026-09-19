# 01: Does grouping reproduce the classes we already named by hand?

**What to find out:** whether automatic grouping can reproduce false-positive classes a
person already drew — which is the only prerequisite for letting it propose new ones.

**Type:** research

**Blocked by:** nothing

**Status:** open — **reframed 2026-09-18**, see §"What this ticket used to ask"

## What this ticket used to ask

It asked whether Jev is *calibrated against the 26 verdicts*, and it gated every other
research ticket in this directory. That framing came from the single-corpus design, where a
model's output would have fed the certification and therefore had to be trustworthy enough
to depend on.

Under §"Two corpora, not one" in the [spec](../spec.md) **no model output is ever a
verdict**, so there is nothing to calibrate and nothing to gate. What is left is a much
smaller and more useful question: is the grouping in job 1 good enough to be worth running
over 780 findings nobody will read individually?

The verdict half of the old ticket is withdrawn along with `03`.

## The setup

The corpus produces **26 findings, 20 true and 6 false**, every one classified by hand
against the real repository across 17 rounds, with the round recorded per repo in
[`CLASSIFICATION.md`](../../../test/corpus/CLASSIFICATION.md). Eleven false-positive classes
have been named and closed; five were open as of round seventeen.

Feed each finding — rule id, the claimed string, the sentence around it, and the context it
sat in (link / inline code / table / prose) — and ask for the class it belongs to, from the
named list, or "new". Compare against what a person wrote.

Note that this does not contaminate anything, by the project's own rule: classifying a
finding *is* the measurement. It is opening the repo to inspect discards that contaminates,
and this ticket does not do that. `07` does, and only in the discovery corpus.

## What would count as a pass

- **It reproduces the named classes.** The closed classes are sharply defined — an index
  placeholder, a dependency protocol specifier, a version-or-date metavariable, another
  agent tool's configuration root. If it cannot recover distinctions a person already drew
  and wrote down, it will not propose useful new ones over unlabelled material.
- **The five open classes group together rather than scattering.** The three at
  `CLASSIFICATION.md` line 1058 — a crate nickname, a foreign project's file, a generated
  bundle described without a generation word — are the ones job 1 exists to crack. Watch
  whether they land in one bucket, three buckets, or eleven.
- **Confidence orders the work sensibly.** The only use for confidence in this design is
  putting the ambiguous rows at the top of a table a person reads. Low confidence on the
  genuinely ambiguous findings is a pass; high confidence spread evenly is a warning that
  the signal is not there.

## What this cannot establish

**26 is a small sample**, and the six false positives are a very small one. Nothing here
generalises; at best it rules the approach out cheaply. Do not quote a percentage —
[ADR-0009](../../../docs/adr/0009-precision-is-counted-in-quiet-repos.md) is the record of
what this project already paid for treating a ratio over a small numerator as a criterion.

There is also a contamination risk of a different kind worth naming: these repos are public
and `CLASSIFICATION.md` is public. A model that has seen this repository is not being tested
on held-out data. It cannot be ruled out, only noted.

## The bookkeeping this needs

The findings have to be machine-readable to be fed to anything, and today they are prose
across 1120 lines mixing a 17-round narrative with its data tables. The deferred plan
already flagged splitting the two; this ticket is the first thing that actually requires it.

Whatever shape the table takes has to keep `test/corpus-bookkeeping.test.ts` meaningful —
it asserts that the totals cited in the document match the snapshots, and that assertion is
worth more than the convenience of any particular format.

This is the honest cost of the ticket, and it is larger than the experiment itself.

## Practical

Confirm early access to a System One model is actually obtainable before planning around it.
If it is not, nothing here is blocked: the design in the spec survives the model being
swapped for any classifier with calibrated output, and `06` and `07` do not need one at all.

## Comments

The result of this ticket is *not* a decision to use a model. It is a decision about whether
job 1 is worth building — and, because `06` and `07` no longer depend on it, a negative
result costs this directory much less than it would have under the old framing.
