# 17: One observation per template family, before anything else reads the corpus

**What to build:** the collapse the [spec](../spec.md) § "Acquisition: the GitHub API,
filtered" calls the most important part of the filter — so that a document copied into forty
repositories is one observation and not forty.

**Type:** task

**Blocked by:** nothing — `07` produced the evidence and the corpus is on disk

**Status:** open

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
