# 03: Check selection — `--only`, `--skip`, `--no-tier2`

**What to build:** the three flags that decide which checks run, plus the `'off'` half of the config's `checks` key, which asks the same question through a different door.

**Blocked by:** nothing

**Status:** done

`docs/spec/SPEC.md` § 5 lists the flags and § 7 the config key. All three flags parse today and throw `notYetImplemented` in `src/cli/main.ts`; `checks` is validated and carried, and `test/config.test.ts` asserts it does nothing.

This is infrastructure, not a check: nothing it does can produce a finding. What it can do is make the tool report `no drift` while verifying nothing, and that is the risk the ticket is written around.

- [x] `selectChecks` in `src/verify/selection.ts`, taking the registry and the selection and returning the enabled checks. The pipeline asks it once; no check learns it was filtered.
- [x] `--only` and `--skip` accept a **namespace prefix**: `path` matches `path/missing`, and matching is `id === selector || id.startsWith(selector + '/')`. Not an arbitrary string prefix — `--only pat` matches nothing, and matching nothing is the next item.
- [x] A selector matching no registered check is a **user error** naming the known ids, not a silent no-op. Same rule `matchConfiguredSources` already applies to a glob in `sources` that matches nothing, for the same reason: a typo that quietly narrows an audit is worse than a red run.
- [x] `--only` and `--skip` together do not contradict: `--skip` subtracts from what `--only` selected. No error.
- [x] `--no-tier2` drops every tier 2 check **even when `--only` named one**. It reads as an unconditional switch in the help text, and a blanket "off" losing to an incidental name in a list is the surprising direction.
- [x] `checks: { 'x/y': 'off' }` in the config removes a check too, and a flag beats the config: an id named in `--only` runs even if the config turned it off. The config is the repo's standing preference, the flag is this invocation.
- [x] The `'error'` and `'warning'` values of that key are **out of scope**: they remap severity, which moves the exit code and every snapshot in the corpus. Separate ticket. Only `'off'` lands here.
- [x] **An empty selection is a user error.** If the flags and the config together leave no check enabled, exit 2 saying so. Printing `no drift` after running nothing is a lie the tool would tell confidently, and it is the exact failure this project is built to detect in other people's documents.
- [x] `RunResult.checks` becomes the checks that **ran**, not the ones registered. It is the only thing distinguishing a clean audit from a vacuous one, so it has to be honest.
- [x] Remove `--only`, `--skip` and `--no-tier2` from `UNIMPLEMENTED_BOOLEANS` and its two siblings in `assertNotYetImplemented`, and drop them from the `it.each` in `test/cli.test.ts` that demands exit 2.
- [x] `RunOptions.paths` becomes optional, defaulting to `[]`. Ticket 01 noted it and said it belongs to whichever ticket touches `RunOptions` next. This is that ticket.
- [x] Tests: prefix matching, exact matching, the unknown selector, `--only` plus `--skip`, `--no-tier2` beating `--only`, the flag beating the config, and the empty selection. The last one matters most.

## Why this is not just plumbing

Every ticket after this one adds a check, and every check is a new way to be wrong on a repo that used to be silent (`spec.md` § "The obligation nobody should skip"). `--skip` is what lets a user keep the other seven while a bad one is fixed, and it is the reason a single noisy check does not cost the tool the whole install.

Ticket `05` (`link/broken`) needs `--only` specifically, not generically: this repo's own `docs/` can only be audited by a second invocation with its own config, and that invocation has to run `link/broken` and nothing else. ADR-0008 is why. So `03` blocks `05` for a concrete reason and not an architectural one.

## Out of scope

- Severity remapping from the config (`'error'`, `'warning'`).
- The `ignore` and `knownPaths` config keys.
- Inline ignores — that is ticket `04`, and it selects per line, not per run.

## Corpus

No corpus run is owed by this ticket **if the default selection is bit-identical to the registry**, which it is when no flag is passed and no config sets `checks`: no third-party repo in the corpus can carry a driftwatch config. The evidence to record is that the default path is unchanged, plus a spot check, exactly as ticket 01 did. If a snapshot moves, something in this ticket is wrong.

## Comments

Closed 2026-09-10. 16 new tests, 279 in the suite. Snapshots unchanged.

### The empty selection turned out to be the whole ticket

Everything else is filtering, and filtering is boring. The one decision worth the argument is what happens when the filters agree on nothing, and the answer is exit 2 rather than a clean run — because `✓ 4 files · no drift` printed after verifying nothing is precisely the confident lie this tool exists to find in other people's documents. It would be unfair to ship it in our own output.

It has a cost today: with a single check registered, `--skip path/missing` cannot run at all. That is honest, and it stops being visible the moment ticket `05` lands a second check.

### `--no-tier2` beating `--only` is a refusal, not a silent narrowing

`--only stale/churn --no-tier2` selects nothing, so it exits 2 with the empty-selection message rather than quietly auditing zero checks. That is the behaviour the two rules compose into, and it is the right one: the user is told the two flags cancelled out instead of getting a green run. No special case was written for it.

### The config's `checks` key now does half of something

`'off'` is acted on; `'error'` and `'warning'` are still carried and ignored. `test/config.test.ts`'s "keys with no implementation yet" case lost its `checks` line and gained a `staleThreshold` assertion, so it still guards the keys that really are inert.

The precedence rule — an id named in `--only` runs even if the config turned it off — is one condition in the filter (`namedByFlag`), and it is worth keeping straight: `--skip` and the config both remove, but only `--only` is an explicit statement about *this* invocation.

### A lint error was already on master

`test/discover.test.ts:115` had `unicorn(consistent-function-scoping)` as an **error**, from last session's symlink work: `pnpm test` and `pnpm typecheck` were run at the end of that round, `pnpm lint` was not. CI would have caught it on push. Fixed here by moving `repoWithSymlink` out of the `describe`. The count of warnings is unchanged at 9, and they remain ticket `02`'s problem.

### Corpus

Not run in full, on the argument the ticket records and the same spot check ticket 01 used: `railwayapp/cli` → `ok (0)`, `github/spec-kit` → `ok (1)`, both snapshots unchanged, clones deleted. With no flags and no config, `selectChecks` receives `{ tier2: true }` and returns the registry unfiltered, and no third-party repo can carry a driftwatch config because driftwatch is not published.

### Noted, not fixed

`RunOptions.paths` is now optional, as ticket 01 asked. The `audit()` helpers in the tests that only existed to pass `paths: []` were left alone: deleting them is churn in files this ticket has no other reason to touch.
