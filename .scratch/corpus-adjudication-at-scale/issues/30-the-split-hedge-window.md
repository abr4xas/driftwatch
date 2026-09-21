# 30: The `{0,80}` in `HEDGED_SPLIT`

**What to decide:** what the character window between `if` and `exists` should be, given that
it is the only hand-tuned integer among the prose gates.

**Type:** research

**Blocked by:** nothing. Second of ticket `27`'s three experiments.

**Status: resolved 2026-09-20. It stays at 80.** Not because 80 is the right number but
because between 40 and 80 there is no observable difference, and below 40 the trade turns
negative. See §"Answer".

## Why it was on the shortlist

`27` gave `if…exists (split)` 45 claims, 11 over-reaches and **10 ambiguous** — the highest
ambiguous count in the table. It is also the cheapest possible experiment: one integer.

## Answer

### The distribution, measured first

Over the 1140 `hedged` discards whose window holds the split shape, the gap between `if` and
`exists`:

| p50 | p75 | p90 | p95 | p99 | max |
|---|---|---|---|---|---|
| 12 | 27 | 40 | 48 | 85 | 359 |

`{0,80}` sits at roughly the 98th percentile of the shapes present.

### Three audits

| window | findings | certification |
|---|---|---|
| 80 (shipped) | 35132 | 66 · 341 · 37 |
| 40 | 35132 (**+0**) | unchanged |
| 20 | 35156 (+24) | unchanged |

**Halving it changes nothing at all.** Not one finding in 2533 repositories, and not one
snapshot. Every case where the split hedge is the operative gate has its two halves within 40
characters; the long gaps in the distribution above are windows where a literal `HEDGED`
marker was doing the suppressing anyway.

**At 20 it releases 24, and the reading is against it.** Roughly two thirds are the
construction the rule is for, correctly suppressed:

```
If the project is already linked (`.vercel/project.json` or `.vercel/repo.json` exists), …
If `Tests/PlayMode/E2E/` (or engine equivalent) already exists, HALT and ask …
If `.github/workflows/release.yml` (or similar) already exists, read it first …
```

The remaining third are plausible over-reach — `toddmoy/protobox` loses six consecutive
bullets listing `src/extensions/Pill.ts` and its neighbours, and two repositories lose a bare
bullet naming a template. Sixteen false positives to recover eight doubtful claims is the
wrong side of "one false positive costs more than ten false negatives".

### So: no change

The honest statement is narrower than "80 is correct". **The upper half of the constant is
slack and the lower half is load-bearing.** 80 could be 40 with no effect anywhere observable,
which means moving it buys nothing and spends a snapshot review; and a tighter bound is
strictly more fragile against a population this corpus has not seen. The reason to leave it
alone is that there is no measured reason to move it, which is the standard this project
applies to every other constant.

The `27` row that put this on the shortlist is explained rather than contradicted: the 10
ambiguous cases are ambiguous about whether the hedge governs, not about how far it reaches.
