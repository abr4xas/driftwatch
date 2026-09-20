# 03: ~~The sampling design that keeps a 300-repo corpus honest~~

**Type:** research

**Status: withdrawn 2026-09-18.** Not answered — dissolved. The file is kept because the
reasoning it contains is the reason the design changed, and deleting it would leave
§"Two corpora, not one" in the [spec](../spec.md) looking like a preference rather than a
correction.

## What it asked

What replaces "a person reviewed every finding" when there are ~118 findings instead of 26,
without the certification quietly becoming a claim about a model.

Its answer-shape was: 100% human review of the uncertain band, a fixed random sample within
every class the model was confident about, the model's own error rate reported next to
ADR-0006's conditions, and per-class verdicts kept auditable.

## Why it no longer has a subject

Every clause of that depends on a model's output being **load-bearing for the
certification** — that is what a sampling design is *for*, estimating the error of something
you have decided to depend on. The two-corpus split removes the dependency rather than
managing it:

- Certification stays on 66 pinned repos with a human verdict per finding. It does not grow
  to 300, so there are not ~118 findings to adjudicate, so nothing needs sampling.
- Discovery produces no verdicts and reports no numbers. There is no population to sample
  from, because nothing it emits is ever quoted.

The honesty this ticket tried to buy with statistics is bought structurally instead, by the
rule in §"The hard limit": **no number computed over the discovery corpus is a precision,
and none of it is reported.** A rule that can be checked by reading a script beats an error
estimate that has to be maintained.

## What survived, and where it went

- **The machine-readable findings table.** `CLASSIFICATION.md` is 1120 lines mixing a
  17-round narrative with its data tables, and this ticket made splitting them
  non-optional. It still is, for a different reason: `01` cannot feed the 26 findings to
  anything while they are prose. Moved to `01`, where it is recorded as the larger half of
  that ticket's cost.
- **The prediction worth writing down first** — that the new findings land in 15-25 classes
  with ~5 genuinely new. That is still a real, checkable prediction, and it is now a
  prediction about **job 1 over the discovery corpus** rather than about adjudicating a
  grown certification corpus. If they land in 60 classes, class-based grouping does not
  work, and the honest response is to say so. Check it when job 1 first runs.
- **Naming the two dishonest ways out**, which is worth keeping in plain sight even though
  neither is reachable from the current design: review a subset and report as if it were the
  whole, or let a model sign the verdicts and keep quoting the precision figure.

## Comments

Withdrawn as part of the 2026-09-18 revision. The tell that this ticket was solving the
wrong problem is that it was the most elaborate file in the directory and existed entirely
to make something safe that nobody actually wanted.
