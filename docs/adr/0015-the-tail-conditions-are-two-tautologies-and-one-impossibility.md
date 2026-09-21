# ADR-0015 — The tail conditions are two tautologies and one impossibility

- **Status:** accepted
- **Date:** 2026-09-21
- **Amends:** [ADR-0006](./0006-the-m1-precision-criterion.md) conditions 3, 4 and 5, which are withdrawn

## Context

[ADR-0006](./0006-the-m1-precision-criterion.md) set nine conditions for M1. Three of them describe the **distribution** of false positives across repositories:

> 3. **Median false positives per repo: 0.** The typical experience has to be zero noise.
> 4. **90th percentile ≤ 1.**
> 5. **No repo above 2.**

They have been met at every measurement, which is what makes this easy to miss: a condition that always passes is not obviously a condition that says nothing.

[ADR-0009](./0009-precision-is-counted-in-quiet-repos.md) then replaced condition 6 with the quiet-repo rate:

> **6. At least 90% of the corpus repos produce zero false positives**, whole corpus and validation alone.

It did not notice what that did to the three above it.

### Two of them became arithmetic

If at least 90% of repositories have zero false positives, then more than half do, so the **median is zero**. Condition 3 is an arithmetic consequence of condition 6.

And the 90th percentile of a distribution in which 90% of the observations are zero **is** zero, which is ≤ 1. Condition 4 is an arithmetic consequence of condition 6.

Neither can fail while 6 holds, and neither can be the reason 6 fails. They have been reported as met at every round since ADR-0009 without anybody noticing they could not have been reported otherwise.

### The third cannot be stated over a real repository

Condition 5 is the only one of the three that adds anything: 6 bounds **how many** repositories are noisy and 5 bounds **how noisy one may get**.

Ticket `35` tried to grow the corpus with thirty repositories chosen blind from the discovery corpus, and hit it. `BuilderIO/agent-native` produces **244 findings**. Demonstrating it is "not above 2" requires ruling on all 244, because a ceiling is only provable by exhaustion — and `corpus-bookkeeping.test.ts` encodes the same demand: every finding a snapshot carries needs a row and a ruling.

So the condition is not merely expensive over a repository of ordinary size. At 244 findings and the corpus's own false rate of roughly three in ten, "no repo above 2" is close to certainly **false**, and the only reason it has held is that the corpus was built out of small repositories — `scripts/corpus/repos.ts` says so plainly: *"the list is kept deliberately short and new additions are chosen small"*, for disk.

**Condition 5 is not a property of the tool. It is a property of having chosen repositories with four findings in them.**

### Every replacement denominator is worse, and that was measured

| formulation | what the corpus gives |
|---|---|
| false positives per **100 sources** | `raphaelmansuy/edgecrab`: 1 source, 2 false positives — **200**. `northword/zotero-format-metadata`: 1 source, 1 false — **100**. `saubakirov/KZ-IT-telegram-list`: 37 sources, 1 false — 2.7 |
| false positives per **finding**, per repo | the tiny-denominator defect ADR-0006 § "Why a rate over findings does not work" rejects, one level down: a repository with one finding that is false scores 100% noise |
| **the first finding is true**, per repo | 12 of 19 = **63%**, and 7 of its 8 failures are condition 6's 8 dirty repositories — it duplicates 6 and fails harder |

Normalising by sources inverts the distortion rather than removing it: it makes the smallest repositories look catastrophic and the largest look clean. Normalising by findings reintroduces the defect this project has now rejected twice. Conditioning on the first finding measures condition 6 again, worse.

There is no denominator that makes "how noisy may one repository get" comparable across repositories of incomparable size, because the question presupposes a scale the corpus does not have.

## Decision

**Conditions 3, 4 and 5 are withdrawn.** Conditions 1, 2, 6, 7, 8 and 9 are unchanged.

3 and 4 are withdrawn as **redundant**: they are implied by condition 6 and cannot fail independently of it.

5 is withdrawn as **unmeasurable**: it can only be demonstrated by exhaustive adjudication, its cost grows with repository size rather than with anything about the tool, and no reformulation of it survives contact with the corpus.

## Consequences

**What is lost, and it is real.** Nothing now bounds how bad a single repository may get. A repository where driftwatch produces forty false positives counts once against condition 6, exactly as one with a single false positive does, and a user in that repository is not consoled by the other 90%.

That loss is accepted rather than patched, for one reason: **condition 2 is the guard that matters and it is untouched.** Zero false positives among `fixable` findings, with no rate modulating it. A noisy repository wastes somebody's afternoon; a wrong autofix rewrites their document to point at the wrong file and the next agent acts on it. The first is an annoyance the project has always priced as cheap — *one false positive costs more than ten false negatives* is a statement about reporting, and `--fix` is the place where it becomes about damage.

**What it unblocks.** The corpus can grow. A repository joins it by being adjudicated well enough to answer condition 6 — *does it produce a false positive at all* — which costs one ruling when it does and all of them only when it does not. Ticket `35`'s thirty repositories become affordable at roughly the half-reading-per-repository ticket `34` measured, rather than the 306 readings conditions 3 to 5 demanded.

**What it does not change.** Condition 6 is still not met: 58 of 66 = 87.9% against its 90% bar, and withdrawing three conditions does not move it. Ticket `34` holds the open question of whether growing the corpus — which lowers the rate, because real repositories are noisier than the small ones the corpus was built from — is the honest thing to do anyway.

**The habit this is an instance of.** ADR-0009 withdrew a condition for measuring the wrong thing and did not audit its neighbours. This ADR withdraws three and should be read the same way: a condition that has never failed deserves the question *could it have?* before it is cited again.
