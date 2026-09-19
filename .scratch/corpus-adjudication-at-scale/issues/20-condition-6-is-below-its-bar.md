# 20: Condition 6 is at 87.9% and the table said 92.4%

**What to decide:** what happens now that ADR-0006's condition 6 does not hold on the whole
corpus — which of the open false-positive classes gets a rule, or whether M1 is restated.

**Type:** task

**Blocked by:** nothing

**Status:** open

## The arithmetic

Condition 6 reads: **≥ 90% of repos produce zero false positives, whole corpus and validation
alone.** Counted from the per-finding rows:

| | cited | actual |
|---|---|---|
| whole corpus | 61 of 66 = 92.4% | **58 of 66 = 87.9%** |
| validation alone | 29 of 32 = 90.6% | 29 of 32 = 90.6% |

The validation half holds. The whole-corpus half does not, and has not since round eighteen.

## How it went unnoticed

Nothing regressed in the code, which is why nothing caught it. Round eighteen widened
discovery to the other skills roots, adjudicated 30 findings, and **deliberately left three
classes open**:

| repository | class | round |
|---|---|---|
| `vercel/next.js` | `#anchor-a`, `#anchor-b` — literal placeholders | 18, D |
| `remix-run/react-router` | `+types/` — a literal placeholder | 18, D |
| `remix-run/react-router` | `app/entry.server.tsx` — a path in the reader's project | 18, E |
| `block/goose` | `agent/goose.txt` — a runtime log | 18, F2 |

Three repositories that had been clean joined the count. Rounds nineteen to twenty-one closed
every other class round eighteen opened and the ledger there is accurate — "33 findings, 11
false" — but nobody divided eleven across repositories and compared it to the bar. The
condition table carried 61 of 66 forward by hand from round sixteen.

**The numerator grew while the denominator stood still.**
[ADR-0009](../../../docs/adr/0009-precision-is-counted-in-quiet-repos.md) records the same
mechanism arriving from the other direction — a denominator that grew — and its conclusion
covers both: a proportion over a small numerator moves for reasons that are not the code.

`corpus-bookkeeping.test.ts` now divides the condition out of the rows, so this particular
lapse cannot repeat. What it cannot do is decide.

## What must not happen

[ADR-0009](../../../docs/adr/0009-precision-is-counted-in-quiet-repos.md) § "Honesty about how
the thresholds were chosen" admits 90% was picked with 93.2% and 88.89% in view, and defends
only the *shape* as a priori. **That admission is survivable once.** Discovering now that 87.9%
was always acceptable, or that the whole-corpus half was always the less meaningful one, would
end the criterion's credibility.

`ROADMAP.md` states the rule and it is the one that applies: *tune the heuristics, or accept
that the check does not get there and say so.*

Ticket `05` was written to pre-register exactly this decision **before** anybody saw a number
below the bar. That did not happen — the number was already there when it was found — so `05`
cannot do its job here and should be read as evidence for why it exists rather than as a
procedure to follow now.

## The options, none of them free

1. **Close a class.** Four of the eleven false positives are in the three repositories that
   broke it, and two are the same shape: a literal placeholder (`#anchor-a`, `#anchor-b`,
   `+types/`). `discard.ts` already refuses `NNNN`, `XXXX` and `iterN`; round eighteen's class
   D is the anchor-and-generated-directory version of a convention the extractor half knows.
   A rule there would take `next.js` and possibly `react-router` out of the count and restore
   the condition. **But** `next.js` and `react-router` are calibration repos, so ADR-0006
   condition 9 does not bill a replacement — and a rule derived to fix a failing condition is
   the shape this project should be most suspicious of.
2. **Accept and restate.** Say that condition 6 holds out of sample and not in aggregate, and
   that the aggregate half was measuring a corpus which has since grown its calibration group
   by rounds of deliberate widening. This is honest and it weakens M1's claim.
3. **Re-scope the condition.** Argue that the whole-corpus half never measured precision —
   ADR-0009's own argument is that calibration findings measure how much you tuned — and that
   validation alone is the condition. **This is option 2 wearing a disguise**, and it is the
   one to be most careful with, because it is exactly "discovering a reason why the number was
   always fine".

## What to do

1. Decide between 1 and 2 with Angel, not alone. This is the criterion the whole project is
   held to.
2. Whichever is taken, write `05` as part of it: the rule for the *next* time a number lands
   below a bar, committed with the decision rather than after it.
3. Update `PRODUCT.md` and `docs/spec/ROADMAP.md` if M1's claim changes, and say plainly in
   `CLASSIFICATION.md` what was decided and when.

## What is not in question

The eight other conditions, which are met. The validation measurement, which is unchanged at
90.6% and is the only out-of-sample number the project has. And the eleven false positives
themselves — every one has been adjudicated and none is in dispute.
