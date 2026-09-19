# 19: A wall-clock budget asserted inside a 43-worker test run

**What to decide:** what to do about `acceptance-m0.test.ts`'s 300 ms budget, which fails
about one run in three and passes every time it is run alone.

**Type:** bug

**Blocked by:** nothing

**Status:** open

## What happens

```
× auditing this repo takes under 300 ms   876ms
```

`pnpm test` spawns one worker per test file — 43 of them — and this assertion measures
**wall-clock time** inside that. Run on its own it takes ~100 ms and passes every time.
Observed three times across one afternoon's work, on three unrelated changes, and reproduced
deliberately: three consecutive full runs gave pass, fail, pass.

`src/` was unchanged in the run that first surfaced it, so it is not a regression in the
thing being measured.

## Why it is not just noise

The budget is real and the comment says why: *"The budget is part of the product, so it is
verified instead of assumed."* That is the right instinct, and it is exactly why the fix is
**not** to raise the number — a budget that is raised whenever it fails stops being one.

What is wrong is the instrument, not the threshold. The test measures a quantity that depends
on how many other processes the runner happens to be starting, and asserts a bound on it.

## Options

1. **Isolate it.** Vitest can run a file sequentially or in its own pool; a budget that must
   not contend with 42 workers should not be in the same pool as them.
2. **Measure work, not wall clock.** The thing the product promises is that auditing this repo
   is fast; the thing that varies under load is the scheduler. Counting what the run *does* —
   files opened, claims extracted — is stable, and it is a weaker promise.
3. **Budget the median of a few runs** rather than one sample. Cheap, and it keeps wall clock
   as the unit, which is what the product actually promises.
4. Raise the number. Rejected above, but worth naming so the decision is on the record.

Option 1 looks right and is the smallest change. Option 3 is a reasonable companion.

## Why it matters beyond the annoyance

It runs in CI. An intermittent red on `main` is the kind of failure people learn to re-run
without reading, and the next real regression in this budget arrives looking exactly like the
noise everyone has been ignoring.
