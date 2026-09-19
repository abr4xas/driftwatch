# 22: A parent that is a prefix scores 1.00, and that is an autofix

**What to decide:** whether `parentSimilarity` dividing by the **shorter** path is right, given
that it makes "the target sits above the claim" indistinguishable from "the target is where the
claim said".

**Type:** bug

**Blocked by:** nothing

**Status:** open

## The mechanism

[`parentSimilarity`](../../../src/fix/suggest.ts) measures the common prefix of two directories
`over the depth of the shorter one`:

```ts
return shared / Math.min(left.length, right.length)
```

So when the target's parent is a **strict prefix** of the claim's parent, every segment of the
shorter path agrees and the score is **1.00** — the same score two identical directories get.
Confidence 1 is above `FIXABLE_THRESHOLD`, so the suggestion is applied by `--fix`.

The shape that produces it: a claim written **relative to a nested source**. `resolutionsOf`
resolves it under that source's own directory, so the source's own siblings are automatically
prefixed by it.

```
source   .agents/skills/agentic-workflows/SKILL.md
claim    skills/otel-queries/SKILL.md
local    .agents/skills/agentic-workflows/skills/otel-queries/SKILL.md
target   .agents/skills/agentic-workflows/SKILL.md      ← the source itself
                                                          parent is a prefix → 1.00
```

That is a real reproduction, from ticket `18`: driftwatch offers to rewrite a reference to
*another* skill into a reference to **the file doing the referring**, at confidence 1, fixable.
It needs a repository holding exactly one `SKILL.md`, because a second namesake drops the
confidence to 0.3 and the suggestion stops being fixable.

## What it does in the wild, which is less alarming than that

Measured over the 700 discovery repositories: **50 fixable findings, of which 5 score 1.00 by
strict prefix.**

| repository | claim | suggested |
|---|---|---|
| `qlan-ro/mainframe` ×2 | `.claude/skills/changelog-watch/state.json` | `.agents/skills/changelog-watch/state.json` |
| `modery/PowerDocu` | `modules/PowerDocu.Common/PowerDocu.Common/` | `modules/PowerDocu.Common` |
| `radekamirko/C.R.I.S.P` | `projects/longevity-platform/phase4-…md` | `examples/longevity-platform/phase4-…md` |
| `jvkersch/tmtools` | `src/_wrapper.cpp/_wrapper.h` | `src/_wrapper.h` |

Four of those five look **right**: a skill that moved from `.claude` to `.agents`, a doubled
path segment, a directory renamed. The fifth is the one to adjudicate — the document appears to
be naming two files, `_wrapper.cpp` and `_wrapper.h`, and the fix rewrites the pair into one.

So the mechanism is not producing a stream of bad fixes today. It is producing mostly good ones
by an argument that does not hold, which is a different problem and a quieter one.

## Why it matters anyway

ADR-0006 condition 2 admits **zero** false positives among fixable findings, with no rate. The
reproduction above is not exotic: a repository with one skill, whose skill references another
skill by a path relative to a skills root. Nothing in the corpus produces it, which is exactly
what "condition 2 has never had anything to say about it" meant in ticket `10` — and there the
answer was to check it outside the corpus rather than wait.

## What to decide

1. **Is a prefix a match at all?** The docstring argues the divisor deliberately: a file moved
   from `src/lib` to `src/auth` keeps its prefix and that is the signal. But that case is
   *sibling* directories at the same depth, where `min` and `max` agree. The divisor only
   matters when the depths differ, and that is the case nobody wrote down.
2. **Does dividing by the longer path break the cases the current rule gets right?** The four
   above would score 0.5, 0.67, 0.5 and 0.5 — all still ≥ `SIMILAR`, so all still confidence 1
   and fixable. The constructed case would score 3/5 = 0.6, also still fixable. **So the obvious
   fix does not fix it**, and that is worth knowing before anyone writes it.
3. Whether the real guard is elsewhere: refusing a suggestion whose target **is the source
   file itself**, which is a one-line rule with an obvious argument and covers the reproduction
   exactly.

Option 3 looks right and the ticket should probably end there. Options 1 and 2 are written down
because a reader will reach for the divisor first, and it is a dead end.

## How to price it

`AGENTS.md` requires `pnpm corpus --fixes` on any change touching a suggestion's `fixable`
flag, read edit by edit. Then the 700 repositories before and after, diffed, the way ticket
`16` established — the certification corpus contains none of this shape, so it can only show
that nothing else moved.
