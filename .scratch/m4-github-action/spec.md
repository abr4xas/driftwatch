# M4 (second batch) — The GitHub Action

The full specification lives in `docs/spec/`. This file only delimits the scope of this batch and records what was decided before writing it.

`docs/spec/ROADMAP.md` § M4 asks for a published GitHub Action. The first batch is what made it worth writing: before `--format github` and `--format sarif`, an Action would have piped a terminal report into a log nobody expands.

## Two decisions taken before any code

**It lives in this repository, as `action.yml` at the root.** The ROADMAP writes it as `driftwatch/action@v1`, which implies an organisation that does not exist. A separate repository would also need its own tags and its own answer to "which version of the package does `@v1` run", maintained by hand. Here the answer is free: the tag that selects the Action selects the `package.json` next to it.

**It does not upload the SARIF itself.** With `sarif: true` it writes the file and exposes the path as an output; the caller adds `github/codeql-action/upload-sarif` if they want it. Uploading from inside would make every repository using the Action grant `security-events: write` — including the ones that only want annotations — and would pin us to a version of somebody else's action forever.

## What it does

One composite action, with explicit inputs rather than a free-form `args` string.

- `--format github` by default, because annotations on the diff are the reason to run this in CI at all.
- `sarif: true` runs a second pass that writes `driftwatch.sarif`. A second pass and not a reformat of the first: the tool takes under 500 ms on a 5,000-file repo, and two honest runs cost less than one run that has to buffer both shapes.
- `fail-on-drift: false` exists because the two uses want opposite things. Annotations on a PR are advisory; a failing job is a gate. Which one you want is not ours to decide.

## The version it runs, and the trap in it

`npx @abr4xas/driftwatch@latest` would be one line and wrong: an Action pinned at `@v1` that silently upgrades what it executes is an Action whose behaviour changes without a tag. The default is **the version in the `package.json` sitting next to `action.yml`**, read at run time. Pinning the Action pins the tool.

**This has a consequence worth writing down: the Action does not work until the next publish.** `0.1.1` is what is on npm and it has no `--format github` — the flag parses and refuses. So `action.yml` lands here, and the first tag that makes it usable is the one that publishes the formats. Saying so is cheaper than someone discovering it from a red job.

The `version` input also accepts a path or a tarball, which is what makes the Action testable against the commit that changes it rather than against whatever is published.

## Node

The runner's Node is whatever the image ships, and the floor is 24 (ADR-0002). The Action **checks first and installs only if it has to**: a repository that already set up Node 26 should not be silently moved to 24 by a linter.

## Acceptance

- A job in this repo's CI uses the Action from `./`, against a tarball built from the commit, and the whole thing is green. An Action nobody runs is an Action that breaks silently.
- Annotations appear on a real PR. That one is checked by looking, not by a test.

## Out of scope

- The GIF and the one-page site. Deferred to another session, deliberately.
- `--init`. Still ownerless, now in a fifth spec.
- A marketplace listing, which is a form and a button rather than code.

---

## Closed 2026-09-11

`action.yml` at the root, `docs/guide/ci.md`, an `action` job in CI that runs it from `./` against a tarball built from the commit, and `test/action.test.ts`.

**Verification:** 526 tests, lint, typecheck, build, the tool silent over its own repo and over `docs/` (31 documents now). The action itself was exercised by hand against a temporary repo with real drift: the annotation renders, the SARIF is valid with 1 result and 5 rules, and an unknown `--only` exits 2.

**What running it found that reading it would not:** `npx <path.tgz>` executes the argument instead of installing it, and `pnpm pack`'s output format is not stable across majors. Both are in ticket `01`.

**The honest limit:** the action runs the published package, and the published package is `0.1.1`, which has no `--format github`. It works on the next publish. The CI job passes a tarball precisely so this is not the reason it looks broken.

Next: the GIF and the one-page site, deferred deliberately. Then `--init`, ownerless since M2.
