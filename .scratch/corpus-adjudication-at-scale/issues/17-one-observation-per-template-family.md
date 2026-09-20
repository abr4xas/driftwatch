# 17: One observation per template family, before anything else reads the corpus

**What to build:** the collapse the [spec](../spec.md) § "Acquisition: the GitHub API,
filtered" calls the most important part of the filter — so that a document copied into forty
repositories is one observation and not forty.

**Type:** task

**Blocked by:** nothing — `07` produced the evidence and the corpus is on disk

**Status: resolved 2026-09-19.** Built, run with Jev, and it corrects the count it was
opened for. See §"Answer".

## Why now, and not when `09` skipped it

`09` deliberately left the filter out and said so: acquisition had to exist before anything
could be filtered, and a template family is a judgement over documents rather than over search
results. That was right. What changed is that the corpus has now been **read**, in `07`, and
the reading was wrong in a way that only this fixes.

## The evidence, which is a mistake of mine

`07` adjudicated the `conditional` gate by reading every discard it could not rule out. The
figure reported was "roughly half of them are real claims". Over 700 repositories:

| | occurrences | distinct texts |
|---|---|---|
| `conditional`, not known to be satisfied | 26 | **18** |

`./assets/` was counted **four times**. It is two repositories —
`christopher-buss/bedrock` and `crafts69guy/.dotfiles` — carrying the same
`.agents/skills/teach/SKILL.md`. One document, four votes, in a sample of 26.

That is the whole problem in one row, and the conclusion it fed was reported before it was
caught.

## Why hashing is not the answer, measured

The obvious fix is to deduplicate by content hash, which needs no model at all. It was
measured over the 700 clones, and it does not reach the case above:

- 4460 source documents, 4088 distinct contents.
- 21 contents appear in more than one repository: 88 occurrences across 53 repositories.
- **Findings attributable to a document that exists verbatim elsewhere: 0.**

So exact duplication is real but harmless, and the largest instance — one `CLAUDE.md` in 30
repositories — is the single line `@AGENTS.md`, a convention rather than a template.

Meanwhile the pair that actually biased `07`:

```
christopher-buss/bedrock   .agents/skills/teach/SKILL.md   9506 bytes
crafts69guy/.dotfiles      .agents/skills/teach/SKILL.md   9507 bytes
```

Different hashes. The diff is a comma promoted to an em dash:

```
- … diagram helpers, and anything else a second lesson could reuse.
+ … diagram helpers — anything a second lesson could reuse.
```

**One byte is the difference between "the same skill twice" and two independent
observations**, and no hash, normalisation or diff threshold worth defending answers it in
general. That is the judgement, and it is the shape the spec describes: low cardinality,
short input, high volume, cheap to be wrong about.

## What to build

1. **Deterministic first, because it is free.** Group by content hash; that is 21 families
   for nothing and it narrows what anything else has to look at.
2. **Jev on the pairs that survive**: candidates that are close but not identical — same
   basename and skill directory, similar length, high token overlap — judged as "the same
   document, edited" or "two documents". Code picks the candidate pairs; the model judges
   them; neither invents one.
3. **Output a family table**, `family → repositories`, written to `test/discovery/` with the
   rest of the disposable state.
4. **Teach the reading to use it.** `discovery-discards.ts`'s `sample` should offer one
   occurrence per family, so the next person reading a rule reads documents rather than
   copies.

## What it must not do

**Jev groups; it does not adjudicate.** The output is a table of families, and every rule
that comes out of reading them is still written by hand in `src/` and still measured against
the 66 repositories that carry human verdicts. Nothing here goes near the main path —
`ROADMAP.md` § "Out of scope" and `AGENTS.md` § "Decisions that require asking the user" both
forbid an LLM in the tool, and this is not in the tool.

And nothing it produces is a precision. The same rule as everything else in this directory.

## Why it is worth doing before ticket 11 or 14

Neither of those reads the corpus — they are decisions about code. **The trigger for this is
the next ticket that mines the discovery corpus for classes**, and `07` established the method
that ticket will use. Without the collapse, every such reading repeats the error above at
whatever scale it runs at, and the error is invisible from inside the reading: four rows with
four different repository names look like four observations.

## What `07` already learned that applies here

A discard is not a finding, and a model asked the wrong question answers it confidently at
scale. `07`'s original plan was to have Jev judge each discard for "does this document claim
the path exists", and that turned out to be the wrong question — the deterministic diff of two
audits answered the real one. The job here is different in kind: it is not a judgement the
tool could have made itself, it is a judgement about **which observations are independent**,
which nothing in the tool can see.

## Answer

Resolved 2026-09-19. **3980 documents collapse to 3570 families, and 50 span more than one
repository** where hashing alone found 20. `pnpm discovery families`.

### The model is Jev, and getting there was the interesting part

Angel asked for Jev and I reached for a chat model through the gateway instead. That was
wrong twice over, and the second way is the one worth recording: **Jev is not a language
model.** The gateway says so outright —

```
Model 'typesafe-ai/jev' is an evaluation model, not a language model.
Use the evaluation generation API instead.
```

— and the shape that follows from it is the reason this is the right tool. `evaluate()` takes
**shared state** and **typed questions**, and a `boolean` question comes back as `P(true)`.
No prose is generated and none is wanted: the question is asked 137 times over near-identical
inputs, nobody reads an explanation, and what the code needs is a number it can threshold. The
first attempt asked a chat model for `{ same, why }` and was paying for a paragraph nothing
consumed.

### The question, and what the criteria are for

A Noul, phrased as a statement, with both criteria spelled out:

> **true** — one is derived from the other, or both from one source.
> **false** — two documents written independently. They may describe the same tool, follow the
> same convention, or share boilerplate, and still be two documents.

The `false` criterion is doing the work. `overlapOf` has already established that the pair is
alike — that is why it is a candidate — so what Jev is being asked for is **derivation, not
similarity**. Without saying so the question collapses into the one the set intersection
already answered.

`MERGE_AT = 0.8`, and strict on purpose: merging is the **claim** here. Calling two documents
one takes an observation out of every count that follows, which is the same shape as a false
positive in the tool. A wrong split only leaves the bias where it already was. Every
probability is written to `family-verdicts.jsonl`, because a threshold nobody can re-run is a
threshold nobody can argue with.

### What it answered

**137 pairs, 0 unjudged, 133 merged.** The four it refused are the evidence that the question
is the right one:

| pair | overlap | P(same) |
|---|---|---|
| `openspec-ff-change` ~ `openspec-propose` (×3) | 0.70 | **0.60** |
| `domain-modeling` ~ `grill-with-docs` | 0.77 | **0.79** |

Different skills from the same toolkit, similar prose, genuinely two documents. That is exactly
the distinction a line-overlap cannot make, and it is the whole reason a judgement was bought.

### It corrects the count it was opened for

Over the discards `07` reads, **5055 of 95314 are a copy of another repository's document** —
5.3%. And the row `07` adjudicated by hand:

| | occurrences | after collapsing |
|---|---|---|
| `conditional`, not known to be satisfied | 26 | **23** |

The `./assets/` that was counted four times is counted once. `pnpm discovery sample` now reads
one document per family per rule — two *rules* firing on one document are still two
observations, which is the distinction that keeps this from collapsing the thing being read.

With no family table the sampler behaves exactly as before, so a corpus nobody has run
`families` over still works.

### What it must not do, kept

Jev grouped; it adjudicated nothing. What came out is a table of families, and every rule that
comes out of reading them is still written by hand in `src/` and measured against the 66. The
certification corpus is untouched by all of this — 66 repos · 341 sources · 39 findings — and
`src/` has **zero changed lines**: `ai` and `zod` are devDependencies, `tsdown` builds `src/`
alone, and the tarball is unchanged at 25 files.

## What 2533 repositories said, and it is not what 700 said

Re-run on 2026-09-20 over the whole discovery corpus. Every number in §"It corrects the count
it was opened for" was measured over 700 repositories and **understated the correction by a
factor of six**.

| | 700 repos | 2533 repos |
|---|---|---|
| documents | 4460 | **191 936** |
| distinct contents | — | 138 078 |
| candidate pairs | ~500 | **193 185** |
| families | — | **123 734** |
| discards that are a copy | 5055 of 95 314 — **5.3%** | 446 465 of 1 352 382 — **33%** |

One document in three is a copy of another repository's document. The largest family is
**2685 copies across 118 repositories**, and what it is says why this ticket exists:

    lib/workspace-core/fixtures/risk/gm006-managed-clean/input-repo/CLAUDE.md

A fixture. 7700 families cross more than one repository and hold 52 191 documents between them.

### The pass had to be asked a different question

193 185 pairs is not something anyone puts to a model: at eight at a time it is hours of
gateway and a bill nobody sized. A **stratified sample of 600**, spread across overlap bands
rather than taken off the top, bought the thing worth buying — not every answer but the place
where the answer stops being yes:

| overlap | judged | one document |
|---|---|---|
| 0.85–1.00 | 180 | **180** |
| 0.80–0.85 | 60 | 57 |
| 0.65–0.80 | 180 | 167 |
| 0.60–0.65 | 60 | **40** |
| 0.50–0.60 | 120 | 102 |

So the judgement carries information in one part of the range and none in the other, and the
part where it carries none is 79% of the pairs. `CERTAIN_ABOVE = 0.85` merges those 152 685 by
arithmetic, unasked, and the 41 157 below the line are the only ones bought.

The 137 verdicts in §"What it answered" would have said the opposite. 133 of 137 yes, spread
evenly across the range, and the threshold looked like it could be 0.5. They were too few and
too badly spread to see the curve — which is the same lesson as
[ADR-0009](../../../docs/adr/0009-precision-is-counted-in-quiet-repos.md), arriving from the
other direction: a number read off a sample too small to have a shape.

### The correction is not uniform, and that is the useful part

Per rule, what collapsing costs:

| rule | every discard | one per family | falls |
|---|---|---|---|
| `create-instruction` | 5569 | 1777 | **−68%** |
| `creation-target` | 1930 | 736 | **−62%** |
| `url` | 15 535 | 7340 | **−53%** |
| `bare-word` | 875 870 | 569 016 | −35% |
| `conditional` | 237 | 164 | −31% |
| `elsewhere` | 35 | 35 | **0%** |

`create-instruction` fires on template sentences — *"create a `SKILL.md`"* — copied verbatim by
thousands of repositories, so two thirds of its apparent cost is one template counted again.
`elsewhere` loses nothing: it fires on prose somebody wrote by hand about their own repository.

That distinction is what the per-document table could not make: **which rules measure the
ecosystem and which measure a template.** It is also a warning about the rest of `07`'s tables,
which are counted per document.

### Still not adjudication, at this scale either

Jev grouped. Nothing it said became a verdict: what survives into the repository is
`CERTAIN_ABOVE`, one number, with the measurement that chose it written beside it, and moving
it means measuring again rather than arguing. The certification corpus is untouched — 66 repos
· 341 sources · 37 findings.
