# Instructions for the agent working on driftwatch

The reference specification lives in `docs/spec/`. The code lives in `src/`.

## Before writing code

Read the four documents in this order: `docs/spec/BRIEF.md` (why), `docs/spec/SPEC.md` (what), `docs/spec/ARCHITECTURE.md` (how), `docs/spec/ROADMAP.md` (in what order). The rest of this file assumes you have read them.

`docs/spec/` is primary source. If the code and the spec disagree, decide which one is wrong before touching anything; do not adjust the document reflexively to make it fit.

## The rule that orders every decision

**One false positive costs more than ten false negatives.**

When you are torn between reporting something doubtful and letting it through, let it through. A tool that reports 6 real problems gets used every day; one that reports 20 with 8 doubtful ones gets uninstalled on first use and never comes back.

This applies especially to the path extractor (`docs/spec/ARCHITECTURE.md` § "Path extraction"), which is where the risk concentrates.

## Order of work

Follow the milestones in `docs/spec/ROADMAP.md` in order. **M1 is the gate:** if the precision criterion in `docs/adr/0006-the-m1-precision-criterion.md` is not met, do not move on to M2 — go back to the heuristics. A project with a single excellent check beats one with eight noisy ones.

Two things from that criterion that shape the daily work:

- **Zero autofixable false positives**, with no rate modulating it. A doubtful finding someone reads and dismisses is an annoyance; a `--fix` that rewrites the document to point at the wrong file makes the next agent act on a lie with confidence.
- **Precision is measured out of sample.** Tuning heuristics while looking at a corpus and then measuring against that same corpus does not measure precision, it measures how much you tuned. `scripts/corpus.ts` separates calibration from validation; if you use a validation repo's findings to change a rule, that repo moves to calibration and another one has to be added.

Work tickets live in `.scratch/<feature>/issues/`. See `docs/agents/issue-tracker.md`.

## Code conventions

- Strict TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`). No `any`, no `as` except at parsing boundaries with adjacent validation.
- Pure ESM. Builtin imports with the `node:` prefix.
- No classes unless there is real state to encapsulate. `RepoIndex` is a struct with functions, not a class.
- User errors (invalid config, nonexistent path) are handled with a clear message and exit 2. Never a raw stack trace.
- Comments only where the *why* is not obvious. The path extractor heuristics do need them: every discard rule carries a line explaining which false positive it prevents.
- No emojis in the code or in the CLI output.
- Code, comments and documentation are written in English. That includes the CLI output: the tool ships to the ecosystem.

## Dependencies

The cold-start budget (< 80 ms) is part of the product, not a nice-to-have. Before adding a dependency to the main path, check that you cannot solve it with `node:` builtins in under 40 lines.

The config file is the worked example. It was specified expecting `jiti`, and it needs no transpiler at all: Node strips the types itself, unflagged since 22.18 and 23.6, and the floor is 24 (ADR-0002). A `.ts` config is loaded with a plain `await import()`. The dependency was avoided, not deferred. What that costs is that a config using syntax type stripping cannot erase — an `enum`, a `namespace`, a parameter property — fails with a clear error; nothing in the specification needs any of it.

## Verification

Do not call a milestone closed without running:

```
pnpm typecheck && pnpm test && pnpm build && node ./dist/cli.js --help
```

Also, **run the tool against itself and against real repos**. This repo has its own `AGENTS.md` and `docs/`, so it is the first test subject. A green fixture proves nothing about false positives; the corpus in `scripts/corpus.ts` does.

### The corpus is a local gate

It clones ~2.7 GB and **does not run in CI** — [ADR-0007](docs/adr/0007-the-corpus-does-not-run-in-ci.md) explains why: CI can detect that a snapshot changed, but the verdict on whether the change is an improvement or a regression requires reading the diff. What runs in CI is `test/corpus-bookkeeping.test.ts`, which checks the corpus's bookkeeping and clones nothing.

So it is on you to run it. Read [test/corpus/README.md](test/corpus/README.md) first, then run `pnpm corpus --check` at these four moments:

- **Before and after touching a heuristic** in `src/extract/` or `src/verify/`. Before, so you have a baseline that is green; after, so the diff means "my change did this" and nothing else. This is the one that matters — precision does not regress by editing the reporter.
- **Before closing a milestone**, together with the command above.
- **Before publishing**, on the whole corpus, with no `--only`.
- **When adding a repo** to the corpus or moving one between calibration and validation.

`pnpm corpus --only <pattern>` runs a subset without re-cloning the rest, which is what you want while iterating on a rule. The full run is for the last three triggers.

If a snapshot changes, review the diff **by hand, finding by finding**, before accepting it. That diff is the only real precision-regression signal the project has. Delete `test/corpus/repos/` when you are done if you will not need it again.

Report results exactly as they come out. If a check is half-done or the corpus shows noise, say so explicitly instead of closing it as done.

## Decisions you can make on your own

File and function names, the internal structure of modules, choosing between `tinyglobby` and `fast-glob`, the exact wording of error messages, how to organize the fixtures.

## Decisions that require asking the user

- Changing the project name or the npm package.
- Adding a heavy dependency to the main path.
- Putting an LLM anywhere (it is out of scope by design, see `docs/spec/ROADMAP.md`).
- Publishing to npm, creating the remote repo, or any outward-facing action.
- Changing the JSON output contract after the first release.

## What NOT to build

It is in `docs/spec/ROADMAP.md` § "Out of scope". I repeat it here because it is the main temptation: **do not put an LLM in to verify prose claims.** It breaks determinism, the latency budget and the entire value proposition. The project wins by being fast, offline and reliable.

## Agent skills

### Issue tracker

Issues and specs live as local markdown under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical labels, unrenamed, recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: a `CONTEXT.md` at the root (created lazily) and ADRs in `docs/adr/`. See `docs/agents/domain.md`.
