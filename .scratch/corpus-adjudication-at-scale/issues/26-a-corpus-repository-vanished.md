# 26: A certification repository no longer exists

**What to decide:** what the corpus does when one of its 66 repositories is deleted from
GitHub. `spatie/bloom` returned 404 on 2026-09-20.

**Type:** task

**Blocked by:** nothing. The silent half is already fixed; what is left is the decision.

**Status:** needs-triage

## What happened

The release gate for `1.0.0` ran `pnpm corpus --check`. It printed:

```
66 repos · 334 sources · 37 findings
```

and was green. The snapshots on disk sum to **341** sources, not 334. The seven missing ones
are `spatie/bloom`, whose clone failed with `fatal: ambiguous argument 'HEAD'` — a broken local
checkout — and which then failed to re-clone: `remote: Repository not found`, and
`api.github.com/repos/spatie/bloom` answers **404**. Deleted, renamed or made private; from here
the three are indistinguishable.

So the check covered **65 of 66 repositories and reported 66**, because the repo count came from
the number of snapshot *files* on disk while the sources and findings came from what was
actually read. A partial measurement presented as a whole one, which is the failure this project
exists to report.

## What is already done

`scripts/corpus/run.ts` now collects the repositories it could not read, prints the count of
repositories **read** rather than of snapshots on disk, names them, and **exits 1 under
`--check`**. A plain `pnpm corpus` still rewrites what it can and says what it could not, which
is what you want while adding a repository.

One rough edge left alone: under `--only`, the totals line has always been meaningless — it
counts snapshots on disk against sources from one repo. Now it reads `65 repos · 0 sources`
instead of `66 repos · 0 sources`. Neither is useful, and fixing it is a separate small ticket.

## The decision that is left

`spatie/bloom` is in the **calibration** group and its current snapshot has **no findings**, so
it is one of the 58 repositories counted as clean in condition 6. Three options, and none of
them is free:

1. **Leave it.** The snapshot stays committed, the ruling stays in `CLASSIFICATION.md`, and
   `pnpm corpus --check` can never be green again. The gate that ADR-0007 makes a human
   responsibility becomes one nobody can pass, which is how a gate stops being run.
2. **Remove it.** 57 clean of 65 = **87.7%**, against 87.9% today. The number barely moves and
   *every document that publishes it* has to move with it — the site, the guide, ADR-0014. It
   also deletes evidence: `bloom` is named in ADR-0009's table as the repository whose false
   positive took condition 6 from 100% to 75%, and that argument is part of why the criterion
   was rewritten.
3. **Replace it**, under the promotion rule in `test/corpus/README.md`: select on a property of
   the repository, never on the tool's output. That keeps the denominator at 66 and costs a
   round of hand adjudication.

It is a decision about the measurement, so it is Angel's. What must not happen is the third
thing that decides itself: a check that fails for a reason nobody remembers, until somebody
stops running it.

## Why it is not urgent

Nothing about the tool changed. The 65 repositories that were read produced **37 findings and
no snapshot moved**, which is the same result as the last green run plus one repository that is
no longer reachable. The release gate for `1.0.0` was reported with exactly that wording rather
than as a clean whole-corpus run.
