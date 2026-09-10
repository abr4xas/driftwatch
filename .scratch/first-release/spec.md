# The first release

`docs/spec/ROADMAP.md` § "Suggested release order" puts the first npm publish at M2's close, and M2 closed on 2026-09-10. This directory is the sequence that gets `driftwatch@0.1.0` onto npm and then hands the job to CI.

## Why the first publish is manual and the rest are not

Not caution. **npm's per-package settings do not exist until the package does.** A trusted publisher (GitHub Actions OIDC) and a granular access token are both configured on the package's own page on npmjs, so for a name nobody has published there is nothing to configure yet.

That forces the order, and it also explains why the first publish is the only one without `--provenance`: provenance requires a supported CI with OIDC and fails from a laptop. Every publish after the switch flips has it; the first one cannot.

The release workflow is already written and already runs the whole gate on a `v*` tag. Its publish step is gated on a repository variable, `NPM_PUBLISH`, which is unset — so tagging today proves the tag is releasable and publishes nothing.

## The sequence

1. **`01`** — push `master`, and get CI green on the remote for the first time since M2 started.
2. **`02`** — tag `v0.1.0`, let the release workflow run with publishing off, then publish by hand.
3. **`03`** — configure the publisher on npmjs, set `NPM_PUBLISH`, and prove the automation on the next version.

Steps 2 and 3 are the owner's: `AGENTS.md` § "Decisions that require asking the user" lists publishing to npm and any outward-facing action, and nothing here changes that.

## What is already done

- `package.json` is out of `private` at `0.1.0`, with `files: ["dist"]`, `bin`, `exports`, `engines`, keywords and an author.
- `pnpm pack:check` fails the build if the tarball would hold anything outside `dist/` or exceed half a megabyte. It runs in CI and again in the release workflow. Today: 14 files, 54 kB.
- `prepublishOnly` runs lint, typecheck, tests and build, which is what protects the **manual** publish in step 2 — the one path with no CI in front of it.
- `.github/workflows/release.yml` runs the gate, checks the tag against `package.json`, and generates the release notes from the commits since the previous tag.
- The name `driftwatch` was free on npm when this was written (`npm view driftwatch` → 404). Nothing reserves it until step 2.
