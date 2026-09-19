# 08: driftwatch does not look where skills live

**What to decide:** whether `classifySource` should recognise a `SKILL.md` outside
`.claude/skills/`, and at what false-positive cost.

**Type:** research

**Blocked by:** nothing

**Status:** open — **the largest known gap in what driftwatch audits**, found 2026-09-18
while answering `02`

## The measurement

[`classifySource`](../../../src/core/discover.ts) classifies a file as a `skill` only when
its path carries the `.claude` + `skills` pair. Across 70 repositories sampled from the
skills.sh index — every one of them a repo that publishes at least one skill:

| Where the `SKILL.md` lives | Repos | |
|---|---|---|
| somewhere else (`skill/`, `.github/plugins/*/skills/`, nested) | 31 | 44.3% |
| `skills/` at the repo root | 27 | 38.6% |
| repo root | 8 | 11.4% |
| **`.claude/skills/`** | **4** | **5.7%** |

**94% of published skills are invisible to driftwatch.** Not mis-audited — never classified
as a source, so no check reaches them.

## Why this was not obvious

`test/corpus/` has 31 skill sources across 66 repositories and they are all under
`.claude/skills/`, because the corpus was assembled from repos that use Claude Code. The
sampling frame and the blind spot line up exactly: a corpus of Claude Code repositories
cannot show you that the wider ecosystem puts skills somewhere else.

Round eleven of [`CLASSIFICATION.md`](../../../test/corpus/CLASSIFICATION.md) read 30 real
skills and found nothing, and concluded the check is silent because published skills are well
formed. That conclusion survives — 244 real skills, correctly placed, produced zero genuine
findings, which is the same result at eight times the mass. But it was only ever half the
story, and the corpus could not have shown the other half.

## The decision, and why it is not obvious either

**For:** a check that runs on 6% of its subject matter is close to not shipping. `skills/` at
the root is `npx skills`'s convention and it is 38.6% on its own — one extra pattern would
take coverage from 5.7% to 44.3%.

**Against:** `skills/` is an ordinary English word and an ordinary directory name. Matching
any `skills/` in any repository is a rule about somebody else's vocabulary, applied to repos
that never heard of Claude Code, and the five `skill/frontmatter` rules would then fire on
files that are not agent skills at all. [ADR-0008](../../../docs/adr/0008-a-specification-is-not-an-agent-context-file.md)
rejected `docs/` for this exact shape of reason, and the project's rule — one false positive
costs more than ten false negatives — points the same way.

**The middle, and probably the answer:** gate it the way
[`foreign-tools.ts`](../../../src/verify/foreign-tools.ts) gates its list. That module only
suppresses when the root is *absent*, because presence is evidence. Here the evidence
available is the file's own content: a `SKILL.md` with frontmatter carrying `name` and
`description` is an agent skill wherever it sits, and a `skills/` directory full of anything
else is not. A rule keyed on "file named `SKILL.md` **and** frontmatter with the required
keys" would be about the thing itself rather than about a directory name.

That has a cost worth naming before anyone likes it too much: `skill/frontmatter`'s first
rule is **`name` matches its directory**, and it is the rule most likely to fire. Under a
widened `classifySource` the "directory" would sometimes be a plugin folder or a repo root,
where that rule means nothing. Widening discovery and keeping all five rules is not one
decision, it is two.

## What to do

1. Widen the sample. 70 repos from one registry is a frame with its own bias; the population
   that matters for `04` is repos that never published. Confirm the ratio holds there.
2. Decide the rule shape — path pattern, content gate, or both — and price it against the
   `false-positive-traps` fixture.
3. Decide, separately, which of the five `skill/frontmatter` rules still apply to a skill
   found outside `.claude/skills/`.
4. If anything changes in `classifySource`, the corpus snapshots move and every diff needs
   the usual hand review. That is the real cost of this ticket and it is not small.

## What is not in question

This does not touch the two-corpus split, and it needs no discovery corpus to act on: the
measurement above took 70 API calls. It is the cheapest open ticket in this directory and
the only one whose subject is the shipped tool rather than the research around it.
