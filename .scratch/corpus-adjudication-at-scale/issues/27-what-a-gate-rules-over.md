# 27: What a gate rules over, and where it reaches too far

**What to find out:** which of the eight prose gates suppress candidates that are real claims
*not because the marker is wrong but because its scope is*, so that an experiment is spent
where there is something to find.

**Type:** research

**Blocked by:** nothing. The discovery corpus is cloned (2599 repositories) and
`discards.jsonl` already holds 1 352 382 discards over the 2533 that audited.

**Status: new.**

## Why this is not job 3

Jobs 1 to 3 of the [spec](../spec.md) all assume that what a rule gets wrong is which words it
knows. A gate carries two things and they fail independently: a list of markers, and a
**scope** — the stretch of text the marker rules over. `16` is the whole argument: `hedged`
held the right word and tested it as a substring against a two-line window, so a sentence
about optional *parameters* silenced its neighbours' assertions, and `haddocking/haddock3`
lost three files asserted in three consecutive sentences.

Frequency cannot reach that and neither can a regex. See the spec, § "A fourth job, and it was
not in this file".

## The baseline that runs first, and may end this ticket

`pnpm discovery claims --cause <x>` already accepts any cause. Eight runs over the eight prose
causes give the **cost** column — how many of each gate's discards read as real path claims —
for the price of the tokens and no new code.

Run it before building anything, because it can change the design or remove the need for it:

- `conditional` gave **32 discards over 700 repositories** and `not-a-file` 13. Scaled to 2533
  that is roughly 115 and 47. If that holds, the sentence-scoped family is in practice
  `hedged`, `example` and `create-instruction`, and the per-marker budget below simplifies
  itself.
- If no gate carries enough mass, the answer to this ticket is **there is no pass to build**,
  which is a good answer and the cheapest one available.

`findings.ts` is the precedent for doing this first: its first run produced zero groups out of
4950 pairs and the fault was the sampling, not the question — built before the distribution
was looked at.

## The pass

`scripts/jev/scope.ts`, run as `pnpm discovery scope`. It reads `test/discovery/discards.jsonl`
and writes `test/discovery/scope.jsonl`. It follows the pass protocol in `scripts/lib/pass.ts`
in every respect: `requireKey` before parsing, an `askWith?` seam, `--dry-run` printing the
state to stderr without touching the gateway, raw probabilities in the JSONL, bookkeeping to
stderr and the table to stdout.

### Two questions, one request

The fan-out pattern `filter.ts` and `classify.ts` use. Neither answer is interesting alone.

1. **`CLAIMS_A_PATH`**, imported unchanged from `questions.ts`. It is frozen — *"Do not reword
   it."* — and reusing it verbatim is what makes this run comparable with the baseline above
   and with `discovery claims`.
2. **`QUALIFIES_THE_CANDIDATE`**, new, and it stays in `scope.ts` rather than `questions.ts`
   because one pass asks it.

The verb is *qualify* and not *disclaim* deliberately. The code has two: `disclaimedBy` for
the gates that weaken an assertion and `declaresDestination` for the ones that say "create
this". This pass measures both, and *disclaim* would leave out `create-instruction` and
`creation-target`.

> **instructions**: "The qualification in `marker` applies to `candidate`. The window holds a
> phrase that weakens or redirects what is being asserted — it calls something an example,
> hedges it, says it lives in another project, or tells the reader to create it — and that
> phrase is about this candidate rather than about something else nearby."
>
> **criteria.true**: "The qualification reaches the candidate: the candidate is the thing
> being called an example, hedged, placed elsewhere, or created. A reader would not take the
> document to be asserting that this path is in the repository right now."
>
> **criteria.false**: "The qualification is about something else inside the same window — a
> different path, a neighbouring bullet or table row, a parameter, a setting, a sentence on
> another subject — and the candidate is asserted plainly. Proximity is not government: two
> statements can share a line, a list or a section and qualify different things."

The closing sentence follows the house habit: every question in this repository names the
resemblance that does not count. `SAME_CAUSE` ends *"Superficial likeness is not a shared
cause"*; `SAME_DOCUMENT` ends *"and still be two documents"*.

### The state

Four fields: `repo`, `marker`, `candidate` (the text as written, before `normalizePathText`),
and `window` (the prose the rule read, **uncut** — it is the text the gate acted on and
trimming it would measure something else).

### Recovering the marker

`Discard` carries `cause`, `text`, `offset`, `line` and `window`. It does not carry which
marker fired. `markerReason` decides with `lower.includes(marker)` over lists that are private
to `context-prose.ts`, so the fix is to **export** `EXAMPLE`, `HEDGED`, `ELSEWHERE`,
`CONDITIONAL`, `CREATE_IMPERATIVES` and `HEDGED_SPLIT` and have the pass re-run the same
`.some()`.

Exporting a module-private constant changes no behaviour and adds nothing to the frozen
surface: `src/index.ts` does not re-export anything from `context-prose.ts`, so `CONTRACT.md`
is untouched. The alternative — copying the lists into `scripts/` — is the bug ticket `06`
already paid for, where a hand-copied list of manifest filenames fell one entry behind
`RUNNERS` and a real `script/missing` finding disappeared without an error. `sparse-clone.ts`
imports `RUNNERS` for that reason and this imports the marker lists for the same one.

Per-marker attribution is not a nicety: `16` needed `optional` told apart from the rest of
`HEDGED`, and a table by cause cannot do it.

### Two families, two tables

The eight gates fail in two different ways and averaging them would report a mean of two
things.

| family | gates | how it fails |
|---|---|---|
| sentence or line | `example`, `hedged`, `conditional`, `create-instruction`, `another-repo` | bleeds into the neighbouring bullet or table row, inside a two-line window |
| section or document | `elsewhere`, `external-root`, `creation-target` | floods — a long section with one aside in it, and a document with no heading is one section |

"Governed" does not mean the same thing across a two-line window and a heading-to-heading
section. Separate budgets, separate tables.

### Sampling

The protocol `claims.ts` already has: filter by cause, drop `exists === true`, one per
`family|cause|text`, a cap per repository, and `spread` evenly rather than at random —
*"a sample nobody can reproduce is a number nobody can check."*

One addition: **the budget is per marker, not per cause.** `optional` fired 87 times out of
`hedged`'s 266 over 700 repositories, where the next marker down fired 32. Without a per-marker
cap a third of the `hedged` sample is one word, which is how `16` got read wrong the first
time.

### Thresholds

Two exported constants, `CLAIMS_AT = 0.8` and `LOOSE_AT = 0.2`. Both strict, and the asymmetry
is on purpose: the cell they define is the only one that sends a person to spend an
experiment, and the experiment is the expensive part.

The ambiguous band is reported **apart**, never folded into "governs correctly". `24` is the
reason: a Noul near 0.5 is the model saying it has similar probability either way, not that
the case is mildly anything. Rows that fail to clear the cut because the case is genuinely
doubtful are exactly the rows a person wants to read, and a table that counts them as a
healthy gate says the opposite of what happened.

## The two controls, pre-registered

Without these, "every gate governs well" has two readings that cannot be told apart
afterwards: the gates are well tuned, or the question does not discriminate.

**Negative control.** Include discards from the **shape** rules — `bare-word`, `url`,
`home-path` — where there is no gate and no marker at all. `QUALIFIES_THE_CANDIDATE` should
come back consistently low. If it comes back high, the question is answering something other
than what it asks and the table is void.

**Positive control.** The cases `16` already read by hand, `haddocking/haddock3` above all,
where `optional` silenced three files asserted in three consecutive sentences. If the pass
does not mark those as ungoverned, the question fails on the one case known to exist.

Both go in before the first request.

## What closes this ticket

A table of marker x governed rate, in two parts, and a short list of gate x scope pairs worth
an experiment. Nothing else.

Each experiment is its own ticket, with its own before-and-after audit of the discovery corpus
and its own diff read by hand. `16` is why they are kept apart: it ran the experiment, got two
new findings, read both as false positives, and reverted. A ticket that delivered a table and
an experiment together would read as though the table had concluded something.

## What this does not license

Nothing here is a driftwatch measurement. No number this pass prints is a precision, none
enters `CLASSIFICATION.md`, and none moves a condition of ADR-0006. The rule it might suggest
is still written by hand in `src/extract/`, by a person, and still measured against the 66
repositories that carry human rulings.

## The baseline, run 2026-09-20

Run before building anything, as this ticket says to. `pnpm discovery claims --cause <x>
--sample 400` over all eight prose causes, against the 2533 repositories in
`discards.jsonl`.

**Nothing was truncated.** After dropping `exists === true`, one per `family|cause|text` and
two per repository, every pool came in under the 400 cap, so each row below is the whole
askable population for that gate and not a sample of it.

| gate | discards | `absent` | askable | p >= 0.8 | share |
|---|---|---|---|---|---|
| `hedged` | 7127 | 2186 | 370 | 201 | 54% |
| `example` | 2695 | 1676 | 358 | 141 | 39% |
| `create-instruction` | 5569 | 1160 | 294 | 204 | 69% |
| `creation-target` | 1930 | 786 | 112 | 85 | 76% |
| `external-root` | 1501 | 716 | 114 | 43 | 38% |
| `another-repo` | 385 | 249 | 50 | 15 | 30% |
| `conditional` | 237 | 162 | 66 | 21 | 32% |
| `elsewhere` | 35 | 19 | 11 | 6 | 55% |

1375 requests. **No number here is a precision**, none enters `CLASSIFICATION.md`, and none
moves a condition of ADR-0006.

`claims.jsonl` holds only the **last** run: the pass rewrites it whole. The eight rows above
are what survives, and re-reading any one gate's candidates means re-running that gate.

### Four readings

**The create family cannot be scored by this question, and that is the finding.**
`CLAIMS_A_PATH`'s `criteria.true` includes *"saying where to put something"*, so a sentence
telling the reader to create a file scores true **by construction**. `create-instruction` at
69% is the question agreeing that a create instruction is a create instruction; it measures
nothing about the gate. `creation-target` at 76% is not quite the same case — that gate
suppresses a candidate wherever it appears in the document once some create sentence
elsewhere named it, so the window scored here is often an assertion rather than the create
sentence, and 76% is genuinely suggestive of the cost the file admits. But the baseline
cannot separate the two, and that separation is exactly what
`QUALIFIES_THE_CANDIDATE` exists to make. **This strengthens the case for the pass rather
than weakening it**: the two gates with the highest apparent cost are the two the cheap
question is structurally unable to judge.

**`hedged` carries the volume.** 370 askable and 201 above 0.8 is the largest absolute pool
of doubtful suppressions in the corpus, and it is the gate `16` already probed by hand. It is
the only one with enough mass for the per-marker breakdown this ticket asks for.

**`conditional` is exactly as small as `07` predicted, and stays defensible.** 162 absent over
2533 repositories, 66 askable, 21 above 0.8. `07` read 26 occurrences over 700 repos as
"roughly half real claims" and then corrected itself: those 26 were 18 distinct texts, one
document voting four times. At full scale it is 32% of 66. The file calls this "the riskiest
list" and the number that keeps it defensible is its size, which has not changed.

**`elsewhere` is 11 askable candidates in 6 repositories.** `context-prose.ts` calls it *"the
widest gate in the file"* and its stated risk — a long section with one aside in it — is real
in principle and almost absent from this population. It does not earn a place in the pass. Its
one legible case is worth recording anyway: `DocRoms/Kronn` `templates/docs/AGENTS.md:116`,
where the marker *"not in this repo"* sits inside a table row about a different subject and
silences `docs/linked-repos.md`, which the same row asserts plainly. That is a scope error
visible without asking anything.

### What the pass becomes

The baseline narrows it rather than confirming it as designed.

- **Sentence or line**: `hedged` (370), `example` (358), `conditional` (66), `another-repo`
  (50). 844 items, and `hedged` gets the per-marker cap.
- **Section or document**: `creation-target` (112) and `external-root` (114). 226 items, and
  these two are now the highest-value rows in the ticket, not the afterthought.
- **Dropped**: `elsewhere`, at 11 items in 6 repositories. Recorded above rather than asked.
- **Kept as designed**: the negative control over shape-rule discards, and the positive
  control on `haddocking/haddock3`.

1070 items, one request each carrying both questions.
