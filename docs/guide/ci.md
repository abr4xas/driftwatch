# Running it in CI

```yaml
name: driftwatch
on: [pull_request]

permissions:
  contents: read

jobs:
  drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: abr4xas/driftwatch@v1.0.0
```

That is the whole thing. The action defaults to `--format github`, so every stale claim shows up as an annotation on the diff, on the line that makes it.

**`actions/checkout` is required and is not optional detail.** driftwatch builds its index with `git ls-files`, so it needs a real working tree. A shallow checkout is fine; no checkout is not.

## Inputs

| Input | Default | What it does |
|---|---|---|
| `paths` | *(whole repo)* | paths to audit, space separated |
| `format` | `github` | `pretty`, `json`, `github` or `sarif` |
| `only` | — | run only these checks, comma separated |
| `skip` | — | run everything except these |
| `config` | — | explicit path to the config file |
| `sarif` | `false` | also write `driftwatch.sarif` and expose its path |
| `fail-on-drift` | `true` | whether a finding fails the step |
| `version` | *(pinned)* | which driftwatch to run |
| `working-directory` | `.` | where to run it |

### Outputs

`exit-code` — `0` no errors, `1` drift found, `2` the tool itself failed.
`sarif-file` — absolute path to the SARIF file, when `sarif` was true.

## A gate, or a comment

The two ways to run this want opposite things, so the choice is an input rather than a default somebody has to fight.

```yaml
# Advisory: annotate the diff, never block the merge
- uses: abr4xas/driftwatch@v1.0.0
  with:
    fail-on-drift: false
```

`fail-on-drift: false` silences a **finding**, not a failure. If driftwatch itself breaks — a bad config, a path that does not exist — the step still fails with exit 2. A gate you turned off is not a licence to ignore a crash.

## Code Scanning

```yaml
permissions:
  contents: read
  security-events: write

steps:
  - uses: actions/checkout@v7

  - uses: abr4xas/driftwatch@v1.0.0
    id: drift
    with:
      sarif: true
      fail-on-drift: false

  - uses: github/codeql-action/upload-sarif@v4
    with:
      sarif_file: ${{ steps.drift.outputs.sarif-file }}
```

The action writes the file and hands you the path; it does not upload. Uploading from inside would make every repository using it grant `security-events: write` — including the ones that only want annotations — and would pin it to a version of somebody else's action forever.

`fail-on-drift: false` here because Code Scanning is already reporting the findings; failing as well reports them twice.

## Which version it runs

The action runs **the version of driftwatch that shipped with it**. A release tag executes what the `package.json` next to it says, not whatever is newest on npm: an action pinned at a tag whose behaviour changes without a tag is not pinned at all.

**There is no floating `@v0` or `@v1` to track.** Every snippet here names an exact release, so you can read which version of the tool your workflow runs without leaving the file, and nothing moves under you between two runs of the same job. Upgrading is editing the tag, the same as any other dependency.

Override it when you need to:

```yaml
- uses: abr4xas/driftwatch@v1.0.0
  with:
    version: 0.2.0
```

A path or a `.tgz` is used as written, which is how this repo's own CI runs the action against the commit that changed it instead of against npm.

## Node

The floor is Node 24 ([ADR-0002](../adr/0002-node-24-floor.md)). The action checks the runner's Node first and installs 24 **only if it has to** — a repository that already set up Node 26 should not be silently moved down by a linter it happens to run.

## Without the action

Nothing here needs it:

```yaml
- run: npx @abr4xas/driftwatch --format github
```

The action is the same command plus the Node check, the version pin, the SARIF pass and the exit-code handling. For a one-line advisory run, the one line is fine.
