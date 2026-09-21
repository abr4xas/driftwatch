# 33: One finding in five is about somebody else's project

**What to decide:** whether driftwatch should audit a document that does not describe the
repository it sits in — and in particular a skill somebody installed rather than wrote.

**Type:** research

**Blocked by:** nothing.

**Status: new 2026-09-21.** Measured at 99% coverage. The decision is open. See §"Answer".

## Where the question came from

Not from the data. From the observation that this whole line of work kept landing on skills,
and the question of why. The answer turned out to be worth a ticket.

## Answer

### The corpus is a third skills by construction

`enumerate.ts` facets on three filenames — `CLAUDE.md`, `AGENTS.md`, **`SKILL.md`** — so a
third of the query space searched for skills. The findings come out in the same proportion:
AGENTS.md 33%, SKILL.md 33%, CLAUDE.md 25%. Skills are not dominant and they are not
incidental; they are exactly the share that was asked for.

### But the skills half is a dozen hoarders

**Half of the `SKILL.md` documents that produce findings come from 14 repositories**, and the
top ten are 43% of them. `NeelakshSaxena/Vayu` alone holds 653.

Stated on the check that matters: **42 repositories — 1.6% of the corpus — produce 33% of all
`path/missing` findings.** Outside them, 696 repositories have at least one finding and the
**median is 3**. That median is what a user sees. The 42 are what every table in tickets `07`,
`25`, `27` and `32` has been silently weighting.

`claims.ts` caps candidates per repository for exactly this reason and says so. The *tables*
do not.

### One finding in five is in a document about something else

Ticket `24` asked `aboutThisRepo` of the four shallowest documents per repository and found
19% off-subject. That is the wrong population for this question and the miss is not random: in
a repository holding 653 skills, the four shallowest are its root `CLAUDE.md`.

`pnpm discovery filter --reported` asks the **same frozen question** of the 6927 documents that
actually produce a `path/missing` finding. 6918 judged, 9 failed, and the findings they cover
are **31 959 of 32 209 — 99%**.

| the document describes its own repository | findings | share | in `SKILL.md` | elsewhere |
|---|---|---|---|---|
| yes (p >= 0.6) | 14 543 | 45% | 3671 | 10 872 |
| unclear (0.4–0.6) | 11 227 | 35% | 2443 | 8784 |
| **no (p < 0.4)** | **6189** | **19%** | **3325** | 2864 |

**6189 findings are in documents Jev reads as being about something else**, and `SKILL.md`
carries 54% of them while being 29% of `path/missing` overall — a skill finding is about twice
as likely to sit in a document that is not about its repository.

Two things this is not. It is not a false-positive count: nobody has ruled on one of these,
and `aboutThisRepo < 0.4` is a model's reading, not a verdict. And it is not a precision; none
of it enters `CLASSIFICATION.md` or moves a condition of ADR-0006.

## The product question, which is open

A skill installed into `.claude/skills/` is a document the user did not write, describing paths
in the project it came from. When driftwatch reports `scripts/build.sh` missing because an
installed skill mentions it, two readings are both defensible:

- **It is drift.** That skill will not work in this repository, and the user wants to know.
- **It is not theirs.** The document is not a claim this repository makes, and
  [ADR-0008](../../../docs/adr/0008-a-specification-is-not-an-agent-context-file.md) already
  established that not every markdown file full of paths is an agent context file.

The package promises to find what is no longer true in "your `CLAUDE.md`, `AGENTS.md` and
skills". The word doing the work is **your**.

Nothing here decides it. What the numbers establish is only that the question is worth
deciding: at 19% of the main check's output it is larger than every false-positive class in
`CLASSIFICATION.md` put together.

## What this does to the other tickets

- `32` (the skill-name autofix) keeps its defect — 670 rewrites is 670 rewrites — but its
  priority now sits behind `14`, which asks whether that check should exist, and behind this.
- Every table computed over the discovery corpus should be read knowing that 42 repositories
  carry a third of it. None of them is wrong; all of them are weighted.
- Acquisition could drop the `SKILL.md` facet, or cap documents per repository at clone time.
  That is a change to `enumerate.ts` and it is not made here.
