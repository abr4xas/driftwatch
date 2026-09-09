# 03: CI on GitHub Actions

**What to build:** every push and every pull request runs the full verification and the branch ends up green or red without anyone having to run anything by hand.

**Blocked by:** 01

**Status:** done, unverified on a remote

- [x] A workflow runs lint, typecheck, test and build
- [x] Node 24 and 25 matrix (ADR-0002)
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

The "driftwatch on driftwatch" step became blocking. It had been left as `continue-on-error` because this repo mentioned `scripts/corpus.ts` before it existed; ticket 10 created it, the run came out clean (`✓ 1 file · no drift`), and from now on any path that breaks in `AGENTS.md` or in `docs/` takes CI down.
