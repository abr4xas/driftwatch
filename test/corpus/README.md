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
```

## What a snapshot claims

**It does not claim to be correct.** It claims not to change without intent.

A green fixture proves nothing about false positives: we wrote it, with the traps we already knew existed. The corpus runs the tool over context files other people wrote, without knowing driftwatch exists.

When a snapshot changes, the diff is reviewed **by hand**, finding by finding, before accepting it. That diff is the only real precision-regression signal.

## Why the commits are pinned

Without a fixed `sha`, the snapshot would change every time the upstream repo moves, and the diff would stop meaning "driftwatch changed". Updating a pin is a deliberate change, with its own diff review.

## Why it does not run in CI

The clones are over a gigabyte. The corpus is a local gate, run before touching the extraction heuristics and before publishing, not on every push.
