# 03: Hand the publish to CI

**What to do:** configure the publisher on npmjs and turn the workflow's publish step on.

**Blocked by:** `02` — none of this can be configured for a package that does not exist yet.

**Status:** ready-for-human

## On npmjs, for the `driftwatch` package

Either of the two, and the first is better:

- **A trusted publisher (OIDC).** The package's settings page takes the repository and the workflow filename, and then GitHub Actions publishes with no token at all. Nothing long-lived is stored in the repository, which is the whole point.
- **A granular access token** scoped to this package with read-and-write, stored as the repository secret `NPM_TOKEN`. The workflow already reads it through `NODE_AUTH_TOKEN`. Use an *automation* token so a 2FA prompt does not block a workflow.

## On GitHub

Set the repository **variable** `NPM_PUBLISH` to `true`. It is a variable and not a secret because it is not one — and the step reads it with `if: vars.NPM_PUBLISH == 'true'`, so anything else leaves publishing off and prints the manual instructions instead.

## Then prove it

The automation is unproven until a tag publishes something. The next version is what proves it: bump `package.json`, tag it, and watch the workflow do the publish with `--provenance` — which the first release could not have.

Check the provenance landed: the npm page shows the "Built and signed on GitHub Actions" attestation, with the commit it came from.
