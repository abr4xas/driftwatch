# 01: `--init`, and a template that does not overpromise

**What to build:** `driftwatch --init` writes a commented `driftwatch.config.ts` at the repo root, refuses when one already exists, and comments only the keys that currently do something.

**Blocked by:** nothing. The config loader it documents landed in M2 ticket `01`.

**Status:** done

## What has to change

- [ ] A module that returns the template as a string. A constant, not a builder: the file has no variable parts, and the moment it has one it is a generator with its own test surface.
- [ ] `sources` and `checks` are live in `src/run.ts`, so they appear as working config with a comment each.
- [ ] `ignore`, `knownPaths` and `staleThreshold` are validated by `src/core/config.ts` and read by nobody, so they appear **commented out**, each one naming what makes it real. A template that presents them as working is exactly the drift this tool reports.
- [ ] The template imports `defineConfig` from the published package name, not from a relative path. It is written into somebody else's repo.
- [ ] The written file has to be **valid input to the loader it documents**: uncommenting nothing, it loads and validates clean.
- [ ] Refuse with exit 2 when any config the loader would find already exists — not just `driftwatch.config.ts`. Finding `driftwatch.config.json` and writing a `.ts` next to it creates the two-configs-in-one-repo case `src/core/config.ts` deliberately refuses to merge.
- [ ] The message on refusal names the file it found.
- [ ] One line on stdout on success, naming the path written. No emoji (`AGENTS.md` § Code conventions).
- [ ] Remove `['init', '--init']` from `UNIMPLEMENTED_BOOLEANS` in `src/cli/main.ts` and update the `it.each` in `test/cli.test.ts:93` that demands exit 2.
- [ ] `--init` runs **before** the audit and exits. It is not a flag that modifies a run, it is a different command wearing a flag's clothes.

## What to decide

- [ ] Whether `--init` respects `--config <path>` as a destination. **It does not.** `--config` means "read this one", and overloading it into "write here" gives one flag two directions. If a destination is ever wanted it gets its own argument.
- [ ] Whether it honours `--no-config`. It does not: "ignore any config found" is about the run, and here it would mean "overwrite whatever is there", which is the one thing the refusal exists to prevent.
- [ ] What the flag does with positional paths. They are ignored; the config goes to the repo root, which is the only place the loader looks.

## Tests

- [ ] Writes the file in an empty fixture; the content parses as a config and validates.
- [ ] Refuses with exit 2 against each of the four shapes the loader finds: `.ts`, `.js`, `.json`, and the `driftwatch` key in `package.json`. The last one is the interesting case — there is no config *file*, and it still counts.
- [ ] Nothing is written when it refuses.
- [ ] A test that the template mentions every key `KNOWN_KEYS` declares. A key added to the loader and forgotten in the template is the failure mode this catches, and it is the same class of lie as an Action input nobody reads.

## Docs

- [ ] `README.md:81` and `docs/guide/usage.md:29` both say three flags parse and refuse. It is two now.
- [ ] `docs/guide/config.md` if it exists — the template is the natural thing to point at from there.

## Comments

Closed 2026-09-11. `src/cli/init.ts`, 17 tests in `test/init.test.ts`, 542 in the suite (526 before).

**Verification:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `node ./dist/cli.js --help`, the tool silent over its own repo. The corpus was **not** run, and by its own triggers it did not have to be: nothing in `src/extract/` or `src/verify/` was touched, no milestone closed, nothing published. The one change outside the CLI is `findConfig` in `src/core/config.ts`, which is the lookup `loadConfig` already performed, lifted out so `--init` can ask the same question without loading the answer.

### What running it found that reading it would not

**A config calling `defineConfig` does not load.** The ticket asked for the import from the published package name, and that is what was written — and the test that loads the generated file with the real loader failed immediately: `driftwatch.config.ts could not be loaded`. The advertised way to run this tool is `npx`, which installs nothing in the target repo, so `@abr4xas/driftwatch` is not resolvable from the config it just wrote. The template imports `type { Config }` instead. A type import is erased by the same type stripping that loads the file, so it works installed or not, and an editor that has the package still gets completion.

That test is the reason the bug lasted four minutes instead of reaching a user. Asserting the template's *text* would have passed.

**The doc comment on `src/core/config.ts` was itself drift.** It said only `sources` has an effect; `checks` reaches `selectChecks` and has since M2's ticket `03`. Corrected, because the split between live and inert keys is now a thing the generated file asserts in front of the user.

### Decisions taken as the ticket proposed them

`--config` is not a destination, `--no-config` is not an override, positional paths are ignored, and the file goes to `findRepoRoot(cwd)` — so running it from `docs/` writes at the root, which has a test because it is the kind of thing that is obvious until it is wrong.

### The test worth keeping

`it.each(KNOWN_KEYS)` asserts the template mentions every key the loader accepts, and a second test asserts the live ones are uncommented and the inert ones are not. Together they fail on the day `knownPaths` starts working and nobody updates the template — which is the whole argument of the ticket, enforced instead of written down.

One more ties the template to `src/index.ts`: it imports a type from the public API, and a rename there would leave every generated config importing something that does not exist, invisibly, because the import is erased before anything runs.
