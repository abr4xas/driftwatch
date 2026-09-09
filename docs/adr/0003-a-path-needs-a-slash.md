# ADR-0003 — A path needs a slash

- **Status:** accepted
- **Date:** 2026-09-08

## Context

The two specification documents contradict each other on whether a bare file name counts as a path claim.

`docs/spec/SPEC.md` § 3 (`path/missing`) says something is a path if **any** of three conditions holds, and all three require a slash or ending in one:

> - It contains `/` and a final segment with a known extension.
> - It starts with `./`, `../` or `/` and contains `/`.
> - It ends in `/` (a directory).

`docs/spec/ARCHITECTURE.md` § "Path extraction", rule 3, says the opposite in a parenthetical:

> Discard if it is a single word with no `/` and no known extension (`foo` is not a path, `foo.ts` is, `src/foo` is).

Under SPEC, `` `foo.ts` `` is not a path. Under ARCHITECTURE, it is.

## Decision

SPEC wins: **a path claim needs a slash, or has to end in one.** A bare file name in inline code is not verified.

## Why

It is the reading that produces the fewest false positives, and the rule that orders every decision in the project says that when in doubt, let it through.

A bare `` `foo.ts` `` in prose is almost never a claim about a concrete path in the repo. It is usually the name of a file whose location the author is not pinning down ("every module has its `index.ts`", "rename it to `config.ts`"), or an example. Verifying it against the repo root would report a problem where there is none, and that class of noise shows up in any sufficiently long context document.

The cost is a real and bounded false negative: a `` `tsconfig.json` `` that does not exist at the root is not reported. That is exactly the trade the project declared it prefers.

## Consequences

- Path detection is anchored to the slash, so the extractor never sees bare names and the whole class of noise disappears before it exists.
- The parenthetical in rule 3 of `ARCHITECTURE.md` was corrected to point here.
- If the ticket 10 corpus shows that real problems are being lost to this rule, the answer is not to loosen it in general: it is to add a narrow condition with its own case in the traps fixture.
