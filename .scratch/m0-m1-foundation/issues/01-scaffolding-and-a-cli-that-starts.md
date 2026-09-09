# 01: Package scaffolding and a CLI that starts

**What to build:** someone clones the repo, runs the build, and the binary responds. `--help` prints the flag list from `docs/spec/SPEC.md` § 4, `--version` prints the `package.json` version, and an invocation with an unknown flag fails with a readable message and exits 2. It does not audit anything yet.

**Blocked by:** None (can start immediately)

**Status:** done, with two reservations noted below

- [x] `pnpm typecheck && pnpm test && pnpm build && node ./dist/cli.js --help` runs green end to end
- [x] TypeScript with `strict: true` and `noUncheckedIndexedAccess: true`; pure ESM; no `any` or `as`
- [x] The `package.json` `bin` points at the compiled CLI and `engines.node` is `>=24` (ADR-0002)
- [x] Argument parsing uses `node:util parseArgs`, with no third-party dependency
- [x] The three exit codes from `docs/spec/SPEC.md` § 4 are wired and covered by tests: 0 with no errors, 1 with at least one error, 2 on tool failure
- [x] An invalid flag or a nonexistent positional path produces a clear message and exit 2, never a raw stack trace
- [ ] `--version` loads nothing beyond what is needed to print it

## Reservations at close

Two criteria are only partly met. They are noted here instead of being called done.

1. **Exit code 1 is wired but still unreachable.** `main()` calls `exitCodeFor`, but passes it an empty count by construction, because no check produces findings yet. The function is covered by unit tests in all five cases; what is missing is a real path that makes it return 1. Ticket 05 closes that, being the first to produce a finding.

2. **`--version` still loads the CLI body.** `cli.ts` imports `main.ts`, which drags in `node:fs`, `node:path`, the parser and the help text. Measured cold start is ~30 ms against an 80 ms budget, so it was not optimized: cutting the import would mean duplicating flag dispatch to win milliseconds we have to spare. If the budget tightens as dependencies land, this is the first place to look.

Also, one `as` remains in the code: `(FORMATS as readonly string[]).includes(value)`, inside the `isFormat` type predicate. It falls under the documented exception in `AGENTS.md` ("except at parsing boundaries with adjacent validation"): the `as` *is* the validation.

## Comments

The two-axis review was run over the diff against `main`. Applied: `main()` no longer touches `process` (it receives `cwd`), the scope creep of `defineConfig`/`Config`/`UserConfig`/`--dry-run` and the data model with no consumers was removed, `readVersion` throws instead of returning `'0.0.0'`, the policy for unimplemented flags was unified, `messageOf`/`codeOf` were extracted, the to-do list was typed to the real boolean keys, and the `ARCHITECTURE.md` directory tree was updated, which the review caught as out of date relative to the code in the same commit.
