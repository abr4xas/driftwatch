# 03: Hand the release to CI, as a staged publish

**What to do:** let the workflow upload a version, and keep the act of publishing it in a human's hands.

**Blocked by:** `02` — none of this could be configured for a package that did not exist.

**Status:** done

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

## Comments

### The first tag ran the workflow, and it failed on the accessory

[Run 34530720008](https://github.com/abr4xas/driftwatch/actions/runs/34530720008), `v0.1.0`, 32 s. Everything that matters passed on the first attempt: lint, typecheck, 398 tests, build, `--help`, the tool over its own repo and its own documentation, the guard that the tag agrees with `package.json`, and `pack:check`. The two staging steps were **skipped**, correctly — `NPM_PUBLISH` is not set — and the step that explains how to release by hand ran instead.

The job still went red:

```
HTTP 422: Validation Failed
Release.tag_name already exists
```

The GitHub Release for `v0.1.0` had been created **by hand at 21:07:36**, and the workflow started at 21:10:55. So the failure is a race with a human, not a defect in the logic — but a workflow that fails after every check passed, because a page it wanted to create already exists, is a workflow that will train somebody to ignore a red run.

It is idempotent now: an existing release is left exactly as it is, notes included, with a `::notice::` saying so. Somebody who wrote release notes by hand did not ask for them to be replaced.

**What this run proves and does not.** The whole gate is proven end to end on a real tag. The staging path is still unproven, because it did not run: `npm stage publish . --provenance --access public`, the runner's npm, and provenance all wait for `NPM_PUBLISH`.

### The staged release worked on the first tag that ran it

[Run 34531296350](https://github.com/abr4xas/driftwatch/actions/runs/34531296350), `v0.1.1`, 34 s, green. The three things this ticket recorded as unproven all held:

```
npm notice Staging to https://registry.npmjs.org/ with tag latest and public access
npm notice stage Signed provenance statement with source and build information from GitHub Actions
npm notice stage Provenance statement published to transparency log:
           https://search.sigstore.dev/?logIndex=2787320297
+ @abr4xas/driftwatch@0.1.1 (staged with id 89ed7feb-871a-41bf-b55a-a0f480a60255)
```

- **The invocation.** `npm stage publish .` was the right spec.
- **The runner's npm.** `npm install -g npm@latest` did its job, or was never needed; either way it is deterministic now.
- **Provenance.** Signed and in Sigstore's transparency log — the thing the manual `0.1.0` could not have. The registry shows it: `0.1.0` has no attestations, `0.1.1` carries a SLSA provenance predicate.

`npm stage approve` published it, and `latest` is `0.1.1`.

One thing was learned rather than confirmed: **`npm stage publish` runs `prepublishOnly`**, so the gate executes a second time inside the step. It costs a few seconds and it is the behaviour worth having — that script exists for the laptop path, and it turns out to cover this one too.

### The warning it left behind

Every release logged this, from pnpm reading the `.npmrc` that `setup-node`'s `registry-url` writes:

```
[WARN] Failed to replace env in config: ${NODE_AUTH_TOKEN}
```

The file exists to carry a token into npm, and trusted publishing removed the token. `registry-url` is gone, and the registry it also pinned is pinned by `publishConfig.registry` in `package.json` instead — the better place, because it holds for a publish from a laptop as well as from CI.
