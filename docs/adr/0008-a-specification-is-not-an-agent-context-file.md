# ADR-0008 — A specification is not an agent context file

- **Status:** accepted
- **Date:** 2026-09-10

## Context

The config's `sources` key (`docs/spec/SPEC.md` § 7) landed so that this repo could audit its own `docs/`. The motivation was concrete: `AGENTS.md` opens by ordering the agent to read the four documents in `docs/spec/`, which makes them agent context in fact, and the relative links inside them were verified once by hand with a throwaway script and by nothing since.

So the obvious config was written and run:

```ts
export default defineConfig({ sources: ['docs/**/*.md', 'README.md'] })
```

**43 findings. Every one of them a false positive.** Zero true positives, and no amount of tuning would change that, because the cause is structural.

| Source | Findings | Why they are not drift |
|---|---|---|
| `docs/adr/0005-…` | 18 | quotes paths from `next.js`, `react-router`, `opencode`, `litellm`, `astro` as the evidence for the decision |
| `docs/adr/0004-…` | 15 | its subject *is* a list of false positives from other repos: `feat/`, `ppr/`, `partners/`, `spend_tracking/` |
| `docs/spec/SPEC.md` | 6 | illustrative examples (`src/lib/auth.ts`, `src/foo.ts`) and paths in *the reader's* repo (`.github/copilot-instructions.md`) |
| `README.md` | 2 | one quotes ADR-0004's example, one describes where a reader's copilot file lives |
| `docs/spec/ARCHITECTURE.md` | 1 | `src/foo.ts`, an example of the claim syntax |
| `docs/spec/ROADMAP.md` | 1 | `fix/apply.ts`, a file M3 will create |

## Decision

**`docs/spec/`, `docs/adr/` and `README.md` are not driftwatch sources**, and the shipped `driftwatch.config.ts` declares only:

```ts
sources: ['docs/agents/**/*.md']
```

Those three files are instructions the agent is pointed at from `AGENTS.md` § "Agent skills". They are agent context in the same sense `AGENTS.md` is, they produce **zero** findings, and the coverage is not vacuous: renaming `docs/adr/` to something else makes `docs/agents/domain.md` go red, which was verified by doing it.

## Why

A specification and a decision record have a job that an agent context file does not: **they argue**. Arguing means quoting evidence, and the evidence here is paths — in other people's repositories, in hypothetical repositories, in the reader's repository, and in this repository's future.

An agent context file makes assertions about the repo it sits in. That is the premise the whole tool rests on, and `path/missing` is only as precise as that premise is true. Point it at a document that quotes rather than asserts and the check is not being noisy, it is being asked the wrong question.

This is not a gap to close later. `docs/adr/0004-a-bare-directory-is-not-a-claim.md` exists **in order to** list paths that do not exist; a version of driftwatch that stayed quiet on it would have to stay quiet on real drift too.

## What this says about `--fix`

Of the 43, **zero were `fixable`**, and two carried a suggestion that was correctly withheld from autofix: `packages/llm/AGENTS.md → AGENTS.md?` and `ui/.../chat/AGENTS.md → AGENTS.md?`.

Both would have been *wrong* fixes — rewriting an ADR's quoted evidence to point at this repo's own file, destroying the argument. The common-prefix scoring introduced while closing ticket 09 is what held them back. This is the strongest evidence so far that [ADR-0006](./0006-the-m1-precision-criterion.md) condition 2 — zero false positives among `fixable`, with no rate modulating it — is the right shape of rule.

## What is lost

The links between the specification documents are still verified by nothing automatic. That was the original motivation and it is not solved here.

It is the wrong check, not the wrong idea. What those documents need is `link/broken`: whether `[ADR-0005](./0005-….md)` resolves and whether its anchor exists. A link target is an assertion even in a document that only quotes, because the document is making it. Prose paths are not.

The route is a **second invocation** with its own config, once `link/broken` lands (`.scratch/m2-other-tier-1-checks/issues/05`):

```
driftwatch                                        # sources: docs/agents/**
driftwatch --config driftwatch.docs.ts --only link/broken
```

Two runs rather than one, because `sources` and the check filter are both global. That is a limitation worth knowing before someone tries to express it as a single run.

## Consequences

- The CI step that runs driftwatch over this repo covers 4 files instead of 1, and stays green.
- `sources` is validated as a feature by having been used and by having its result **rejected**, which is a better test than a passing fixture.
- Anyone proposing to point driftwatch at `docs/` again should read this first, then the 43 findings, which reproduce by changing one line.
- If a future check is added that only reads link targets and frontmatter, including the specification under *that* check becomes reasonable. The rule here is about `path/missing`, not about `docs/` being untouchable.
