# ADR-0002 — The Node floor is 24

- **Status:** accepted
- **Date:** 2026-09-08

## Context

The specification contradicted itself. `docs/spec/ARCHITECTURE.md` § Stack set the minimum runtime at **Node 24** ("LTS with stable `node:` builtins"), while `docs/spec/ROADMAP.md` § M0 asked for CI on **Node 20 and 22**. The two criteria cannot both be met: a CI matrix on 20/22 forces writing code that runs there.

## Decision

ARCHITECTURE wins. `engines.node` is `>=24`, and the CI matrix runs on **24** (active LTS) and **25** (current).

The M0 line in `ROADMAP.md` was corrected to point at this decision.

## Why

Node 20 reached end of life in April 2026 and Node 22 is in maintenance. Holding that floor wins no real users: it wins polyfills and a `tsconfig` with a lower target, and it puts the < 80 ms cold-start budget at risk, which is part of the product and not a nice-to-have.

## Consequences

- Anyone running `npx driftwatch` on Node 22 or lower gets npm's `engines` error rather than a crash. It is a clear error, which is what `AGENTS.md` asks for user errors.
- `node:` builtins can be used without version guards.
- If concrete demand for Node 22 shows up, lowering the floor is a reversible and cheap decision; raising it later would not be. This ADR reopens on that signal, not before.
