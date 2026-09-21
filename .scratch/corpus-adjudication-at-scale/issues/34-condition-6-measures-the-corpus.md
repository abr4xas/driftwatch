# 34: Condition 6 measures the corpus, and the corpus is small on purpose

**What to decide:** what to do about a condition that has not held since round eighteen, now
that growing the corpus is shown to make it worse rather than better.

**Type:** research

**Blocked by:** nothing. Reads clones already on disk.

**Status: new 2026-09-21.** Measured. Three of the five options are closed by the measurement;
the decision between the other two is Angel's.

## What condition 6 is

Not what it was. [ADR-0006](../../../docs/adr/0006-the-m1-precision-criterion.md) set it as
*aggregate precision ≥ 80% over the validation group*, and
[ADR-0009](../../../docs/adr/0009-precision-is-counted-in-quiet-repos.md) withdrew it after
four measurements, on a sentence worth keeping:

> A criterion that cannot be met by improving the tool is measuring the wrong thing.

What replaced it:

> **At least 90% of the corpus repos produce zero false positives**, over the whole corpus
> **and** over the validation group taken alone.

It counts **repos**, not findings, which is what makes it robust to one reclassification.

## Where it stands

| | measured | |
|---|---|---|
| whole corpus | **58 of 66 = 87.9%** | **not met** |
| validation alone | 29 of 32 = 90.6% | met |

Not met since round eighteen, found in ticket `20`, resolved there as "recorded, not chased".
Round twenty-seven moved nothing: every finding it withdrew was true.

Eight repositories carry a false positive. **Five of the eight are calibration**, so closing
them costs nothing under condition 9:

| repository | FPs | class | group |
|---|---|---|---|
| `vercel/next.js` | 2 | `placeholder` (`#anchor-a`, `#anchor-b`) | calibration |
| `raphaelmansuy/edgecrab` | 2 | `crate-nickname`, `foreign-project` | **validation** |
| `block/goose` | 1 | `runtime-log` | calibration |
| `fancy1108/Clutch` | 1 | `comma-separated-globs` | **validation** |
| `northword/zotero-format-metadata` | 1 | `generated-bundle` | **validation** |
| `remix-run/react-router` | 1 | `readers-project` | calibration |
| `saubakirov/KZ-IT-telegram-list` | 1 | `another-tools-layout` (`.tfw/`) | calibration |
| `vercel-labs/marketing-team-eve-template` | 1 | `third-party-convention` | calibration |

Closing **two** repositories reaches 60 of 66 = 90.9%.

## The measurement: thirty repositories, chosen blind

Pre-registered before looking, because the whole question is whether the corpus is selected on
its own output:

- **Population:** the 2533 audited discovery repositories.
- **Selection:** even stride through `repos.txt`, whose order cycles the twelve acquisition
  facets, so a long prefix is balanced across filename and size band. Deterministic.
- **Exclusions:** none based on findings. Not on count, not on cleanliness, not on being a
  skill farm.
- **What is computable without rulings:** a repository with **zero findings** has zero false
  positives by construction. That count is an honest lower bound. The rest need a person.

| | certification (66) | blind 30 |
|---|---|---|
| zero findings | 47 = **71%** | 20 = **66%** |
| with findings | 19 | 10 |
| findings in total | **32** | **306** |
| the worst repository | **4** | **247** |

The rate of repositories with findings is close. **The magnitude is two orders of magnitude
apart.** `BuilderIO/agent-native` has 768 sources and 247 findings — more than seven times the
whole certification corpus, in one repository.

### Why that breaks the condition

Condition 6 counts repositories, so a repository with 247 findings weighs the same as one with
1 — while having 247 chances to contain a false positive. At the corpus's own false rate of
about 31% (10 of 32), a 247-finding repository is dirty with practical certainty.

Projecting on that basis — **and it is a projection; nobody has ruled on those 306** — the
blind thirty come in around **25 clean of 30 = 83%**, which combines to (58+25)/96 = **86.5%**,
*below* the 87.9% it was meant to rescue.

**Adding repositories blind makes condition 6 worse, and not because the tool got worse.**

### The deferred plan's arithmetic was wrong by more than an order of magnitude

The 300-repo plan assumed **0.39 findings per repo**, taken from this corpus, and predicted
~118 findings at 300. A blind sample yields **10.2 per repo**; excluding the one outlier, 2.0.
Three hundred repositories is not 118 findings to adjudicate, it is on the order of **3000**.
Thirty already ask for 306, which is ten times the adjudication of twenty-seven rounds.

## Why the corpus looks the way it does, and it is written down

`scripts/corpus/repos.ts` says it plainly:

> Cloning them all costs ~2.7 GB, so the list is kept deliberately short and **new additions
> are chosen small**. `oven-sh/bun` and `supabase/supabase` have good context files but add
> ~1.5 GB between them, and are not needed.

So the corpus is a sample of **small repositories, selected for disk cost**. That is honest and
it was recorded. What was never recorded is that the selection has a measurement consequence:
small repositories hold small documents, small documents make few claims, and few claims cap a
repository at four findings where the wild reaches 247.

The corpus does two jobs and only one of them is hurt by this.

- **Finding false-positive classes to close.** Representativeness barely matters; any real
  repository that exposes a class is useful. Twenty-seven rounds of this have worked.
- **Producing a rate.** Representativeness is the whole thing. "58 of 66 real repositories",
  in the README and on the site, reads as a statement about repositories. It is a statement
  about small ones.

**And the constraint that shaped it is obsolete.** Ticket `06` built the blobless sparse clone
and measured 66 of 66 producing byte-identical conclusions at **2.8 MB per repository against
52.7**. `supabase` no longer costs 1.5 GB. The wall that remains is not disk, it is a person
reading 247 findings, and that one has not moved.

## The options

1. **Accept 87.9% and say which population it describes.** Free, honest, and leaves a
   condition unmet inside an ADR whose other eight hold.
2. **Close two calibration classes.** Cheap and legal under condition 9 — and none of the five
   has evidence outside the corpus itself: `.tfw` appears **0 times** in 2599 discovery
   repositories, and no placeholder-shaped anchor appears in the discovery corpus's
   `link/broken` findings at all. Writing a rule for a class with one instance is tuning to the
   exam, on the cheap side of it.
3. ~~**Grow the corpus blind.**~~ **Closed by the measurement above**: it lowers the rate and
   costs 306 adjudications per thirty repositories.
4. **Rewrite the condition to normalise by size.** ADR-0006 rejected rates over findings and
   ADR-0009 rejected them again; this would need an argument for why this time is different.
5. **Cap what one repository contributes.** Arbitrary, and the only option that addresses the
   actual cause: a per-repository binary over repositories of incomparable size.

3 is closed. 1 and 2 are available today. 4 and 5 amend an accepted ADR and are Angel's call.

## What is not claimed

The 83% projection is a projection. No one has ruled on the 306 findings, the discovery corpus
carries no rulings, and none of these numbers is a precision or enters `CLASSIFICATION.md`.
What **is** measured is the shape: 71% against 66% clean, 4 against 247 at the worst
repository, 32 against 306 in total.
