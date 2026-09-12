# driftwatch — specification

Find the parts of your `CLAUDE.md`, `AGENTS.md` and skills that are no longer true.

> `knip` finds dead code. driftwatch finds **dead context**.

This directory is the project's **reference specification**. It is primary source: when the code and these documents disagree, the first step is deciding which one is wrong, not adjusting the document reflexively.

## Reading order

| Document | Contents |
|---|---|
| [BRIEF.md](./BRIEF.md) | The problem, why it hurts, what counts as success, non-goals |
| [SPEC.md](./SPEC.md) | Checks, CLI, output formats, config, autofix, perf budget |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Pipeline, data model, stack, testing strategy |
| [ROADMAP.md](./ROADMAP.md) | Milestones M0–M6 with acceptance criteria |

How to *use* the tool is a different audience and lives in [docs/guide/](../guide/README.md). This directory says why it is built the way it is; that one says what the flags do.

Two decision records sit outside this directory and are read alongside it: the ADRs in [docs/adr/](../adr/), and [test/corpus/README.md](../../test/corpus/README.md) — how the real-repo corpus is run, which is the project's only false positive measurement.

The handoff for the agent doing the building lives at the repo root: [AGENTS.md](../../AGENTS.md).
