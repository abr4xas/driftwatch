# 05: Pre-register the decision rule before a single repo is cloned

**What to build:** a written statement of what happens to condition 6 at 90%, 88% and 80%,
committed before the corpus grows.

**Type:** task

**Blocked by:** nothing

**Status:** open, and **no longer blocking** as of 2026-09-18 — it used to block all cloning

## What changed

This ticket was written against a plan that grew `test/corpus/` to 300 repos, and its whole
force came from the denominator moving. Under §"Two corpora, not one" in the
[spec](../spec.md) **the certification corpus does not grow**: the discovery corpus takes
the mass, and ADR-0006's conditions are counted over 66 repos exactly as they are today.

So the urgency is gone. The ticket is not, for two reasons:

1. `04` may promote individual repos from discovery into certification, which moves the
   denominator a little. The arithmetic below applies at that scale too, just more slowly.
2. The reasoning in §"Why it has to be written first" does not depend on the corpus growing
   at all. It is about what happens the next time anyone looks at a number before deciding
   what the number means.

It is now a cheap piece of hygiene to do whenever, rather than a gate on anything.

## The arithmetic

5 of 66 repos carry a false positive, so 7.6%. Project that onto a corpus of 300 and the
expectation is ~92.4% of repos clean — **barely over condition 6's 90% bar**, with a
binomial standard deviation of about 4.6 repos.

So: growing the corpus can break condition 6 with **no code regression whatsoever**. The
number moves because the denominator grew, which is the same mechanism that took the old
condition 6 from 100% to 37.5% and produced
[ADR-0009](../../../docs/adr/0009-precision-is-counted-in-quiet-repos.md). That is the
hazard the two-corpus split avoids by not growing the denominator — and the hazard that
returns, in miniature, every time `04` promotes a repo.

## Why it has to be written first

ADR-0009 §"Honesty about how the thresholds were chosen" admits that 90% was picked with
93.2% and 88.89% in view, and defends only the *shape* as a priori. That admission is
survivable once. Doing it a second time — seeing 88% at 300 repos and discovering a reason
why 88 was always the right bar — would end the criterion's credibility entirely.

The rule from [`docs/spec/ROADMAP.md`](../../../docs/spec/ROADMAP.md) is the one that
applies: tune the heuristics, or accept that the check does not get there and say so.
**Never loosen a threshold after seeing the number.** That is the lesson ADR-0009 already
paid for.

## What to write down

For each of 92%+, 90-92%, 88-90% and below 88%: whether M1 stands, what work the outcome
obliges, and what gets published. Include the case nobody wants — the number comes back
honest and below the bar and there is no heuristic left that would raise it — because that
is the case the document exists for.

Commit it before the first `pnpm corpus` run against a grown repo list — which now means
before `04` promotes its first repo, not before a 300-repo clone that is no longer planned.
