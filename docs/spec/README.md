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

The handoff for the agent doing the building lives at the repo root: [AGENTS.md](../../AGENTS.md).
