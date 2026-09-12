# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML/CSS/JS, no framework of any kind (user constraint, stated explicitly: "sin ningun tipo de framework javascript ni css"). No build step. Lives in `site/` inside the repo. Deploy target is Vercel, performed by the user — this project never publishes or deploys on its own.

## Users

Developers and teams who keep agent context files in their repo — `CLAUDE.md`, `AGENTS.md`, `.claude/skills/*/SKILL.md`, Cursor rules. They are already running linters and CI, and they already use `npx`. The evaluating visitor is a developer deciding in under a minute whether to run one command, arriving from a README badge, an npm page, a GitHub Action listing, or a link from another developer.

## Product Purpose

driftwatch is a zero-configuration CLI that reads a repo's agent context files, extracts the verifiable claims inside them (paths, scripts, links, frontmatter) and reports which ones are already false. `--fix` corrects what it can resolve unambiguously. Success is a developer running `npx @abr4xas/driftwatch` once and then adding it to CI.

## Positioning

`knip` finds dead code. driftwatch finds dead context. Same shape of tool, applied to the one layer of the repo where lying has no mechanical consequence: there is no compiler, no test and no linter for the document you wrote *about* your code. A stale `CLAUDE.md` does not confuse a human who asks — it hands an agent a false premise it executes with confidence, and there is no error signal.

## Operating Context

Run from a terminal in a repo, or as a GitHub Action step on a diff. Deterministic, offline, no network, no API key, no LLM on the main path. Cold start under 80ms, end to end under 500ms on a 5,000-file repo. Output formats: `pretty` (human), `--json` (stable contract, `version: 1`), `--github` (annotations), `--sarif` (Code Scanning).

## Capabilities and Constraints

Five checks ship today, all tier 1:

- `path/missing` — every path a context file claims exists, verified against the repo index. Suggests and is fixable.
- `script/missing` — `npm/pnpm/yarn/bun run S`, `deno task S`, `make S`, against the nearest `package.json`, `Makefile` or `deno.json`. Suggests and is fixable.
- `link/broken` — a Markdown link to an anchor no heading in the target produces. Suggests, never fixable.
- `frontmatter/invalid` — YAML that does not parse, and fields whose type the format fixes. Never fixable.
- `skill/frontmatter` — the structural rules a `SKILL.md` must meet to be invocable. Suggests and is fixable.

Requires Node 24 or newer. Published as `@abr4xas/driftwatch`; the command is `driftwatch`; the action is `abr4xas/driftwatch@v0.3.0`. Current published version is 0.3.0 — the README carries it via badge so no prose goes stale, and the site must do the same rather than hardcode a version in copy.

Not decided / not true yet: `--watch` and `--strict` parse but belong to a later milestone. Tier 2 checks land in M5. There is no service, no account, no web app, no hosted dashboard — and the site must never imply one.

## Brand Commitments

Name is lowercase `driftwatch`. Voice in the existing docs is declarative, unhedged, specific, and argues from measured numbers rather than adjectives; it states what the tool refuses to do as readily as what it does. MIT licensed, open source. Reference the user pinned for simplicity and restraint: pgbot.dev.

## Evidence on Hand

Real and citable:

- 66 public repositories pinned to a commit, nine languages (`next.js`, `langchain`, `zod`, `svelte`, `codex`, `prisma`, `gosec`, `huxtable`, others). 26 findings: 20 true, 6 false.
- **61 of 66 repos produce zero false positives (92.4%)**; over the 32-repo validation group alone, 90.6%. No single repo sees more than 2. Across all 66, `--fix` would apply exactly one edit, and it is correct.
- 17 rounds of measurement, every finding classified by hand, in `test/corpus/CLASSIFICATION.md`. Eleven false-positive classes found and closed, each with a fixture and a test naming the repo and line it came from.
- Real CLI output for every format, in `docs/guide/output.md`. A real clean run on this repo: `✓ 4 files · no drift · 192ms`.
- ADRs 0001–0012 record the decisions, including the ones that cost precision.

Absent, and never to be fabricated: no testimonials, no customer logos, no download/star counts, no pricing, no benchmarks beyond the corpus numbers above.

## Product Principles

1. **One false positive costs more than ten false negatives.** When coverage and precision conflict, precision wins. This orders every technical decision and must order the site's argument too.
2. **It checks whether a claim is true, never whether it is good.** Not a Markdown linter, not a style judge, not a prose rewriter.
3. **Deterministic and offline.** No LLM on the main path, by design and not by omission.
4. **An autofix never guesses.** One candidate above 0.8 confidence, or nothing.
5. **Say the number, not the adjective.** Claims in the product's own voice are measured and sourced.

## Accessibility & Inclusion

No product-specific standard was established. The surface is a developer-facing marketing page and must meet ordinary web accessibility expectations: real semantics, keyboard operability for the terminal demo, `prefers-reduced-motion` honored for the autoplay, and text contrast that holds.
