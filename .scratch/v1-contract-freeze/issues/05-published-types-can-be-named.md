# 05: The published types can be named

**What to build:** every shape reachable through the package's public API becomes importable by
name.

Three are reachable and unnameable today. A consumer reading the result of a run can see each
finding and cannot write a function that takes one. A consumer passing options can see the sink
field and cannot name its type. The shapes are already public — they travel through exported
types — so exporting the names adds no surface at all. It makes the surface usable, and it makes
the frozen surface honest about what was already promised.

This is worth doing before the freeze rather than after, because adding an export later is a
minor and nobody would object; what would be wrong is freezing a contract that a TypeScript
consumer cannot actually write against and calling it stable.

**Blocked by:** 01 (the frozen surface)

**Status:** done 2026-09-20. Three names added to `src/index.ts`, nothing renamed or moved, and
the frozen surface grew by exactly those three. See §"What was built".

- [x] A consumer can import the finding, skipped-source and discard-sink types by name
- [x] Their shapes are unchanged — this ticket renames nothing and moves nothing
- [x] The frozen surface grows by exactly those names
- [x] The built type declarations carry them

## What was built

`Finding`, `SkippedSource` and `DiscardSink` are exported from `src/index.ts`. No shape changed,
nothing moved file, and `dist/index.d.ts` carries all three — the build's own export list now
reads `CheckSeverity, Config, Counts, DiscardSink, ExitCode, Finding, RunOptions, RunResult,
SkippedSource, Source, SourceKind`.

`test/public-api.test.ts` is new and is mostly a **compile-time** test: it writes the three
signatures a consumer would write — a function taking a finding, one taking a skipped source, a
sink assigned to the options field — so that a name silently leaving the entry point fails
`pnpm typecheck` here rather than in somebody else's repository. The two runtime cases cover the
values, which the frozen surface already cross-checks.

### What is still unnameable, deliberately

`Finding.claim` is a `Claim`, and `Claim` is not exported; nor are `Severity`, `Suggestion`,
`Range` or `Discard`. A consumer can **read through** all of them — `finding.claim.range.line`
typechecks — and cannot write a function that takes one.

That is the line the spec drew and this ticket kept. The three exported are the ones the common
jobs need; the rest would be a much larger surface frozen on speculation, and adding an export
later is a minor under the version policy, which is the asymmetry that makes waiting cheap and
guessing expensive.
