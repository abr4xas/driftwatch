# 19: A wall-clock budget asserted inside a 43-worker test run

**What to decide:** what to do about `acceptance-m0.test.ts`'s 300 ms budget, which fails
about one run in three and passes every time it is run alone.

**Type:** bug

**Blocked by:** nothing

**Status: resolved 2026-09-19.** Option 3, refined to the minimum. See §"Answer".

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

## Answer

Resolved 2026-09-19. Option 3, with one change: **the fastest of several runs, not the
median.**

Contention only ever *adds* time — another worker cannot make this one quicker — so the
minimum converges on what the code costs with the machine to itself, which is the number the
budget was always about. A median still carries whatever contention was typical during the
run, which is a property of the machine rather than of driftwatch.

`test/helpers/budget.ts` holds the instrument and both budgets use it: the 300 ms acceptance
and the 200 ms index. It warms up once outside the measurement, because a fresh worker pays
for JIT on its first call and that is not the tool's work either.

### It does not weaken the assertion, and that was checked

Work that genuinely takes 400 ms has no run under 400. Proved rather than argued, by setting
the threshold to 1 ms and watching it fail:

```
AssertionError: took 58 ms: expected 57.96 to be less than 1
```

Which also produces the number that explains the whole ticket. **The audit costs about 58 ms
against a 300 ms budget** — five times the headroom — and the failures were readings of 876 ms.
Nothing was close to the budget; scheduling was inflating a 58 ms job by fifteen times.

### The evidence it is fixed

Five consecutive full runs, all green, where the failure rate was about one in three. At that
rate five clean runs happen by chance about four times in a thousand.

### What was not done

**The threshold was not touched**, which §"Options" ruled out and is worth repeating here: a
budget raised whenever it fails is not a budget. Isolating the file into its own pool — option
1, and the one this ticket recommended — was not needed once the instrument stopped measuring
the scheduler, and it would have cost a second vitest project to maintain.

`SPEC.md` § 9 now says how the budgets are measured, because a reader finding a `fastestOf`
in a test deserves the argument next to the number it defends.
