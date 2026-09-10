# 03: Hand the release to CI, as a staged publish

**What to do:** let the workflow upload a version, and keep the act of publishing it in a human's hands.

**Blocked by:** `02` — none of this could be configured for a package that did not exist.

**Status:** ready-for-human

## What was configured on npmjs

A **trusted publisher** on `@abr4xas/driftwatch`:

| Field | Value |
|---|---|
| Publisher | GitHub Actions |
| Organization or user | `abr4xas` |
| Repository | `driftwatch` |
| Workflow filename | `release.yml` |
| Environment name | *(empty)* |
| Allow `npm publish` | **unchecked** |

**No token.** OIDC is the whole point: npm exchanges the `id-token: write` permission the workflow already declares for a short-lived credential, and nothing long-lived is stored in the repository. `NPM_TOKEN` is not needed and was never created.

The workflow filename is load-bearing — npm validates that the token came from `release.yml` and from nothing else, so renaming that file breaks releases until the publisher is updated.

## Why "Allow npm publish" is unchecked

npm's own advice, and it is right for this project. Unchecked, the trusted publisher can only **stage**:

```
npm stage publish <spec>    upload a version without publishing it
npm stage list              what is waiting
npm stage view <id>         its details
npm stage download <id>     the exact tarball, for inspection
npm stage approve <id>      publish it, with 2FA
npm stage reject <id>       discard it
```

npm describes it as "deferring proof-of-presence to a later point in time", which in practice means: **CI proves the tag is releasable and uploads it; a person publishes it.** Somebody who manages to run the workflow can leave something in staging and nothing more.

That is the same shape as every other irreversible thing here, and it buys something `pack:check` cannot: `pack:check` inspects what this repository *built*, and `npm stage download` inspects what npm *received*. npm does not allow republishing a version, so the difference matters exactly once per mistake.

It also makes a GitHub Environment with required reviewers unnecessary — it would be the same gate twice.

## What is left

1. Set the repository **variable** `NPM_PUBLISH` to `true`. A variable, not a secret, because it is not one; the step reads `if: vars.NPM_PUBLISH == 'true'` and anything else prints the manual instructions instead.
2. Bump the version, tag it, push the tag.
3. `npm stage list`, then `npm stage approve <id>`.

## What is unproven until that runs

- **The invocation.** `npm stage publish . --provenance --access public` follows `npm publish`'s convention for the package spec, read off `npm stage publish --help`. It has never been executed. If the spec is wrong the step fails and nothing is staged, which is why it is safe to find out this way.
- **The runner's npm.** Staged publishing and OIDC both need a recent npm; `ubuntu-latest` with Node 24 does not guarantee one. The workflow installs `npm@latest` before staging, so the failure this prevents — a confusing "unknown command: stage" — cannot happen.
- **Provenance.** The first release could not have it. This is the release that proves it: the npm page should show "Built and signed on GitHub Actions" with the commit it came from.
