# 01: `action.yml`, and a CI job that runs it

**What to build:** a composite action at the repo root, documented, and exercised by this repo's own CI against the commit rather than against npm.

**Blocked by:** the output formats batch.

**Status:** done

## What has to change

- [ ] `action.yml`: inputs `paths`, `format`, `only`, `skip`, `config`, `sarif`, `fail-on-drift`, `version`, `working-directory`. Outputs `exit-code` and `sarif-file`.
- [ ] **Inputs reach the shell through `env:`, never through `${{ }}` interpolation inside `run:`.** An input interpolated into a shell script is a shell injection in an action anybody can call. This is the one rule in the file that is not about taste.
- [ ] Node floor honoured by checking `process.versions.node` and installing 24 **only if the runner is below it**.
- [ ] The main run must not abort the step before the SARIF pass; the exit code is captured and acted on at the end.
- [ ] A `driftwatch` job in `.github/workflows/ci.yml` that packs a tarball and runs `uses: ./` against it.
- [ ] `docs/guide/ci.md`, and the README's "In CI" section pointing at it.

## What to decide

- [ ] Whether `sarif: true` changes `format` or adds a pass. It adds a pass. Overloading `format` would mean `format: github, sarif: true` has to mean something, and every answer to that is a surprise.

## Tests

There is no unit test for a YAML file. What stands in for one:

- [ ] the CI job, which fails if the Action stops working;
- [ ] a check that every input the file declares is used in a step, since an input nobody reads is a documented lie.

## Out of scope

- Publishing to the marketplace, the GIF, the site.

## Comments

Closed. 5 tests in `test/action.test.ts`, 526 in the suite.

### Two things only running it would have found

**`npx <path.tgz>` does not install a tarball, it tries to execute it.** The first draft passed the resolved spec as npx's command argument, which works for `@abr4xas/driftwatch@0.1.2` and dies with `sh: ...tgz: Permission denied` for a path — exactly the form CI uses to test the action. `npx --yes --package="$SPEC" driftwatch` is uniform across both.

**`pnpm pack` prints either a name or an absolute path depending on the major**, so `$(pwd)/$(pnpm pack | tail -1)` is a path that is right today. The CI job normalises and then asserts the file exists.

Both were caught by running the thing against a temporary repo with real drift in it, not by reading the YAML.

### The test that is worth keeping

There is no unit test for a YAML file, so `test/action.test.ts` asserts the properties a green job would not notice: every declared input is read somewhere (an input nobody reads is a documented lie in the marketplace listing), every output names a step that exists, every `run` step declares its shell, and **no input is interpolated inside a `run:` block**. The last one is the only rule in the file that is not about taste.

### What was corrected on the way

`docs/guide/output.md` and the README said `github/codeql-action/upload-sarif@v3`. It is on **v4**. Written the same day and already stale, which is a fair advertisement for the tool.
