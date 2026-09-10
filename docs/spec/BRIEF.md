# driftwatch — Brief

## The problem in one sentence

Agent context files (`CLAUDE.md`, `AGENTS.md`, skills, Cursor rules) age badly: they describe paths, commands and conventions the repo has already changed, and nobody finds out until an agent acts on false information.

## Why it actually hurts

An out-of-date `README` confuses a person, who notices and asks. An out-of-date `CLAUDE.md` hands the agent a false premise that it **executes with confidence**: it runs a script that no longer exists, edits a file that moved, follows an abandoned convention. The cost is not confusion, it is incorrect work with no error signal.

And unlike code, these files have no compiler, no tests, no linter. They are the one part of the repo where lying has no mechanical consequence.

## What driftwatch is

A zero-configuration CLI that reads a repo's agent context files, extracts the **verifiable claims** they contain (paths, commands, dependencies, symbols, links) and checks which ones are already false.

```
$ npx @abr4xas/driftwatch

CLAUDE.md
  ✗ 12  src/lib/auth.ts                  path does not exist  → src/auth/index.ts?
  ✗ 34  pnpm run test:e2e                script not in package.json
  ⚠ 51  "we use Prisma as the ORM"       not in dependencies

.claude/skills/deploy/SKILL.md
  ✗  3  name: deployment                 does not match the directory (deploy)
  ✗ 18  ./scripts/release.sh             path does not exist

2 files · 5 problems (4 errors, 1 warning) · 340ms
```

With `--fix` it corrects what it can resolve unambiguously. With `--json` it feeds CI.

## Thesis: the shape of the tool

This is a tool, not a platform. Skills and agent context files are already a form of software: they are versioned, reviewed, and they break. What they still lack is tooling.

`knip` finds dead code. **driftwatch finds dead context.** It is the same shape of tool applied to a new layer.

Signals that it has the right shape:
- A single verb, runnable daily in a real work loop.
- `npx @abr4xas/driftwatch` with no configuration, visible result in seconds.
- A demo that lands in a 10-second GIF.
- Hard to generate from a prompt: the value is in the extraction heuristics and in the false positive rate, not in the scaffolding.

## The metric that defines success

**False positives near zero.** A linting tool that shouts too much gets uninstalled on first use. Reporting 6 real problems beats reporting 20 with 8 doubtful ones.

This is the main design constraint and it orders every technical decision in the project. When coverage and precision conflict, precision wins.

## Non-goals

- It is not a Markdown linter (it does not check style, formatting or spelling).
- It does not judge whether the content is *good*, only whether it is *true*.
- It does not use an LLM on the main path. It has to run offline, deterministically, in milliseconds.
- It is not a service, not a web app, and requires no account.
- It does not rewrite prose. `--fix` only touches mechanically verifiable things.

## Specification documents

| File | What for |
|---|---|
| `BRIEF.md` | This file: why it exists and what counts as success |
| `SPEC.md` | Observable behaviour: checks, CLI, outputs, config |
| `ARCHITECTURE.md` | How it is built on the inside |
| `ROADMAP.md` | Milestones with acceptance criteria |

The handoff for the agent building the project lives in `AGENTS.md`, at the repo root.
