# ADR-0009 — Precision is counted in quiet repos, not in a ratio over findings

- **Status:** accepted
- **Date:** 2026-09-10
- **Amends:** [ADR-0006](./0006-the-m1-precision-criterion.md) condition 6, which is withdrawn

## Context

[ADR-0006](./0006-the-m1-precision-criterion.md) set nine conditions for M1. Eight of them have held through every measurement. Condition 6 — **aggregate precision ≥ 80% over the validation group** — was measured four more times after certification, and behaved like this:

| Round | Validation group | Condition 6 |
|---|---|---|
| Certification, 8 repos | 3 true of 3 | 100% |
| +`spatie/bloom` | 3 of 4 | 75% |
| +4 repos | 3 of 5 | 60% |
| +5 repos | 3 of 8 | 37.5% |
| after fixing the four classes those repos exposed | 3 of 5 | 60% |

Growing the validation group from 8 repos to 18 took it from 100% to 37.5%. Closing four false-positive classes took it back to 60%, **removing three false positives and zero true positives** across all 44 repos. It has never reached 80% again, and the last round showed why it cannot.

**Condition 9 prices a fix.** Deriving a rule from a validation repo's finding moves that repo to calibration and requires a replacement. Pay that for the last round — `laravel/vet` and `vercel-labs/marketing-team-eve-template` move out — and the group becomes `typescript-sdk`'s 3 true positives plus `bloom`'s 1 false positive: **3 of 4 = 75%**. Under the bar, with two fewer repos, and no work left that could raise it.

So the sequence is: measure honestly, the number falls; fix what the measurement exposed, it rises but not to the bar; pay the contamination price, it falls again. **A criterion that cannot be met by improving the tool is measuring the wrong thing.**

## The argument was already in ADR-0006

Its own § "Why a rate over findings does not work" opens:

> A precise tool is quiet. […] **The criterion needs the disease it aims to prevent in order to take its temperature.**

That is exactly right, and then condition 6 is a rate over findings. The ADR diagnosed the defect, rejected 5% for having it, and reintroduced it at 80% one threshold down. Fourteen findings over 44 repositories is a denominator where one reclassification moves the result by 7 points.

## Decision

Condition 6 is withdrawn and replaced by the **quiet-repo rate**:

> **6. At least 90% of the corpus repos produce zero false positives**, measured over the whole corpus **and** over the validation group taken alone.

Conditions 1 through 5 and 7 through 9 are unchanged. In particular condition 2 (zero false positives among `fixable` findings, with no rate modulating it) and condition 7 (at least one true positive in the validation group, so that silence is not enough to pass) both stay exactly as they are — condition 7 is what stops the new rule from being satisfied by a tool that reports nothing.

### Where that leaves the current measurement

| Scope | Quiet repos | Status |
|---|---|---|
| Whole corpus | 41 of 44 = **93.2%** | met |
| Validation group | 16 of 18 = **88.89%** | **not met**, by 1.1 points |

**The criterion is still unmet.** That is deliberate: a replacement written so that today's numbers pass it would be the same mistake in a new coat.

The difference is that this one is **reachable**. Closing `bloom`'s class — argumentative prose naming a path in order to reject it — makes that repo quiet. Even after condition 9 moves it to calibration, validation becomes 16 of 17 = **94.1%** and the whole corpus 42 of 44 = **95.5%**. Improving the tool improves the number, which was not true of a ratio over findings.

## Why the denominator moves from findings to repos

**Because repos are what we have many of, and findings are what we deliberately have few of.** The founding rule of the project is that one false positive costs more than ten false negatives, which *guarantees* a small numerator. Every ratio built on it is unstable by construction. The corpus has 44 repositories and 14 findings; the count that can carry a percentage is the first one, and it grows every time a repo is added.

**Because a user has one repo.** Nobody experiences aggregate precision. They run the tool once, on their own repository, and what determines whether it stays installed is whether *that run* was noisy. "93% of real repositories get no false positive" is a statement about their experience. "78.6% aggregate precision" is a statement about our corpus.

**Because it fails in the right direction.** A repo-level count treats one spurious finding in a repo with ten real ones the same as one in a repo with none — and that is correct, because the damage of crying wolf is not divided by how much else you got right in the same run.

## What is lost

**We can no longer quote a precision percentage as a gate.** People ask for one, and "78.6% aggregate" is a number we will still report in `CLASSIFICATION.md`; it just stops deciding anything. Anyone comparing driftwatch to another linter on precision will be comparing against a figure we treat as descriptive.

**The new rule is blind to how much a repo got right.** A repo with 1 false positive and 12 true positives counts as unquiet, exactly like a repo with 1 false positive and nothing else. That is the intended trade, stated above, but it is a real loss of resolution.

**The threshold is not a priori, and this ADR does not pretend otherwise.** 90% was chosen with 93.2% and 88.89% in view. What *is* a priori is the shape — counted per repo, over a denominator that grows, improvable by fixing the tool — and that shape came from the four rounds above, not from the numbers. This is the same admission ADR-0006 made in its § "Honesty about how the thresholds were chosen", and it applies here for the same reason.

## Consequences

- `ROADMAP.md` § M1's four-part summary and `test/corpus/CLASSIFICATION.md`'s criterion table both change. M1 remains **eight of nine**, now failing the new condition 6 instead of the old one.
- The corpus floor in condition 8 (≥20 repos, ≥8 in validation) is now doing double duty: it is also the denominator of condition 6. At 20 repos, 90% admits two unquiet ones, which is coarse. It is not raised here, but a corpus below ~30 repos makes this condition nearly as blunt as the one it replaces, and that is worth knowing before anyone trims the corpus for speed.
- The two false positives that remain unfixed each have their cause named in `CLASSIFICATION.md`. Neither is a mystery, and one of them — a generated file described with no generation word — is recorded there as **not reachable by any prose rule**, which is a limit rather than a to-do.
