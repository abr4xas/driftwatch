# ADR-0001 — The specification lives inside the repo

- **Status:** accepted
- **Date:** 2026-09-08

## Context

The project started as a directory holding only specification (`BRIEF.md`, `SPEC.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `AGENTS.md`) and no code. The original `AGENTS.md` explicitly instructed: *"Create the project in a new repo, not inside this directory. This directory stays as the reference specification."*

## Decision

That same directory became the project's repo. The specification moved to `docs/spec/` without editing its content; `AGENTS.md` stayed at the root and was rewritten to point at the new paths.

## Why, against the original instruction

The instruction aimed to keep the spec from degrading into a comment on the code. That risk is better mitigated by an explicit rule (`docs/spec/` is primary source; on a discrepancy, decide which one is wrong before touching anything) than by physical separation, and in exchange we gain something that matters more for *this* project in particular: **driftwatch can be run against its own repo from day one**, with a real `AGENTS.md`, nested docs and cross-references. The repo is its own first test subject, which is exactly what `AGENTS.md` § "Verification" asks for.

## Consequences

- The spec documents are now traceable in the same history as the code: a behaviour change and its spec change can travel in one commit.
- The spec, living inside the audited repo, can produce driftwatch findings. That is desirable, and it is signal rather than noise.
- A single repo to publish when the time comes (an outward-facing decision, pending consultation).
