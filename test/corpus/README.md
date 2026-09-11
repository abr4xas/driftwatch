# The corpus

This directory is the only honest false positive measurement the project has.

## What is here

- `repos/` — shallow clones of public repos, pinned to a commit. **Gitignored**: it is a local cache, rebuilt with `pnpm corpus`.
- `snapshots/` — driftwatch's output for each repo. **Committed.**
- `CLASSIFICATION.md` — every corpus finding reviewed by hand and classified as a true or false positive, with its justification.

## How it is used

```
pnpm corpus            clone what is missing and rewrite the snapshots
pnpm corpus --check    fail if a snapshot differs from the stored one
pnpm corpus --fixes    print every edit `--fix` would apply, and write nothing
```

`--fixes` answers the question the snapshots cannot: not whether a path is
really missing, which is what a finding claims, but whether the **rewrite** is
the one a maintainer of that repo would have made. It prints the line before and
the line after, for a human to read. It never writes to a clone — these are
checkouts we do not own.

## What a snapshot claims

**It does not claim to be correct.** It claims not to change without intent.

A green fixture proves nothing about false positives: we wrote it, with the traps we already knew existed. The corpus runs the tool over context files other people wrote, without knowing driftwatch exists.

When a snapshot changes, the diff is reviewed **by hand**, finding by finding, before accepting it. That diff is the only real precision-regression signal.

## Why the commits are pinned

Without a fixed `sha`, the snapshot would change every time the upstream repo moves, and the diff would stop meaning "driftwatch changed". Updating a pin is a deliberate change, with its own diff review.

## Why it does not run in CI

Because the verdict requires a person. CI can detect that a snapshot changed; it cannot rule on whether the change is an improvement or a regression, and that ruling *is* the measurement. Most legitimate changes are intended — a discard rule got sharper — so a gate on this would go red on improvements and need adjudicating every time. That is noise, not a gate.

The 3.3 GB of clones is the secondary reason, and it is secondary on purpose: caching them would not touch the real objection.

The full argument is in [ADR-0007](../../docs/adr/0007-the-corpus-does-not-run-in-ci.md), and the four moments at which to run this by hand are in [AGENTS.md](../../AGENTS.md) § Verification.

What *does* run in CI is `test/corpus-bookkeeping.test.ts`: it clones nothing and checks the corpus's bookkeeping — every repo has its snapshot, no snapshot is an orphan, the validation group still meets ADR-0006 condition 8, and the totals `CLASSIFICATION.md` cites match the snapshots.
