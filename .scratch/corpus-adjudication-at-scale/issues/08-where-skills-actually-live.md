# 08: driftwatch does not look where skills live

**What to decide:** whether `classifySource` should recognise a `SKILL.md` outside
`.claude/skills/`, and at what false-positive cost.

**Type:** research

**Blocked by:** nothing

**Status: resolved 2026-09-18 — with a decision not to widen.** See §"Answer".

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

## Answer

### The sample was widened first, as step 1 asked, and it moved the number

The 70-repo figure in the body came from repos that publish to skills.sh, one row per
publisher. A second sample — 1000 code search results, **780 unique repos, 771 of them not in
the skills.sh index** — is both larger and independent of the registry:

| Where the `SKILL.md` lives | Repos | |
|---|---|---|
| `skills/` nested (`.agents/skills/`, `plugins/*/skills/`, `src/skills/`, …) | 344 | 44.6% |
| `skills/` at the repo root | 122 | 15.8% |
| no `skills` segment at all | 110 | 14.3% |
| repo root | 105 | 13.6% |
| **`.claude/skills/`** | **88** | **11.4%** |

So the direction holds and the magnitude does not: **11.4%, not 5.7%.** The first sample was
biased by being per-publisher over a registry. Recorded rather than quietly replaced, because
the 5.7% has already been cited in `02` and in a commit message.

### What the candidate rules would actually cover

| Rule | Coverage |
|---|---|
| A — `.claude/skills/` (today) | 11.5% |
| B — `<tool-root>/skills/`, reusing `foreign-tools.ts`'s list | 19.0% |
| C — any `skills/<dir>/SKILL.md` | 71.2% |
| D — any file named `SKILL.md` | 97.7% |

B is the tempting one, because the list already exists and `.agents/skills/` and
`.cursor/skills/` do show up in the data. It buys 7.5 points.

### The measurement that decides it

125 real `SKILL.md` files were fetched across the five layouts, 25 each, and parsed **with
driftwatch's own `parseFrontmatter`** rather than with a hand-rolled reader. That choice
mattered: a naive parser reported 15 descriptions under the 20-character floor, and the real
one reports **zero** — all fifteen were block scalars (`description: >`) that the naive
regex read as empty. Round eleven's 50-character margin stands.

The rule that decides is the first one, `name` matches its directory:

| bucket | comparable | mismatch | rate |
|---|---|---|---|
| `.claude/skills/` | 23 | 2 | **9%** |
| `skills/` at root | 22 | 1 | 5% |
| `skills/` nested | 23 | 4 | 17% |
| elsewhere | 22 | 4 | 18% |
| repo root | 0 | — | 22 files with no directory to compare against |

And reading all eleven mismatches, **eight are not drift**:

```
Sales Pipeline Tracker     dir=sales-pipeline-tracker     title case vs kebab
Hook Development           dir=hook-development           title case vs kebab
Bankr Dev - Portfolio      dir=bankr-dev-portfolio        title case vs kebab
Writing for Developers     dir=writing-for-developer      title case, and a plural
Agent Browser              dir=sakaen736jih_agent-...     directory is generated
graph                      dir=2026-08-24T09-20-09-850Z   directory is a timestamp
new-skill                  dir=skills                     no skill directory at all
skill-name                 dir=skill                      a template's placeholder
```

Three are plausibly real: `inov8-orthopedics-design` vs `inov8-orthopedics`,
`flutter-animating-apps` vs `animations`, `testbench-package-testing` vs `testbench-docs`.

**So widening `classifySource` to layout D would add roughly one false positive for every
eleven skills found.** ADR-0006's conditions 3 through 6 count repos with *zero* false
positives, and a repo with thirty skills would trip them on its own. The answer to step 2 is
that no path pattern is safe, and a content gate does not save it either: the gate is about
whether the file is a skill, and the false positives here are skills — it is the **rule**
that does not travel, not the classification.

### Decision

**`classifySource` does not widen.** `docs/spec/ROADMAP.md` provides for exactly this
outcome: tune the heuristics, or accept that the check does not get there and say so. This is
saying so, with a number attached.

What the check covers is 11.4% of the `SKILL.md` files in the world, and that is the honest
figure to cite for `skill/frontmatter` from now on — not as a defect to fix, but as the scope
of what it claims.

### Two things this turned up that are not about widening

**1. A fixable false positive in the check as it ships today.** Reproduced against real
driftwatch:

```
.claude/skills/bankr-dev-portfolio/SKILL.md
  ✗ 2  name  name does not match the directory  → bankr-dev-portfolio?
1 fixable with --fix
```

`name: Bankr Dev - Portfolio` is a human-readable title; the directory is its kebab-case
form. driftwatch offers to **rewrite the title into the slug**. ADR-0006 condition 2 admits
no false positive among the fixable findings at any rate, and this one is one — if a
title-cased `name` is legitimate. That is the part this ticket cannot settle: whether Claude
Code requires `name` to equal the directory is a question about Claude Code's contract, not
about driftwatch, and it has to be answered from that specification before anything changes.
It appeared in **1 of 23** real `.claude/skills/` skills sampled, which is not rare.

**2. The container case is already handled.** `.claude/skills/SKILL.md`, with no skill
directory of its own, produces no finding — checked, not assumed. Comparing `name` against
`skills` would have been meaningless and the code already declines to.

### What was not done, and why

No code changed. Step 4 of this ticket priced a `classifySource` change at "the corpus
snapshots move and every diff needs hand review", and the measurement says the change should
not happen. Paying that cost for a rule that adds a false positive every eleven skills would
be the treadmill of rounds 13-16 with the direction reversed.
