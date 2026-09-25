# 36: Does Jev know whose document this is?

**What to decide:** whether `aboutThisRepo` agrees with a person often enough to be used as
the yardstick a deterministic candidate is scored against.

**Type:** research

**Blocked by:** nothing.

**Status: resolved 2026-09-24.** Pre-registered before any data was looked at, then run. Jev
does not anchor and **H does not survive**, by two independent routes. See §"Answer".

## The hypothesis this exists to kill

Round thirty-two's conversation reached a conclusion by argument rather than by measurement:

> "Whose document is this?" has no deterministic gate, therefore it goes to configuration and
> not to code.

That is not a fact. It is **H**, and H is refutable:

> **H.** There is a deterministic signal, visible on disk without reading prose, that separates
> a document instructing an agent about *this* repository from one describing another project.

If H survives an attempt to kill it, the rule belongs in `src/` and
[ADR-0008](../../../docs/adr/0008-a-specification-is-not-an-agent-context-file.md) is what
justifies it. If H dies, the answer is a config key, and it is *measured* rather than argued.

Ticket `33` established the question is worth deciding. It did not establish that it can be.

## Why this ticket is the step before that one

`aboutThisRepo` has never been checked against a person. `33` says so itself: nobody has ruled
on one of the 6189, and the model's reading is not a verdict. Every candidate in H would be
scored against that question, so the question has to be anchored first — or the whole
experiment measures agreement with an instrument nobody has calibrated.

This is [ADR-0009](../../../docs/adr/0009-precision-is-counted-in-quiet-repos.md)'s shape
applied one level down, and round thirty's method exactly: `classify.ts` already existed, its
answers sat on disk unscored, and scoring them against the rulings is what turned it from an
instrument into an ordering. Same move, different object.

**This step can end the whole line of work for the price of thirty readings**, which is why it
runs first.

## What a person is asked, and what it is not

For one document, one question: **does this document instruct an agent about the repository it
sits in?** ADR-0008's distinction, in that ADR's own words — a context file instructs, a
specification argues, and arguing means quoting paths that belong to other repositories, to
hypothetical ones, to the reader's, or to this one's future.

Three things this is **not**, and the packet says so at the top:

- **It is not a ruling.** A ruling is a person's decision that a *finding* is a true or a false
  positive ([`CONTEXT.md`](../../../CONTEXT.md)). This is about a document. It enters no round,
  it is not written into `CLASSIFICATION.md`, and it moves no condition of ADR-0006.
- **It is not "is this finding false".** A document can be about this repository and still
  carry a false positive, and a document about another project can name a path that happens to
  exist here. The two questions are independent and conflating them is the failure mode.
- **It is not a precision.** It is computed over the discovery corpus. `AGENTS.md` § "The
  discovery corpus is not a corpus in the same sense" governs every number below.

## The selection, pre-registered

Population: the documents driftwatch **actually reports on** — `reportedDocuments` over
`test/discovery/results.jsonl`, the same selection `filter --reported` used for `33`. Not the
four shallowest per repository; `33` established that is the wrong population and misses in a
biased direction.

1. Even stride through that population, in acquisition order.
2. **Cap of one document per repository.** Declared here with its reason: the population is
   weighted towards a dozen hoarders — `NeelakshSaxena/Vayu` alone holds 653 — and thirty
   near-identical documents from one repository would measure the question on one repository.
   `claims.ts` caps per repository for the same reason and says so.
3. **30 documents.** No exclusion on findings, on `aboutThisRepo`, on repository kind or on
   size. Nothing is looked at before the list is fixed.

The selection is written to disk before Jev is asked anything, so the two halves cannot move.

## The two controls, also pre-registered

- **`remix-run/react-router` `.agents/skills/react-router/SKILL.md`.** A skill the repository
  publishes for its consumers, naming `app/entry.server.tsx` — the reader's file, not
  react-router's. ADR-0008 names this exact case. Jev must read it as **not** about this
  repository. If it does not, the question is not asking what its wording says.
- **A repository's own out-of-date context file.** Jev must read it as **about** this
  repository. This is the control that matters, and it is the one a careless version of this
  work would fail: a signal that fires on "many paths do not resolve" is measuring staleness,
  not authorship, and silencing it would silence the case driftwatch exists to find.

The controls sit outside the thirty and are not counted in the agreement figure.

## What the person was given, recorded before the readings exist

Thirty-five documents read end to end is a cost, and the cost was paid down in the one way
that does not touch what is being measured: an agent walked the sample and wrote
`36-evidence.md`, a block of **verifiable facts** per document — the opening heading, the
project the document names in its own words, the container directories it sits under, whether
each reported path exists anywhere in the repository, whether the same document appears in
other repositories, and any provenance file beside it.

It was instructed to state no conclusion, no lean and no score, and not to open
`ownership.jsonl` or `filter.jsonl`. Every fact it lists is checkable against the repository,
and the full document stays on disk for the entries where the facts do not settle it.

This is recorded here rather than left implicit because it is a real limit on the result: a
prepared sheet selects what is in front of a reader, and selection is not nothing. What it
cannot do is decide — the readings below are Angel's, and a sheet of facts is the same thing a
person would have collected by opening the file.

## The decision rule, written before the number

Baseline is the majority class: assume every document is about its own repository, and score
that against the thirty. It is the same baseline round thirty used, where the rule scored 94%
against 69%.

- **Jev anchors** if it beats that baseline by **at least 15 points** *and* passes both
  controls. Then ticket `37` scores the deterministic candidates against it.
- **Jev does not anchor** otherwise. H is unrefuted but unusable by this route, the
  configuration answer stands on ADR-0008 alone, and this line of work stops.

Fifteen points over thirty documents is four or five documents. It is a coarse filter on
purpose: this step exists to kill the line cheaply, not to measure it finely. A result that
lands near the threshold is **not** a pass — it is an instruction to widen the sample before
anything is built on it.

## The candidates, for the record

Not measured here. Listed so that the packet cannot be accused of having been drawn with one
of them in view:

1. **Resolution fraction per document** — what share of the paths a document names exist in
   this repository. Pure arithmetic, no prose. Control 2 is aimed squarely at it.
2. **Provenance on disk** — an `npx skills` lockfile, `.claude/plugins/`, a git submodule,
   `vendor/`.
3. **Accumulation under a root** — 42 repositories carry 33% of `path/missing`; a repository
   with 653 skills did not write them.
4. **Shape of entry in git** — the document arrived in one commit alongside two hundred other
   files and was never edited since. That is an installation, not authorship.

## Comments

Opened 2026-09-24. Angel asked how the configuration answer would be *affirmed* rather than
asserted, and offered Jev. The honest version of that offer is this ticket: Jev cannot decide
the product question and never will, but it can be the yardstick a deterministic candidate is
scored against — provided somebody checks the yardstick first, which nobody has.

## Answer

Two results, and the second is the one that closes the line of work.

### Jev does not anchor

Twenty-nine of the thirty sampled documents were read; entry 9 was left blank. The five
controls sit outside the figure.

|  | first reading | after the correction |
|---|---|---|
| Jev agrees | 19 of 29 = 65.5% | 20 of 29 = **69.0%** |
| Baseline — assume every document is its own | 26 of 29 = 89.7% | 29 of 29 = **100%** |
| Margin against the +15 the rule required | **-24.1 points** | **-31.0 points** |

Both numbers are recorded because the correction happened **after** the first score was seen,
which contaminates it in a known direction and is therefore stated rather than hidden. Angel's
account of the first reading: three entries were marked `another-project` because the evidence
sheet carried a `Same document elsewhere` field and the field read as a signal. That is a
defect in the sheet, not in the reading — a prepared page selects what is in front of a reader,
this ticket said so before the sheet existed, and the sheet was built with inclining fields
anyway.

The correction moves the result **away** from anchoring, which is why it is safe to accept: the
conclusion did not need it.

**All five controls pass**, before and after. `remix-run/react-router` came back
`another-project` at 0.29, and the four own-and-stale documents came back `this-repo` at 0.78
to 0.97. The question works where the case is obvious and does not survive the population.

### The degenerate baseline, which is the real finding

With the correction the sample is **29 of 29 `this-repo`**. One class. No classifier can beat a
baseline of 100%, so the margin stops measuring Jev and starts measuring something better:
**there are no two classes here to separate.**

A blind sample of twenty-nine documents drawn from the population that actually produces
findings contains, under the person who decides this project's scope, **no document about
somebody else's project** — including the ones sitting under `managed_components/espressif__tinyusb/`,
`lib/FastLED-master/` and `community-templates/`.

### H does not survive, by a second and independent route

`36-consistency.md` looked for a deterministic fact separating the three documents first marked
`another-project` from the rest. Eleven comparable pairs, and **every candidate axis appears on
both sides**:

- `source:`/`author:` frontmatter — also on entries 8, 25, 26, 33, 35, all `this-repo`.
- The document copied into other repositories — also on 17, 18, 19, 20, 25, 27, 31 and 35,
  where 35 appears in **nineteen** other repositories against entry 3's nine.
- A container directory — also on seventeen `this-repo` entries, five of them under the same
  `.agents/skills/` as entry 3.
- Naming a project other than the repository — also on 4, 10, 16, 17, 18, 19, 20, 26, 28, 31, 34.

Entry 3's repository reclaims the document in its own words, `AGENTS.md:171`: "Vendored agent
skills live in **`.agents/skills/`** (the single source of truth)", listing the `speckit-*`
skills among "Current project skills".

So H dies twice: the model cannot draw the line, and neither can the disk. **There is no
deterministic gate, and the conclusion is now measured rather than argued.**

### What this does to ticket 33

The 19% it measured is a model's reading of a distinction this project's scope does not draw.
It was never a false-positive count and it is not one now.

The answer to `33` is **configuration**, which is what
[ADR-0008](../../../docs/adr/0008-a-specification-is-not-an-agent-context-file.md) already did
with `sources` for this repository's own `docs/`. What the user lacks is the key: `sources` is
additive, and `ignore` was withdrawn by ticket `03` for being accepted and unread. Implementing
it is a minor under ADR-0014.

### What is left open, and it is not a Jev question

Angel read `remix-run/react-router` `.agents/skills/react-router/SKILL.md` as **`this-repo`**.
It is the control this ticket pre-registered as `another-project` because ADR-0008 names that
exact case — "paths in *the reader's* repo" — and Jev agreed with the ADR.

**In the one case the ADR names, the ADR and the scope Angel applies disagree.** Either ADR-0008
is amended to say what it reaches — a specification argues, an installed skill does not — or
finding #23 moves from `false` to `true`. No model settles that; it is a scope decision, and it
now has thirty-four readings behind it instead of an intuition. It is its own ticket.

### The method note worth keeping

Six questions have been scored against a person in this project. The split is clean:

| works | fails |
|---|---|
| `classify.className`, a Choice over classes a person named — 94% against 69% | `CLAIMS_A_PATH`, 25 readings against 26 |
| `DIRECTORY_IS_A_NAME`, a concrete Choice | `isReal`, 0.51 against 0.43 |
| `repoKind`, a Choice | `aboutThisRepo`, -31 points |
|  | `REWRITE_IS_RIGHT`, flat between 0.20 and 0.58 |

**A Choice over a vocabulary a person wrote separates; a probability over an abstract property
does not.** Six for six in each direction. That is the shape of the next question this project
asks, and `classify.ts` — the instrument that scores 94% — has only ever been used to order a
reading queue, never run over the discovery corpus to find the shape of a rule. The spec names
that as the whole point of the second corpus.

Nothing in this ticket is a precision. No answer of Jev's is recorded as a ruling, and none of
it enters `CLASSIFICATION.md`.
