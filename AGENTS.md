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

The cold-start budget (< 80 ms) is part of the product, not a nice-to-have. Before adding a dependency to the main path, check that you cannot solve it with `node:` builtins in under 40 lines. `jiti` and anything related to `.ts` config is loaded lazily, only if a config file exists.

## Verification

Do not call a milestone closed without running:

```
pnpm typecheck && pnpm test && pnpm build && node ./dist/cli.js --help
```

Also, **run the tool against itself and against real repos**. This repo has its own `AGENTS.md` and `docs/`, so it is the first test subject. A green fixture proves nothing about false positives; the corpus in `scripts/corpus.ts` does. If a corpus snapshot changes, review the diff by hand before accepting it — that diff is the only real precision-regression signal.

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
