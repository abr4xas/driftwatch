# 01: Push, and get CI green on the remote

**What to do:** push `master` so the CI workflow runs over M2's work for the first time.

**Status:** done

The remote is at `7eba018`, which is the second check of M2. Everything since — three checks, four false-positive classes, seventeen corpus repos and the release preparation — has only ever been verified locally.

## Why this is its own step

CI is stricter than the last time it ran, in three ways added after that commit:

- `pnpm lint` now covers `scripts/` as well as `src` and `test`.
- The tool audits **its own documentation** with the second invocation ADR-0008 requires, and it is blocking.
- `pnpm pack:check` fails if the tarball would ship anything outside `dist/`.

All three pass locally. None has ever run on `ubuntu-latest`, on Node 24 **and** 26, from a clean `pnpm install --frozen-lockfile`.

## What to watch for

- **The lockfile.** `--frozen-lockfile` fails if `pnpm-lock.yaml` disagrees with `package.json`, and `package.json` changed (version, author, keywords, scripts). Nothing was added to the dependency graph, so it should hold; if it does not, that is the failure to fix before anything else.
- **Node 26 vs 24.** The corpus does not run in CI (ADR-0007), so what runs on both is the suite and the two self-audits.
- **`import.meta.dirname`** in `scripts/corpus/run.ts` is new since the last CI run. It is Node 20.11+, well under the floor, but it has never been executed by CI — `scripts/` is linted there, not run.

Nothing here is publishable until this is green.

## Comments

Closed 2026-09-10. **Green on the first try**, on both runs that carried the new work: [34527602722](https://github.com/abr4xas/driftwatch/actions/runs/34527602722) in 35 s and [34528897463](https://github.com/abr4xas/driftwatch/actions/runs/34528897463) in 43 s, Node 24 and Node 26.

All three of the things that had never run on a runner ran and passed: `scripts/` linted, the second invocation auditing this repo's own documentation, and `pack:check`. `--frozen-lockfile` held, which was the one failure worth expecting — `package.json` changed four times without the dependency graph moving.

The 43 s is worth recording next to the 30 s from ticket `03` of the M0/M1 batch: the suite went from 355 tests to 398 and two more verification steps were added, and the job got eight seconds slower.
