# 08: 1.0.0

**What to build:** the release itself. The surface is honest, the contract is written down, and
the artifact that pins it is committed and passing — so this ticket is the version bump and
whatever the repository's own guards drag along with it.

They will drag a fair amount, and that is the design. The guard that holds every file
advertising a release to the version in the manifest will go red across six documents including
the one-page site, because a previous release taught it to. The site's figures are generated and
tested, so the page follows. Let the tests name the work rather than hunting for it.

This is one release and not two: the cleanup and the freeze ship together, because `0.x` is the
last time removing something is free and a release whose whole changelog is removals followed by
one whose changelog is "the number changed" tells the story in halves.

Merging, tagging and publishing are Angel's. This ticket stops at a commit.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07

**Status:** done 2026-09-20, as a commit. The manifest reads `1.0.0`; nothing is tagged, pushed
or published. One checkbox is qualified — see §"The corpus box, honestly".

- [x] The manifest reads `1.0.0`
- [x] Every document advertising the action's ref names the new tag
- [x] The site advertises the new version
- [x] The full gate passes: lint, typecheck, tests, build, help, driftwatch on itself and on its
      own documentation, and the packaging check
- [~] The corpus check runs over **65 of 66** repositories and no snapshot moves — see below
- [x] Nothing is tagged, pushed or published

## What was built

`npm pkg set version=1.0.0`, and the guards named the rest exactly as the ticket predicted: six
documents carrying `abr4xas/driftwatch@v0.5.0` (twelve occurrences across `README.md`,
`action.yml`, `docs/guide/ci.md`, `docs/guide/output.md`, `docs/spec/ROADMAP.md` and
`site/index.html`), plus the two places the page prints the version.

**Two `0.5.0` references were left alone, deliberately.** The migration route in
`src/core/config.ts` and the two documents quoting it name `npx @abr4xas/driftwatch@0.5.0`,
without the `v`, so the action-ref guard does not match them — and they must not move: `0.5.0`
is the last release that carries `--migrate-config`, which is the whole point of naming a
version there.

### Two claims no test was watching

`ROADMAP.md` § M4 said the one-page site was still open. It landed on 2026-09-11 and the line
went on saying otherwise for nine days — in the roadmap of the tool whose subject is exactly
that. It now records what the site actually did, which was to **replace** the GIF rather than
carry one: a GIF of a terminal is a picture of a measurement, and the page publishes the
measurement, generated and held by a test.

The README's status paragraph said the same thing and now names `CONTRACT.md` and ADR-0014
instead. `path/missing` cannot catch either: the claim was about the state of the work, not
about a path.

§ "Suggested release order" gains `1.0.0` as item 5, with the sentence that it is one release
and not two.

### The corpus box, honestly

`pnpm corpus --check`, whole corpus, no `--only`: **65 repositories read, 37 findings, no
snapshot moved.** The 66th, `spatie/bloom`, cannot be cloned — GitHub answers 404 for it since
today. That is not a regression in the tool and it is not something a retry fixes; it is ticket
`26` in `.scratch/corpus-adjudication-at-scale/`, and it is Angel's decision because removing a
repository moves the denominator every published precision figure is counted over.

The run that found it also found that the runner would have hidden it: it printed `66 repos`
from the count of snapshot files while summing sources over what it had actually read. Fixed in
the same session — a partial corpus run now names what it could not read and exits 1 under
`--check`.

`pnpm corpus --fixes` was **not** run, and is not triggered: nothing under `src/fix/` changed
and no suggestion's `fixable` flag moved in any of these eight tickets.

### The gate, as it came out

```
pnpm typecheck            clean
pnpm lint                 0 errors
pnpm test                 57 files, 811 tests, all passing
pnpm build                21 files, 221.66 kB
node ./dist/cli.js --help prints, and no longer advertises --watch or --migrate-config
driftwatch on itself      5 files, no drift
driftwatch on its docs    34 files, no drift
pnpm pack:check           abr4xas-driftwatch-1.0.0.tgz, 24 files, 79773 bytes
```
