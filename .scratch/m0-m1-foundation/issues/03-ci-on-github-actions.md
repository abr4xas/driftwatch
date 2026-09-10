# 03: CI on GitHub Actions

**What to build:** every push and every pull request runs the full verification and the branch ends up green or red without anyone having to run anything by hand.

**Blocked by:** 01

**Status:** done, first real run pending

- [x] A workflow runs lint, typecheck, test and build
- [x] Node 24 and 25 matrix (ADR-0002) — now 24 and 26, see the note below
- [x] The workflow runs `node ./dist/cli.js --help` after the build, so a broken `bin` does not slip through
- [x] The workflow runs driftwatch over this very repo; while no checks are implemented that only verifies it does not crash
- [x] The pnpm cache is configured and the whole job finishes in under two minutes

## Comments

The workflow is written and the five steps it runs (`lint`, `typecheck`, `test`, `build`, `node ./dist/cli.js --help`, `node ./dist/cli.js`) were verified green locally. What is **not** verified is the workflow running on GitHub Actions: this repo has no remote yet, and creating the remote repo is one of the actions `AGENTS.md` § "Decisions that require asking the user" reserves for the user.

Two details that were not obvious:

- `fetch-depth: 1` instead of the default: driftwatch builds its index with `git ls-files`, so it needs a real working tree. A checkout with no working tree would send it to the glob fallback and CI would stop exercising the hot path.
- `timeout-minutes: 5` and `concurrency` with `cancel-in-progress`, so a branch with several pushes does not pile up jobs.

The "under two minutes" criterion cannot be measured without running it on a remote. It stays pending the first real run.

### Later note, on closing ticket 10

The "driftwatch on driftwatch" step became blocking. It had been left as `continue-on-error` because this repo mentioned `scripts/corpus.ts` before it existed; ticket 10 created it, the run came out clean (`✓ 1 file · no drift`), and from now on any path that breaks in a discovered source takes CI down. That means `AGENTS.md` and nothing else: `docs/` is not an agent context file, so discovery does not reach it. Covering it is `.scratch/m2-other-tier-1-checks/issues/01-config-file-with-the-sources-key.md`.

### Later note, 2026-09-09: the remote exists and the workflow had never run

The remote is now `github.com/abr4xas/driftwatch`, public, default branch **`master`**. The first push went up with 25 commits and produced **zero workflow runs**, because the push trigger read `branches: [main]`. Fixed to `master`.

Worth recording, because "the workflow is written and green locally" hid three separate things that a single real run would have caught immediately:

- the push trigger named a branch that does not exist
- `pnpm/action-setup@v4` does not support pnpm 11, which is what `packageManager` pins; the binary would not have been on PATH and `pnpm install` would have failed
- the matrix still tested Node 25, which reached end of life on 2026-06-01

The "under two minutes" criterion is still unmeasured. It stays open until the first run on the remote reports a duration.
