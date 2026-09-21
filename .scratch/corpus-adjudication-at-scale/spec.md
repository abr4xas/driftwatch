# Corpus adjudication at scale

**Status: exploration.** Nothing here is decided, nothing here is scheduled, and no code
changes. This file exists because a conversation on 2026-09-17 produced enough material
that losing it would mean having it again from zero.

**Revised 2026-09-18.** The first version of this file had a defect at its root: it treated
`test/corpus/` as one corpus that grows, which made every use of a model read as a model
adjudicating the measurement. §"Two corpora, not one" is the correction, and it changes
the shape of everything downstream of it — including the scale, which is no longer 300.

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

That sentence is the one this file was opened to act on, and §"Two corpora, not one"
supersedes it. The bottleneck was never adjudication as such — it was asking a single
corpus to certify precision *and* supply the raw material for new rules, two jobs with
opposite requirements. Certification wants few repos and a human verdict on each.
Rule-finding wants many repos and no verdicts at all. Held in one artifact they trade
against each other, which is what the treadmill of rounds 13-16 is. Held apart, neither
constrains the other and there is nothing left to adjudicate cheaply.

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

Ticket `02` established what that API is: `/api/v1/skills`, fully enumerable with `page` and
`per_page` up to 500 — and **gated on a Vercel OIDC token**, which is the thing that decides
whether any of the skills.sh material is reachable at all.

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

## Two corpora, not one

This is the correction, and everything below depends on it.

The first version of this file assumed one corpus that grows from 66 repos to ~300, which
is what the deferred plan assumed too. Under that assumption every use of a model lands on
the measurement — because in a single corpus, *every* repo is either calibration or
validation, and there is nowhere for a model to stand that is not adjudicating something.
Hence §"The hard limit" below, hence the sampling design, hence ticket `01` being the gate.
All of that was answering a question that does not have to be asked.

There are two different jobs here and they were being done by one artifact:

**The certification corpus** — `test/corpus/` as it exists. Pinned commits, snapshots,
a hand-recorded verdict per finding, ADR-0006's nine conditions, ADR-0007's exclusion from
CI. It is small on purpose: 66 repos that somebody actually read are worth more than 2000
nobody did. **It does not grow to 300, and no model ever touches it.** Its size is set by
what a person can review, which is the only thing that makes it mean anything.

**A discovery corpus** — new, and not a corpus in the same sense at all. One to two
thousand repos, unpinned, unsnapshotted, not in CI, no verdicts, disposable and
re-acquirable at any time. **It measures nothing.** Its only output is *candidate rules*:
classes of finding, and classes of discard, with enough instances behind them that a person
can see the shape. The rule still gets written by hand in `discard.ts`, by a person, as
every rule in it was, and then it is measured the way it is measured today — against the
repos that have human verdicts.

Nothing in the discovery corpus can contaminate anything, because there is no measurement
in it to contaminate. It is calibration material by construction, declared as such before
the first repo is cloned.

### The one place they touch, and the trap in it

There is exactly one seam between the two, and it came out of writing ticket `04` rather
than out of the original design. Discovery can *find* the repos where a mute check would
fire, but it cannot wake the check: that requires a human verdict, which only happens in the
certification corpus. So the natural move is to search at discovery scale and **promote**
the interesting repos into `test/corpus/` for hand review.

That is probably right, and it has a trap in the word "interesting". If repos are promoted
because **the tool already fires on them**, the certification corpus stops being a sample of
repositories and becomes a sample of repositories where driftwatch finds something —
and ADR-0006's conditions 3 through 6 all count *repos with zero false positives* as a
proportion, which is meaningless over a population selected for producing findings.

The line that keeps it honest: selecting on a **property of the repo** (it has
`.claude/skills/`, the skill directory was renamed, the skill is an accessory rather than
the product) is stratification, which the corpus already does openly. Selecting on **the
tool's output** is choosing the exam questions after seeing the answers. Any promotion rule
has to be checkable against that test and written into the corpus README rather than left
implicit.

### What this ends: the treadmill

Rounds 13-16 of [`CLASSIFICATION.md`](../../test/corpus/CLASSIFICATION.md) named the
central problem of the project and then demonstrated it four times:

> closing a class costs the repo that revealed it, the replacement arrives with its own
> noise, and the percentage moves for reasons that have nothing to do with the code getting
> better or worse.

That is ADR-0006 condition 9 doing exactly what it was written to do. `aguara`,
`aptos-ts-sdk`, `edgecrab`, `course-video-manager`, `spatie/bloom`, `laravel/vet` all left
the validation group that way. The tool cannot currently be improved without degrading the
measurement of it, and that is a structural bind, not bad luck.

**Separating the corpora dissolves it.** A class revealed in the discovery corpus was
revealed in material that was never validation. The rule derived from it is derived from
nothing in the validation group, so condition 9 does not fire, so no repo is burnt and no
replacement is owed. Validation stays intact across an arbitrary number of rule changes.

That is worth more than the scale. The scale is how you find the classes; this is why
finding them stops costing anything.

## Where the model goes: three jobs, all in the discovery corpus

All three consume the discovery corpus, all three run offline in `scripts/`, and all three
produce **a deterministic artifact that gets committed** — a rule, a list, or a table a
person reads. None of them emits a verdict.

### Job 1 — grouping the findings so a person reads classes, not instances

At 0.39 findings per repo, 2000 repos is ~780 findings. Nobody reads 780 findings, and
nobody has to: what is wanted from them is not 780 verdicts but the ~30-40 *classes* they
fall into. A `Choice` over the ~16 classes `CLASSIFICATION.md` already names plus "new
class", with the new ones grouped against each other, turns 780 rows into a table ordered
by mass. Classes with twenty instances have a rule shape in them. Classes with one are
noise and get ignored.

This is already what rounds 14-16 do informally, by hand, on two or three instances. The
three classes at `CLASSIFICATION.md` line 1058 — a crate nickname, a foreign project's
file, a generated bundle described without a generation word — have carried "no rule shape
proposed yet" for five rounds for exactly one reason: **nobody has seen enough of them at
once.** Two instances do not show a pattern. Twenty might.

### Job 2 — the discards, which is the one no amount of human review reaches

`discardReason()` in [`src/extract/discard.ts`](../../src/extract/discard.ts) throws away
far more than it keeps, and **nothing measures what it throws away**. Discards appear in no
snapshot, and inspecting them in a validation repo is precisely what condition 9 forbids.
The false negative rate of driftwatch is, today, entirely unknown, and there is no
hand-review route to it: at 66 repos it is already tens of thousands of discarded strings.

In the discovery corpus they are free to look at, and there are hundreds of thousands. A
`Noul` over the discarded text plus its prose window — "does the document claim this path
exists?" — grouped by `DiscardReason`, says which rule is over-applying. Candidates worth
the look are named in the source itself: `PLACEHOLDER_INDEXED` eating a real `partN` or
`moduleX` (the file admits this cost), `isBareDirectory`, and above all `CONDITIONAL`,
which `context-prose.ts` calls "the riskiest list in the file" and which was measured
against a 44-repo corpus where it suppressed exactly one finding.

This is the job with the highest ceiling, because it is the only one that looks at the side
of the tool that has never been measured at all.

### Job 3 — frequency into static lists

[`generated.ts`](../../src/verify/generated.ts),
[`foreign-tools.ts`](../../src/verify/foreign-tools.ts), `NOT_FILES` and `METASYNTACTIC` in
`discard.ts`, and the marker lists in `context-prose.ts` are all somebody else's vocabulary,
maintained by hand. `foreign-tools.ts` says of its own list: *"Falling behind is free; being
wrong is not possible."*

Two thousand repos give the real distribution — which first segments appear constantly and
never exist, which words open sentences that disclaim. Deterministic code extracts the
candidates by frequency; the model filters the ones that are a tool's vocabulary rather
than a project's; **a person commits the `Set`.** The shipped artifact is a static list, so
the binary keeps every product commitment: no network, no key, 192 ms.

## A fourth job, and it was not in this file

**Added 2026-09-20.** Jobs 1 to 3 were written on 2026-09-18 and they share an assumption
nobody noticed until the tickets came back: that what a rule gets wrong is **which words it
knows**. Job 3 is a vocabulary job, job 2 reads the discards a vocabulary produced, job 1
groups what survived. Three answers to one question.

There is a second question, and the project has already paid for it once.

A gate does not only carry a list of markers. It carries a **scope** — the stretch of text the
marker rules over — and the two fail independently. `hedged` holds the right word and
`context-prose.ts` tests it as a substring against a **two-line window**, so in `16` a sentence
about optional *parameters* silenced the assertions of its neighbours: `haddocking/haddock3`
asserts three files exist in three consecutive sentences and lost all three. The marker was
correct. The reach was not.

The code names three of these scopes itself, and grades two of them:

- `leadInStart`'s walk upward stops after one blank line — *"Arbitrary, and it errs towards
  reporting… so it is written down rather than widened without a measurement."*
- `elsewhereSections` is *"the widest gate in the file"*, with *"a measured cost of zero, which
  is not the same as no cost"*, and its stated risk is **a long section with one aside in it,
  and a document with no `#` heading is one section.**
- `creationTargets` reaches the whole document, and admits the cost: a document that says
  "Create `x`" in one place and asserts `x` elsewhere.

Job 3's shape does not reach any of this. Frequency over two thousand repositories says which
words appear; it cannot say whether a word that appeared governs the line three lines down.
Nor can a regex: that is a question about what a sentence is about, which is the one thing in
this project that has no deterministic approximation at all. Everywhere else — families by
Jaccard, blocks by extension, candidates by frequency — arithmetic picks the neighbourhood and
the judgement works inside it. Here there is no arithmetic to pick a neighbourhood with.

**What the job is.** Over the gate discards the discovery corpus already holds, ask two
questions in one request: the frozen `CLAIMS_A_PATH`, and a new Noul on whether the marker's
qualification reaches this candidate. The cell that matters is the cross — **claims a path and
is not governed** — which is a gate that reached across and ate a real claim. Claims a path
**and** governed is the ordinary cost this project chose to pay, and separating those two is
the whole deliverable.

**What the job is not**, and `16` is the reason it has to be said. `16` changed a scope,
audited 700 repositories before and after, got two new findings, read both as false positives,
and reverted. It closed with the method: *"change it, audit the discovery corpus before and
after, and diff the findings."* That experiment is the expensive part and it is not what this
job does. This job produces a table saying **where an experiment is worth spending**, and each
experiment is its own ticket. A pass that shipped a table and an experiment together would
read as though the table had concluded something. It concludes nothing; it says where to look.

Ticket `27`.

## Substituting judgement for fragile code inside `scripts/`, and why there is nothing to do

**Added 2026-09-20**, from the same review, and recorded because it is a reasonable idea that
turns out to be answered.

The three jobs and the fourth all point the model at the corpus. The other direction — using
it to replace brittle parsing in the research instruments themselves — was looked for and did
not produce a candidate worth building.

The most fragile code in `scripts/` is `rowsIn` in `jev/classify.ts`, which parses
`CLASSIFICATION.md`'s Markdown table with a regex. It has already had its accident: the first
version named the model's field `className` too and silently overwrote the ruling it was being
scored against — *"Every class matched, which is what a scoring bug looks like from the
outside."* That is fixed, and replacing the parse with a judgement would put model uncertainty
into the reading of the one artifact in this repository that carries human rulings, which is
the opposite of every line in § "The hard limit".

The rest of the arithmetic in `scripts/` — `blockOf`'s neighbourhoods, `families.ts`'s Jaccard
pre-filter, the evenly spaced `spread` — exists **so that the judgement does not have to do
it**, and each one is load-bearing for a reason its own comments give. That is a property of
the design, not a debt in it.

The slot stays open. Nothing is being built into it.

## The hard limit, and it is methodological

**A verdict emitted by a model is not ground truth.** That was true in the first version of
this file and it is still true. What changed is that it no longer requires a sampling
design to defend, because **no model output is ever a verdict in this design.**

`CLASSIFICATION.md` is worth something because each of its 26 findings has a verdict
recorded against the real repository. That does not change: certification stays on a small,
pinned, hand-reviewed corpus, and precision is still counted the way ADR-0009 counts it. The
discovery corpus produces hypotheses; the certification corpus tests them. Neither number
crosses into the other document.

The rule, stated once so it can be checked against any future script:

> **No number computed over the discovery corpus is a precision, and none of it is
> reported.** It does not enter `CLASSIFICATION.md`, it moves no condition of ADR-0006, and
> it is never cited as a measurement of driftwatch.

Three smaller limits, all real:

- **"Hallucinations are mathematically impossible" is a claim about types, not about
  correctness.** Jev will not return a class that does not exist. It can absolutely return
  the wrong one, confidently. In this design that is affordable — a misgrouped finding
  costs a person one row of a table — but it is the reason no output is load-bearing.
- **Calibration is a statistical property over *its* distribution; over ours it is
  unmeasured.** Confidence is used here only to order the work, never to decide anything.
- **Condition 9 is not repealed, it is routed around.** If a rule is ever derived from a
  finding in a validation repo, that repo is burnt exactly as before. What the discovery
  corpus offers is a place to derive rules where the condition does not apply. Deriving one
  from validation material remains as expensive as it is today.

## skills.sh: what it solves, and what it quietly does not

**What it solves** is real. There is no cheap way today to *enumerate* repos carrying
`.claude/skills/*/SKILL.md`; the registry hands over the universe in one call, with an API.

**Measured 2026-09-18 (ticket `02`):** the index is **9,827 skills in 1,203 repositories**,
658 of which contribute exactly one. So the registry supplies at most ~1,200 repos against
784 from a single minute of GitHub code search — it is not a source of scale. And the reason
it cannot wake `skill/frontmatter` turned out to be double: see ticket `08`, where only 5.7%
of published skills sit anywhere driftwatch would even classify as a skill — revised to 11.4% by `08`'s larger sample.

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

### How the two-corpus split changes this, and how it does not

The bias argument above was written against a corpus that certifies. Half of it relaxes
under the split and half of it gets **sharper**, and the two halves are worth separating.

**What relaxes.** "Pull 40 repos off the leaderboard, get 0 findings, and the check has
been given 40 repos of backing for a zero we already had" is an argument about a
*measurement*. The discovery corpus publishes no measurement, so a stratum coming back
silent costs nothing but the bandwidth. Being wrong about which repos to pull is no longer
expensive, which is what makes an automated filter affordable in the first place.

**What sharpens.** The template observation — "300 skills from 5 templates are 5
observations, not 300" — was a footnote when the worry was certification. For discovery it
is the **whole problem**, because mining a rule shape is exactly an operation on the
diversity of instances. A thousand near-identical `SKILL.md` files produce one class with a
thousand members and teach nothing that ten would not. Deduplication by template family
stops being hygiene and becomes the thing that decides whether job 1 and job 3 work at all.

So the conclusion inverts: under the split, classifying the index is not blocked on the
tail-sampling decision — it is **how you get the tail at all**, and the tail is now the
cheap thing rather than the expensive one.

**Still true regardless:** the stratum that matters most is the one the registry cannot
list — repos holding `.claude/skills/` that were never published anywhere. Those are the
ones that rot, and they are absent from a registry by definition. Ticket `04`.

**Free side effect**: every `SKILL.md` is full of paths and internal links, so the same
fetch feeds `path/missing` and `link/broken` at no extra cost.

## Acquisition: the GitHub API, filtered

This is the part that decides whether any of the above is reachable, and it is where the
model earns the most per unit of risk.

Assembling two thousand repos by hand is not on the table — it was not on the table at 300,
which is why phase 2's "1-2 days" was optimistic. GitHub code search caps at 1000 results
per query at 10 requests per minute, so the universe has to be assembled by facetting
(`filename:` × `size:` ranges), and every facet returns a mixture: real agent context
files, specifications that are not one
([ADR-0008](../../docs/adr/0008-a-specification-is-not-an-agent-context-file.md)), template
clones, vendored copies of somebody else's context file, and forks of all of the above.

That filtering is thousands of short, independent judgements over a few hundred bytes each,
and **an error costs one slightly worse repo in a corpus that measures nothing.** It is the
cleanest fit in the whole document: low cardinality, short input, high volume, cheap
mistakes, and an artifact — the repo list — that a person can spot-check and then commit.

Three independent questions over the same state, which run in parallel in one request:

- `Noul` — does this file instruct an agent about *this* repository? (ADR-0008, applied
  at acquisition instead of after the fact.)
- `Choice` — skills-repo / product-with-skills / template-clone / fork-or-vendored.
- `Choice` — template family, from the shape of the frontmatter, so near-duplicates
  collapse to one observation.

The third is the one that matters most, per the section above, and it is also the one with
no deterministic implementation: a hash of the frontmatter keys catches literal copies and
misses every template that was edited once.

**What this is honestly expected to buy.** Not a better corpus — a *reachable* one. The
work it removes is the hand-filtering that made 300 repos a multi-day job and 2000 an
impossible one; it does not remove reading the classes at the end, which is the part that
should stay human and is the part that produces rules. The optimistic reading is that
acquisition stops being the bottleneck and grouping becomes it; the pessimistic reading is
that the filter's own error rate shows up as noise classes in job 1 that a person has to
learn to skip. Both are cheap to find out, and neither touches certification.

**What has to be checked before any of it**, and it is ticket `02`: the skills.sh index
terms, and GitHub's API rate limits and terms for bulk enumeration. Cloning 2000 repos is a
different conversation with an API than cloning 66.

## Scale: the question dissolves, and a seam replaces it

The original framing — 300 or 1000? — was one number for one corpus, and the split removes
the question. **Certification does not grow at all**; it is sized by what a person reads,
and 66 is already four times the mass ADR-0006 was certified on. **Discovery has no
statistical requirement whatsoever**, because it reports no statistic: it wants diversity
and mass, and more is simply better until it costs too much.

So the binomial-sd row of the old table applies only to a corpus that is no longer growing,
and the storage row is the one real constraint left. It is also the one that turns out to
be soft.

### The blobless seam, which is now the only blocker

The old plan said do **not** build the blobless/sparse clone seam at 300 repos. At 1000-2000
it is mandatory: ~52 MB/repo is 104 GB at 2000, and that alone kills the idea.

But driftwatch does not need the repos. [`repo-index.ts`](../../src/verify/repo-index.ts)
builds its index from `git ls-files` — **names, not contents**. The only things whose
contents are read are the context files themselves, `package.json` for the script manifests,
and `.gitignore` for `git check-ignore`. A `--filter=blob:none` clone with a sparse checkout
of `*.md`, `package.json`, `.gitignore` and `.claude/**` carries what is needed and nothing
else.

**Built and measured 2026-09-18** (`scripts/discovery/sparse-clone.ts`), over **all 66** corpus
repos at their pinned commits:

| | Full clone | Blobless + sparse |
|---|---|---|
| Per repo | 52.7 MB | **2.8 MB** |
| The 66 together | 3479 MB | 182 MB |
| 2000 repos, projected | ~103 GB | **~5.4 GB** |

The estimate this table replaces said ~1-3 MB per repo and ~4 GB at 2000, and claimed two
thousand discovery repos would cost less than the 66 certification repos do today. The
per-repo figure was right; **the comparison was wrong**: 5.4 GB is more than the 3.4 GB the
certification corpus occupies. The ratio is 19.1×.

All 66 produce **byte-identical driftwatch conclusions** against a full clone of the same
commit. Six defects were found on the way, all fixed; ticket `06` records them. Two are
worth knowing here because they are the same shape as the bugs this project already
catalogues:

- Removing the remote to prevent lazy fetching **silently disabled `namesAnotherRepo`**,
  because that rule reads `remote.origin.url` to learn which repo it is in.
- A hand-copied list of manifest filenames fell one entry behind `RUNNERS` and **a real
  `script/missing` finding disappeared without an error**. The cone is now derived from
  `RUNNERS` rather than copied out of it.

One limitation is real and one that was written here on 2026-09-18 was not. The real one:
a repo whose own config declares `sources` as arbitrary globs can point outside the cone,
which no pattern list covers. It fails loudly with `ENOENT`, so the runner drops the repo
and says so.

The one that was wrong: this file claimed an anchored link into a non-document
(`[x](src/app.ts#L10)`) would go silent, on the grounds that `buildAnchorIndex` opens any
target it is handed. It does — but the claims it iterates are `kind === 'link'`, and
`links.ts` only emits those for `.md` and `.markdown`. A link into `src/app.ts` stays a
`path` claim and is answered from the index, so nothing opens it in either clone and
nothing can diverge. The detector this called for was started and then deleted: it would
have been code checking an impossibility. What replaced it is a test deriving the cone's
anchor obligations from `links.ts`'s own `MARKDOWN` pattern, so that widening that pattern
fails until the cone follows.

## What is not changed by any of this

- [ADR-0006](../../docs/adr/0006-the-m1-precision-criterion.md)'s nine conditions and
  [ADR-0009](../../docs/adr/0009-precision-is-counted-in-quiet-repos.md)'s quiet-repo rate.
  They are measured over the certification corpus, which does not grow, so the pressure the
  first version of this file put on phase 1's pre-registration is off: condition 6 is no
  longer at risk of breaking from added mass, because no mass is being added to the corpus
  it is counted over. Pre-registering the decision rule is still good practice and still
  cheap; it is no longer load-bearing. See ticket `05`.
- [ADR-0007](../../docs/adr/0007-the-corpus-does-not-run-in-ci.md). None of this puts the
  corpus in CI, and none of it removes the person from the verdict.
- `test/corpus/README.md`'s claim that the snapshot does not claim to be correct, only not
  to change without intent.

## Open questions, as tickets

Rewritten 2026-09-18, and the files in [`issues/`](./issues/) were rewritten against it the
same day.

| # | Question | Type | Status |
|---|---|---|---|
| `06` | Blobless + sparse clone seam | task | **resolved**: 66/66 byte-identical at 2.8 MB per repo |
| `02` | What do the skills.sh index and GitHub's API allow for bulk enumeration? | research | **resolved**: GitHub is enough and costs ~10 min; skills.sh is gated on a Vercel OIDC token |
| `08` | Where do skills actually live — should `classifySource` widen? | research | **in progress**: widened to three roots; 48 findings awaiting a verdict |
| `09` | The acquisition runner — the missing half between `02` and `06` | task | **resolved**: `scripts/discovery/`, 2486 repos enumerated, 135 audited |
| `10` | Is `skill/frontmatter`'s one autofix offered on a non-drift finding? | research | **resolved**: no — `skills-ref` rejects before and accepts after |
| `11` | The skills roots not yet read — `.flue`, `.codex`, `.github`, `.opencode` | task | **new**, blocked by `08` step 3 |
| `12` | Let a repository declare where its skills are | research | **new**, deferred by agreement |
| `13` | A source git lists but cannot be read is reported as a driftwatch bug | bug | **resolved**: skipped and named in `pretty`, `json` and `sarif` |
| `14` | `skill/frontmatter` mixes drift with lint — does format validation belong here? | research | **new**, raised while reviewing `10` |
| `07` | What is driftwatch's false negative rate — what do the discard rules throw away? | research | highest ceiling; **unblocked** by `09` |
| `04` | Where do unpublished-skill repos come from, since the registry cannot supply them? | research | half-answered by `02`; now has to reckon with `08` |
| `01` | Does grouping the 26 known findings reproduce the classes `CLASSIFICATION.md` names? | research | a smoke test of job 1, gating nothing |
| `05` | Pre-register the decision rule for condition 6 | task | no longer blocking |
| `03` | ~~Sampling design for a model-adjudicated corpus~~ | — | **withdrawn**: nothing is model-adjudicated |
| `27` | What does a gate rule over, and where does it reach too far? | research | **new** 2026-09-20, the fourth job |
| `28` | A `Verdict` nothing produces — is it a residue or an intention owed? | research | **new** 2026-09-20, raised while reading for `27` |

This table stopped being maintained at `14`. Tickets `15` to `26` exist in
[`issues/`](./issues/) and carry their own `Status:` line, which is the authority; the rows
above are not. `27` and `28` are listed because they are what this revision adds.

`06` was done first and is resolved: 66 of 66 corpus repos reproduce byte-identical
conclusions from a checkout averaging 2.8 MB against 52.7.

`02` is resolved too, and it moved the difficulty rather than removing it. Acquisition turned
out to be cheap — one facet of GitHub code search yields ~780 unique repositories per minute
of rate limit, so 2000 is five to ten minutes — which means **the discovery corpus is now
buildable end to end** and the open question is what to do with it rather than how to get it.
The one thing `02` could not answer is anything behind skills.sh's token.

`07` is the one with the most to find, because it is the only measurement the project has
never been able to take at all, and **it is now startable**. `09` closed the gap between
`02`'s search and `06`'s clone on 2026-09-19: `scripts/discovery/enumerate.ts` enumerated 2486
repositories from 26 pages of code search, and 135 of them are cloned and audited.

The facets also turned out to be cheaper than `02` measured. Its 784-unique-per-1000 figure
was one facet exhausted over ten pages, where a repository repeats *within* a facet; across
facets the `size:` bands are as disjoint at the repository level as at the file level, and
every page of 100 hits contributed 77 to 100 new repositories.

It has already returned a product defect, and it is fixed. One of the 135 repositories
crashed the tool with a message telling the user to file a bug about their own checkout — a
`CLAUDE.md` symlinked into an uninitialised submodule, ticket `13`, now skipped and named
instead of fatal. The rate it gave: 1 unreadable source in 1070, across 201 repositories. That is the discovery corpus doing the job it
was designed for on its first outing, and it is not a number, so nothing about it is
governed by §"The hard limit".

`08` is the one in progress, and it holds the rest up in a way worth stating: its 48
unadjudicated findings put ADR-0006's conditions in suspense, so `11` waits on it and
anything else that moves a snapshot stacks a second unruled diff on the first.

`10` is the odd one out. Every other ticket here is about research around the tool; that one
is about a defect in the tool as published — an autofix that may rewrite a working skill's
name — and condition 2 admits no false positive among the fixable at any rate.

`03` is withdrawn rather than answered. It existed because the first version of this file
had a model adjudicating findings and needed a sampling design to stay honest about it. With
certification and discovery separated, there is no model-adjudicated population to sample
from, and the honesty is enforced structurally instead — by the rule in §"The hard limit"
that no discovery number is ever reported.

## Comments

Opened 2026-09-17 from a conversation that started at the wrong end: the first reading of
the typesafe.ai post treated it as a possible runtime dependency, which was never the
proposal. The §"Where Jev does not go" section is that dead end, kept deliberately, because
it is the conclusion anyone reading the post cold will reach and it needs an argument
against it on the record rather than a second conversation.

Revised 2026-09-18, after the same mistake happened a second time one level down. The first
version closed the runtime door correctly and then left the model standing inside the
certification corpus, where the only thing it can do is adjudicate — which produced a
sampling design, an error-rate estimate to report, and ticket `01` as a gate on all of it.
All of that machinery existed to make a model's verdict safe to depend on, and the verdict
was never wanted: what is wanted is **not having to read two thousand repos by hand in
order to find the shape of a rule**, with the rule still written by a person and still
measured the old way.

The tell, in hindsight, is that the first version's §"The hard limit" had to argue for
several paragraphs that the measurement would survive. A design that needs that much
argument to stay honest is usually one artifact short. It was: the second corpus.

Revised 2026-09-20, and the shape of the mistake is the same one for the third time, one
level further down again. The first version put the model in the runtime; the second left it
standing inside the certification corpus; this one had three jobs that were all the same job.
Vocabulary, discards-of-a-vocabulary, and grouping-what-a-vocabulary-let-through are three
answers to "which words does the rule know", and none of them reaches "how far does the word
reach" — which is the defect `16` found, measured, and reverted, while this file was
describing job 3 as the one with a ceiling. § "A fourth job" is the correction.

The tell this time was not an argument that had to be too long. It was that `16`'s closing
paragraph already contained the method for a job this file did not have.

Two things are deliberately left unresolved here. Whether Jev specifically is the right
model for jobs 1-3 is untested and nothing above depends on it — any classifier with
calibrated output fits the same shape, and the design survives the model being swapped or
being worse than advertised. And whether 2000 repos actually yield twenty instances of the
three rule-less classes, rather than twenty instances of three new ones, is genuinely
unknown; `07` and `06` are cheap enough that finding out does not require believing it
first.
