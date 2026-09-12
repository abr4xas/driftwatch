# `--init` — the flag five specs mentioned and nobody owned

The full specification lives in `docs/spec/`. This file only delimits the scope of this batch and records what was decided before writing it.

`docs/spec/SPEC.md` § 4 lists `--init` — "write a commented `driftwatch.config.ts`" — and `src/cli/help.ts` advertises it. It has been deferred five times, each time for a reason that was correct at the moment:

- **M2** ([spec](../m2-other-tier-1-checks/spec.md)) built the config file it depends on, and left `--init` out because the ROADMAP's M2 line did not ask for it.
- **M3** ([spec](../m3-autofix/spec.md)) writes to the user's files, so it looked like the neighbour. It is not: `--fix` rewrites a range inside a document it has parsed and verified, and `--init` writes a new file from a constant. They share nothing.
- **M4**, both batches, mentioned it to say it was still ownerless.

Nothing blocks it and nothing has for a while. This batch exists because "ownerless" is not a status, it is an absence of one.

## The decision that shapes the whole ticket

**The generated file may only comment keys that do something.** Of the five keys in SPEC § 7, `sources` and `checks` reach `src/run.ts`; `ignore`, `knownPaths` and `staleThreshold` are validated, carried and then read by nobody. A template that presents all five as working config would be drift — written by a tool whose entire subject is documentation that claims more than the code delivers.

So the inert keys appear commented out, each with the milestone that will make it real. That is the honest shape, and it is also the shape that fails loudly later: when `knownPaths` starts working, the template is one of the places a reader will notice it did not say so.

## Scope

One flag, one template, one refusal.

- `driftwatch --init` writes `driftwatch.config.ts` at the repo root.
- An existing config is a **user error**, exit 2, nothing written. Every other path in this tool that touches a file either verifies first or asks; silently overwriting a config would be the only place it destroys work.
- The flag leaves `UNIMPLEMENTED_BOOLEANS` in `src/cli/main.ts`, which is what makes `test/cli.test.ts` fail until the test is updated. That list is a to-do list the suite watches, by design.

## Out of scope

- `--watch` and `--strict`, the other two entries in that list. `--strict` is still waiting for warnings, which are tier 2, which is M5.
- Any interactive prompting. A flag that writes one file does not need a wizard, and a prompt would make it unusable from a non-TTY.
- `--init --json` or any other format. The output is a file; the confirmation on stdout is one line.

---

## Closed 2026-09-11

One ticket, one flag, 17 tests. The batch's own decision held: `sources` and `checks` are written live, the other three commented out with the reason.

What it did not survive contact with is the import. `defineConfig` is a value, and a repo that ran the tool through `npx` has no `@abr4xas/driftwatch` in `node_modules`, so the generated config failed to load the first time the test suite fed it back to the loader that documents it. The template imports the type instead. The full account is in ticket `01`.

**Still unimplemented, and still saying so:** `--watch` and `--strict`. `--strict` is waiting on warnings, which are tier 2, which is M5.

**Reopened 2026-09-12 by ticket `02`:** the flag writes a `.ts` file into any repo, and driftwatch audits Go, Rust and Python repos as readily as Node ones. The format is the question, and the specification is what has to move, since `SPEC.md` § 4 names the extension.
