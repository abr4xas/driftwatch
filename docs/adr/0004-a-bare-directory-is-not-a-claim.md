# ADR-0004 — A single-segment directory is not a verifiable claim

- **Status:** accepted
- **Date:** 2026-09-09

## Context

`SPEC.md` § 3 says a text is a path if it "ends in `/` (a directory)". Across the corpus of 13 real repos, that rule alone produced one of the largest classes of false positive: single-segment references such as `` `feat/` ``, `` `fix/` ``, `` `partners/` ``, `` `security/` ``, `` `exports/` ``, `` `app/` ``, `` `src/` ``, `` `ppr/` ``.

Concrete cases from the corpus:

- `sst/opencode` `AGENTS.md:9` says `` `feat/` `` and `` `fix/` ``. Those are **branch name prefixes**, not directories.
- `BerriAI/litellm` `tests/e2e/CLAUDE.md` lists `` `embeddings/` ``, `` `realtime/` ``, `` `ratelimit/` ``, `` `budgets/` ``, `` `spend_tracking/` ``: those are **test categories**, written as a list of topics.
- `vercel/next.js` says `` `ppr/` `` and `` `ppr-full/` ``, which are **mode names**, not folders.
- `langchain-ai/langchain` says `` `partners/` `` and `` `standard-tests/` ``, referring to packages whose real location is deeper.

## Decision

**A single-segment directory reference (`` `foo/` ``) is not verified.** At least one internal slash is required: `` `src/lib/` `` is a claim, `` `lib/` `` is not.

## Why

It is the natural extension of [ADR-0003](./0003-a-path-needs-a-slash.md). There we decided that a bare file name (`` `foo.ts` ``) does not pin a location and therefore claims nothing verifiable. A bare directory name has exactly the same weakness: the trailing slash says "this is a directory", not "this directory is here".

The corpus evidence is that people use `name/` as notation for *categories, branches, modes and namespaces*, not only for paths. Verifying that against the repo root guarantees noise in any sufficiently long document, and noise is what gets the tool uninstalled.

## Consequences

- We lose detection of a top-level directory that genuinely disappeared. It is a real and bounded false negative, of the kind the project declared it prefers.
- The rule is applied **after** the discard rules and **before** querying the index, and it has its case in the `false-positive-traps` fixture.
- A directory with an internal slash (`` `src/lib/router/` ``) is still verified in full.
