# Corpus adjudication at scale

**Status: exploration.** Nothing here is decided, nothing here is scheduled, and no code
changes. This file exists because a conversation on 2026-09-17 produced enough material
that losing it would mean having it again from zero.

## Why this is not an ADR

Every record in [`docs/adr/`](../../docs/adr/) is a decision that has been taken and that
the code obeys. This is the opposite: an evaluation of two outside things against a plan
that is **deferred**, written down before anyone commits to either. Turning it into an ADR
would give it an authority it has not earned, which is the failure mode
[ADR-0009](../../docs/adr/0009-precision-is-counted-in-quiet-repos.md) spent four rounds
undoing.

It lives in `.scratch/` under the convention in
[`docs/agents/issue-tracker.md`](../../docs/agents/issue-tracker.md). If any of it is ever
acted on, the decision it produces gets an ADR then, and this file becomes its context.

## The problem this is about

The corpus-scaling plan — grow `test/corpus/` from 66 repos to ~300 — was agreed on
2026-09-12 and **explicitly deferred the same day**. It is not reopened here.

What matters is *why* it was worth doing and *why* it stalled.

**Why it was worth doing.** Of the 26 findings the 66-repo corpus produces, **24 are
`path/missing`**, 1 is `script/missing`, 1 is `frontmatter/invalid`, and **`link/broken`
and `skill/frontmatter` produce zero**. Those two checks ship with the same apparent
authority as `path/missing` and have essentially no measurement behind them. The point of
the plan was never mass for `path/missing`, which has 24 findings already. It was the
first real measurement for the silent checks. That makes the **strata**, not the repo
count, the entire value of the exercise.

**Why it stalled.** Phase 4 — class-based review. At 0.39 findings per repo, 300 repos
predicts ~118 findings, ~92 of them new. The 26 that exist today were each reviewed by
hand against the real repository, and that review *is* the measurement
([`test/corpus/README.md`](../../test/corpus/README.md): "the verdict requires a person").
Nobody is going to review 92 findings that way. The plan's answer was to give each finding
a signature — rule + syntactic shape of the claim + context — and adjudicate **classes**
rather than instances, the way rounds 14-16 of
[`CLASSIFICATION.md`](../../test/corpus/CLASSIFICATION.md) already do informally. That
answer was plausible and entirely unbuilt.

So: **the bottleneck is not detection, it is adjudication that stays cheap without losing
the authority of the measurement.**

## The two things being evaluated

### 1. Jev, from typesafe.ai

<https://typesafe.ai/blog/introducing-system-one-models-and-jev>

A "System One" model: emits only type-safe structured values rather than text, samples all
outputs in parallel instead of autoregressively, 70-500 ms end to end, $0.042 per million
input tokens with output tokens free, output cardinality up to 255. Trained with
"Reinforcement Learning for Calibrated Decisions" (RLCD), which the post describes as
optimising for **honest probabilities** rather than for human preference or verifiable
correctness.

Early access. The post states plainly that its workflow evaluations were built by its own
capabilities team and that the demonstrations are simplified, so every number above is
self-reported and none of it has been checked here.

### 2. skills.sh

<https://www.skills.sh/>

An open registry of agent skills — Claude Code and others — with 1,441,658 recorded
installations and a leaderboard of at least 282 entries. Browsable by topic, by agent and
by trending window; each entry links to its GitHub repo; there is a documented API.

## Where Jev does not go: the runtime

Recorded so the door stays shut, because it is the obvious idea and it is wrong.

[`PRODUCT.md`](../../PRODUCT.md) positions driftwatch as *deterministic, offline, no
network, no API key, no LLM on the main path*, and that sentence is the argument against
every competitor that calls a model. The temptation is real and specific: three
false-positive classes in `CLASSIFICATION.md` are marked **"no rule shape proposed yet"** —
a crate nickname, a foreign project's file, a generated bundle described without a
generation word — and all three are semantic judgements that no prose rule has reached.
A calibrated classifier would plausibly close them.

It still does not go in. The price is four product commitments and a 192 ms binary
becoming an HTTP client with a credential. **The model is a research instrument for the
corpus, never a component of the tool.**

## Where it might go: three stages, all offline

### Stage 1 — acquisition and stratification

The stage where it earns the most and where a mistake is cheapest.

GitHub code search caps at 1000 results per query at ~10 requests per minute, so
assembling ~300 stratified repos means facetting by `path:` × language × stars × date and
then deciding, file by file, whether what came back is a real agent context file or a
specification ([ADR-0008](../../docs/adr/0008-a-specification-is-not-an-agent-context-file.md))
and which stratum the repo belongs to. That is tens of thousands of short judgements today
done by hand, and it is why phase 2's "1-2 days" estimate is optimistic.

Low cardinality, short inputs, cheap errors: a misfiled repo yields a slightly worse
corpus, never a false certification.

### Stage 2 — signature and grouping of findings

Finding → one of the known classes, or "new class". There are ~11 closed classes and 5
open ones today; 300 repos might produce 30-40. Far under the 255 ceiling.

What makes this worth anything is not the price or the speed — at $0.042/M, 92 findings
cost nothing — it is the **calibration**. Set a threshold, send everything below it to
human review, and the rest arrives grouped. That turns "review 92 findings" into "review
the uncertain band, plus a sample of the rest". That, and only that, is what makes phase 4
survivable.

### Stage 3 — mining the shape of a rule

The three classes with no rule shape have none because nobody has seen enough instances to
see the pattern. At 300 repos there would be perhaps twenty of each rather than two. The
model puts the instances on the table together; the rule is still written by hand in
`discard.ts`, by a person, as every rule in it was.

## The hard limit, and it is methodological

**A verdict emitted by a model is not ground truth.**

`CLASSIFICATION.md` is worth something because each of the 26 findings has a verdict
recorded against the real repository, and ADR-0006 certifies precision on top of that. If
the corpus becomes model-adjudicated, the measured precision stops being a measurement of
driftwatch and becomes the agreement between two heuristics. The rule has to be written
down before anything runs: **the model proposes groupings and orders the work; a person
signs the verdict.**

At 300 repos that forces something 66 repos let us avoid — an explicit **sampling design**.
Human review of 100% of the uncertain band, plus a fixed random sample of every class the
model was confident about, in order to estimate the model's own error rate. That estimate
gets reported alongside the conditions. It is the only way the certification keeps meaning
something once nobody has read all 118 findings.

Two smaller limits, both real:

- **"Hallucinations are mathematically impossible" is a claim about types, not about
  correctness.** Jev will not return a class that does not exist. It can absolutely return
  the wrong one, confidently. And calibration is a statistical property over *its*
  distribution; over ours it is unmeasured. Ticket `01` exists for exactly that.
- **Condition 9 does not move.** If a rule is derived from a finding in a validation repo,
  that repo is burnt and needs a replacement, model or no model. What this makes cheaper is
  the review, not the economics of validation versus calibration.

## skills.sh: what it solves, and what it quietly does not

**What it solves** is real. There is no cheap way today to *enumerate* repos carrying
`.claude/skills/*/SKILL.md`; the registry hands over the universe in one call, with an API.

**What it does not solve is the stratum everyone would assume it solves.** Round eleven of
`CLASSIFICATION.md` already read **30 real skills and produced 0 findings**, and it recorded
why: four of the five rules are arithmetic over two strings (`name` against its directory,
30 of 30 matching), and the fifth — `description` of at least 20 characters — has a
**50-character margin** against the shortest real description in the corpus, which is 70.
`skill/frontmatter` is not silent for want of mass. It is silent because skills people
publish are well formed.

And skills.sh is, by construction, the catalogue of the best-formed skills in existence:
published, installed, ranked, with a security-audit section. Pull 40 repos off the
leaderboard, get 0 findings, and the check has not been woken — it has been given 40 repos
of backing for a zero we already had. That is **worse** than today's zero, because it now
looks like a measurement. It is the defect ADR-0006 diagnosed and ADR-0009 fixed, arriving
through the corpus instead of through the threshold.

A second bias of the same kind: much of the directory is probably generated from a handful
of templates. 300 skills from 5 templates are 5 observations, not 300 — the same shape as
round fifteen's 8 findings in a single document, which moved no condition.

**How to use it anyway:**

- As the **universe to sample from, not as the sample.** Pull the whole index, then take
  the tail rather than the head: few installs, no recent commits, and above all repos where
  the skill is an **accessory rather than the product**. A skill living inside a product
  repo, written once and never revisited, is where `name` drifts from its directory after a
  folder rename. The `owner/skills` repo whose entire purpose is publishing skills will
  never drift.
- **The stratum that matters most is the one the registry cannot list**: repos holding
  `.claude/skills/` that were never published anywhere. Those are the ones that rot, and
  they are absent from a registry by definition. Code search is still required for them.
  skills.sh halves the work, not all of it. Ticket `04`.
- **Jev's job here** is over that index: classify each entry as skills-repo /
  product-with-skills / template, and estimate template family from the shape of the
  frontmatter. Low cardinality, short input, thousands of items, cheap errors. It is the
  cleanest fit of the three stages.
- **Free side effect**: every `SKILL.md` is full of paths and internal links, so the same
  fetch feeds `path/missing` and `link/broken` at no extra cost.

## Scale: 300, not 1000

1000 came up and was dropped the same turn. Recorded because the difference is not just
arithmetic:

| | 300 repos | 1000 repos |
|---|---|---|
| Storage at ~52 MB/repo | ~15 GB | ~52 GB |
| Binomial sd on condition 6 | ~4.6 repos | ~2.6 points |
| Blobless/sparse clone seam | optional, and the plan says do **not** build it | mandatory |

At 1000 the condition becomes a genuine measurement and correspondingly harder to pass by
luck, which makes phase 1's pre-registration more important rather than less. **300 stands.**

## What is not changed by any of this

- [ADR-0006](../../docs/adr/0006-the-m1-precision-criterion.md)'s nine conditions and
  [ADR-0009](../../docs/adr/0009-precision-is-counted-in-quiet-repos.md)'s quiet-repo rate.
  The plan's phase 1 — write down what happens at 90 / 88 / 80% **before** cloning — is if
  anything more binding now, because a bigger corpus makes condition 6 breakable with no
  code regression at all.
- [ADR-0007](../../docs/adr/0007-the-corpus-does-not-run-in-ci.md). None of this puts the
  corpus in CI, and none of it removes the person from the verdict.
- `test/corpus/README.md`'s claim that the snapshot does not claim to be correct, only not
  to change without intent.

## Open questions, as tickets

| # | Question | Type |
|---|---|---|
| `01` | Is Jev calibrated against the 26 verdicts we already recorded by hand? | research |
| `02` | What does the skills.sh index actually expose — full index, ToS, pinned commits? | research |
| `03` | What is the sampling design that keeps a 300-repo corpus adjudicable *and* honest? | research |
| `04` | Where do unpublished-skill repos come from, since the registry cannot supply them? | research |
| `05` | Pre-register the decision rule for condition 6 before a single repo is cloned | task |

`01` is the cheapest and answers whether the other four are worth opening. `05` blocks all
cloning if the plan is ever reopened, and it blocks nothing while this stays exploration.

## Comments

Opened 2026-09-17 from a conversation that started at the wrong end: the first reading of
the typesafe.ai post treated it as a possible runtime dependency, which was never the
proposal. The §"Where Jev does not go" section is that dead end, kept deliberately, because
it is the conclusion anyone reading the post cold will reach and it needs an argument
against it on the record rather than a second conversation.
