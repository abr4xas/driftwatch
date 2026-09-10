# ADR-0007 — The corpus does not run in CI

- **Status:** accepted
- **Date:** 2026-09-09

## Context

The corpus (`scripts/corpus.ts`, see [test/corpus/README.md](../../test/corpus/README.md)) is the only false positive measurement the project has. It clones 36 public repos pinned to a commit, runs driftwatch over their context files and stores the output as a snapshot. The snapshots are committed, 136 KB of diffable text; the clones are gitignored and weigh ~2.7 GB.

Nothing in `.github/workflows/` runs it. That is deliberate and it is not obvious, so it needs to be on the record: "the precision measurement is not automated" reads like an oversight, and adding `pnpm corpus --check` to CI is going to be proposed again.

## Decision

`pnpm corpus --check` is **not** a CI job. It is a local gate with named triggers, listed in [AGENTS.md](../../AGENTS.md) § Verification.

What does run in CI is `test/corpus-bookkeeping.test.ts`, which verifies the corpus's **bookkeeping** and clones nothing: that every repo in the list has its snapshot and no snapshot is an orphan, that the validation group still satisfies ADR-0006 condition 8, and that the totals `CLASSIFICATION.md` cites match what the snapshots actually say.

## Why

**The verdict requires human judgement.** CI can detect that a snapshot changed. It cannot rule on whether the change is an improvement or a regression, and that ruling is the entire measurement. Most legitimate snapshot changes are *intended*: a discard rule got sharper and four false positives disappeared. A gate that goes red on intended improvements, and needs a person to adjudicate every time, is not a gate — it is noise, and what a team learns from noise is to click through it.

This is why the corpus is a different kind of artefact from the test suite. `pnpm test` asserts an answer we already know. The corpus asks a question nobody has answered yet, and the answer arrives as a diff to read finding by finding.

The cost is the **secondary** argument, and it is recorded second on purpose: 2.7 GB of clones over 34 network fetches from third parties would also make the job slow and flaky for reasons that have nothing to do with driftwatch. But cost arguments invite workarounds — cache the clones, run it nightly, only on `main` — and none of those touch the real objection. Even free and instantaneous, the check would still be asking a machine for a judgement it cannot make.

## What is lost

**A precision regression can land on `main` and stay unnoticed** until someone runs the corpus. That is a real loss, not a hypothetical: the whole point of the snapshots is to catch exactly that.

What limits it is that the regression is only reachable through a small, known surface — the extraction heuristics in `src/extract/` and `src/verify/` — and touching that surface is the first trigger on the list. The corpus is run *before* changing a heuristic and again after, which is when the diff means something. Nobody regresses precision by editing the reporter.

## Consequences

- The triggers live in `AGENTS.md`, not only in `test/corpus/README.md`, because `AGENTS.md` is what an agent reads before working.
- Closing a milestone requires the corpus, which is already in `AGENTS.md` § Verification and in `ROADMAP.md`'s acceptance criteria.
- If the corpus is ever cheap enough to run per push, that still is not a reason to gate on it. The reason to reopen this decision would be a way to tell an intended snapshot change from an unintended one **without** a human reading it, and no such way exists today.
- The bookkeeping test covers the failure mode that *is* mechanical: adding a repo to the list and forgetting its snapshot, or editing the snapshots in bulk and drifting from the classification. Both have happened.
