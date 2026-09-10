# ADR-0006 — The M1 precision criterion

- **Status:** accepted; condition 6 withdrawn by [ADR-0009](./0009-precision-is-counted-in-quiet-repos.md)
- **Date:** 2026-09-09
- **Replaces:** the acceptance criterion in `ROADMAP.md` § M1 and the gate line in `AGENTS.md` § "Order of work"

## Context

The original criterion said:

> running over a corpus of ≥10 real public repos, the hand-reviewed false positive rate is < 5%.

It was actually measured, over 24 public repos and 111 context sources, with three rounds of out-of-sample validation. The record is in `test/corpus/CLASSIFICATION.md`. The conclusion was not "needs more tuning": it was that **the criterion is not measurable**.

## Why a rate over findings does not work

### 1. The denominator collapses exactly when the tool works

A precise tool is quiet. After fifteen corrections, the entire corpus produces 9 findings. A single false positive out of 9 is 11%. To *distinguish* 5% from 6% you need 20 findings or more, and that demands either a corpus of badly rotten repos or a noisy tool.

**The criterion needs the disease it aims to prevent in order to take its temperature.**

### 2. It orders the results wrongly

| Tool | True | False | Rate | Passes? |
|---|---|---|---|---|
| A | 1 | 0 | 0% | yes |
| B | 8 | 1 | 11% | no |

B is strictly more useful than A and the criterion rejects it. Any metric that prefers A over B is measuring something else.

### 3. It can be passed by staying silent

A tool that reports nothing has a 0% false positive rate. The original criterion had no coverage floor at all, so the cheapest way to meet it was to find nothing.

### 4. It is not what happens to a person

Nobody runs driftwatch over 24 repos. They run it once, on theirs. What they see is an **absolute number** of doubtful lines in that run, not a global proportion. A 10% distributed as "one repo with twelve false positives and eleven clean repos" and a 10% distributed as "one false positive in every repo" are the same figure and two different products.

### 5. It did not say where to measure

This is the gravest defect, and the one that was not obvious until measuring. The criterion did not require the measurement to be **out of sample**. Tuning heuristics while looking at a corpus's findings and then measuring precision over that same corpus does not measure precision, it measures how much you tuned. During the work, three validation groups had to be burned to avoid falling into that.

## Decision

The M1 acceptance criterion now has four parts. All four hold or M1 does not close.

### A. Hard floor — the catastrophic failure

1. The `false-positive-traps` fixture closes with **zero findings**.
2. **Zero false positives among the findings marked `fixable`**, over the whole corpus.

The second is the one that really matters, and the original criterion ignored it entirely. A visible false positive is an annoyance: someone reads the line, shrugs and moves on. An **autofixable** false positive is something else: `--fix` rewrites the document to point at the wrong file, and the next agent acts on that lie with confidence. That is not noise, it is corruption. It admits no rate: it admits zero.

### B. The shape of a run — what a person sees

Counted per repo, over the whole corpus:

3. **Median false positives per repo: 0.** The typical experience has to be zero noise.
4. **90th percentile ≤ 1.**
5. **No repo above 2.**

Two doubtful lines in a run are forgiven. From the third on it reads as a pattern, and the person starts distrusting the true ones too, which is the failure that kills the project.

### C. Usefulness — so that silence is not enough

6. ~~**Aggregate precision ≥ 80%** over the validation group: at most one false positive per four findings.~~ **Withdrawn 2026-09-10 by [ADR-0009](./0009-precision-is-counted-in-quiet-repos.md)**, which replaces it with a quiet-repo rate. It was measured four more times as the validation group grew from 8 repos to 18, and it turned out to be a rate over findings — the defect this ADR's own § "Why a rate over findings does not work" rejects two sections earlier.
7. **At least one true positive in the validation group.**

Number 7 is the missing coverage floor. Without it, the easiest way to pass is to report nothing, because a mute tool has zero false positives.

It is asked over the validation group and not the whole corpus on purpose: what has to be demonstrated is that the tool finds real drift in repos nobody used to tune it. A true positive in a calibration repo does not prove that, because the rules were written knowing it was there.

### Correction to this condition, before measuring

The first wording said "at least one true positive per three repos in the corpus". It was badly specified, and it was corrected before taking the measurement that would evaluate it, not after it failed.

The problem: the number of true positives depends on **how much drift the chosen repos actually have**, not on the tool's quality. Adding five healthy repos to the corpus would have dropped the ratio and "failed" the criterion without anything changing in the code. A bar that gets worse when you widen the sample is measuring the corpus, not the tool.

The corrected form does not have that problem and still closes the silence loophole.

### D. Methodology — where it is measured

8. The corpus has **≥20 repos**, of which **≥8 form a validation group** that was not looked at to derive any heuristic.
9. **Contamination rule:** if the findings or the discards of a validation repo are **inspected**, that repo moves to calibration and a new one has to be added. Conditions 6 and 7 are measured over validation; those in A and B, over the whole corpus.

Classifying a validation repo's findings is the measurement itself and does not contaminate it. What contaminates is **looking at more than the measurement needs**: opening the repo, reviewing what the tool discarded, hunting for the why. The first wording said "if they are used to tune a rule", and that is too lenient: whoever saw the data cannot unsee it, and the intention not to use it is not verifiable by anyone. The strict version is, because inspecting leaves a trace in the work.

## Why 80% and not 5%

`BRIEF.md` sets the tolerance in prose: "a tool that reports 6 real problems gets used every day; one that reports 20 with 8 doubtful ones gets uninstalled on first use".

Those numbers say something precise that 5% never said. "20 with 8 doubtful" is **60% precision**, and the brief calls it intolerable. "6 real problems" is 100%. So the real tolerance sits between 60% and 100%, and closer to 100%.

**5% fell outside that range on the impossible side**, and 60% on the unacceptable side. 80% is the strictest point a realistically sized corpus can resolve: with 10 findings it admits 2 false ones, and that is a difference you can check by hand. 5% with 10 findings admits none, which turns it into "zero false positives" dressed up as a percentage.

## Honesty about how the thresholds were chosen

The numbers in section B are informed by the observed distributions: the per-repo false positive counts measured were 1, 1, 1, 2 and 2 before the last corrections, and 1 afterwards. Choosing "median 0, P90 ≤ 1, max ≤ 2" with that data in view is not an a priori choice, and it is not worth pretending it is.

What is a priori is the **shape** of the criterion: per repo instead of global, with a separate hard floor for the autofix, with a coverage floor, and measured out of sample. That shape was decided from the five defects above, not from the numbers.

## Consequences

- The criterion stops being unreachable without becoming lax: the autofix hard floor is **stricter** than anything the original said.
- Certifying M1 requires an out-of-sample measurement with ≥8 repos. At the time of writing this, none exists: of the three validation rounds, two were contaminated by deriving rules from them and the third has 3 repos. **M1 still does not close**, now for lack of measurement rather than lack of precision.
- The contamination rule is encoded in `scripts/corpus.ts`, in the `holdout` field and its comment, so it does not depend on anyone remembering it.
- If a future measurement fails condition 6 or 7, the answer is not to loosen the threshold: it is going back to the heuristics, or accepting that `path/missing` does not get there and saying so.
