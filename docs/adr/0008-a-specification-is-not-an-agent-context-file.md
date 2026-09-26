# ADR-0008 — A specification is not an agent context file

- **Status:** accepted, amended 2026-09-24 (see "What the premise actually is")
- **Date:** 2026-09-10

## Context

The config's `sources` key (`docs/spec/SPEC.md` § 7) landed so that this repo could audit its own `docs/`. The motivation was concrete: `AGENTS.md` opens by ordering the agent to read the four documents in `docs/spec/`, which makes them agent context in fact, and the relative links inside them were verified once by hand with a throwaway script and by nothing since.

So the obvious config was written and run:

```yaml
sources: ['docs/**/*.md', 'README.md']
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

**`docs/spec/`, `docs/adr/` and `README.md` are not driftwatch sources**, and the shipped `driftwatch.config.yaml` declares only:

```yaml
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
driftwatch --config driftwatch.docs.config.yaml --only link/broken
```

Two runs rather than one, because `sources` and the check filter are both global. That is a limitation worth knowing before someone tries to express it as a single run.

## Amendment, 2026-09-24: what the premise actually is

This ADR drew one line — a context file **instructs**, a specification **argues** — and it held
for fourteen days because every case in front of it was on one side or the other. Then a case
arrived that is on neither, and the corpus had been carrying it the whole time.

`remix-run/react-router` publishes `.agents/skills/react-router/SKILL.md`, which names
`app/entry.server.tsx` at line 22. That file does not exist in react-router and never will: it
is a file in **your** app, the one that installs the skill. The document does not argue and it
does not quote. **It instructs, and it instructs about somebody else's repository.**

So the dichotomy was the wrong shape. Instruct-versus-argue is a useful symptom, not the
premise. The premise is the sentence two paragraphs above it, and it is the one to keep:

> **An agent context file makes assertions about the repo it sits in.** `path/missing` is only
> as precise as that premise is true.

A document that instructs about another project breaks that premise exactly as a specification
quoting other projects does, and it breaks it while passing every test the old wording
proposed. Where this ADR says "quotes rather than asserts", read **"does not assert about this
repository"** — the ADR's own table already lists "paths in *the reader's* repo" as a cause,
which was the amendment arriving fourteen days early in a row of a table.

### What settled it

Not an argument. Ticket
[`36`](../../.scratch/corpus-adjudication-at-scale/issues/36-does-jev-know-whose-document-this-is.md)
asked whether the distinction could be drawn mechanically at all, pre-registered the answer's
threshold, and came back negative twice:

- A model cannot draw it. `aboutThisRepo` scored **-31 points** against a person over a blind
  sample of 29 documents.
- The disk cannot draw it either. Eleven comparable pairs, and every deterministic axis —
  provenance metadata, the document copied into other repositories, the container directory,
  naming another project — appears on **both** sides.

The react-router document was that ticket's pre-registered control, and Jev read it
`another-project` at 0.29 — agreeing with this ADR. Angel read it `this-repo`, which is the
disagreement this amendment exists to settle, and settled it this way after the pairs were on
the table: the ADR's premise is right and its wording was too narrow.

### What this does not change

**Corpus finding #23 stays `false`.** `app/entry.server.tsx` in `remix-run/react-router` is a
false positive, class `readers-project`, exactly as it has been recorded since round eighteen.
The amendment gives it the reasoning it was always resting on; it moves no number, and
condition 6 stays at 81 of 96.

That is the direction that makes this safe to accept. An amendment that *improved* the
percentage would deserve the suspicion `CLASSIFICATION.md` § "When a condition fails" reserves
for exactly that move.

### What it costs, and who pays

A user whose repository carries an installed skill gets findings about the project the skill
came from. That is this premise failing in their repository, and until 2026-09-24 they had no
way to say so: `sources` only adds, `checks` turns a check off everywhere, and
`<!-- driftwatch-ignore-file -->` needs the document edited, which loses the edit the next time
that skill ships.

`ignore` is the remedy and it is the same one this ADR used on its own `docs/`:

```yaml
ignore:
  - '.claude/skills/vendored/**'
```

Configuration, not inference — because ticket `36` measured that inference is not available.

### What is deliberately still open

Whether driftwatch should **discover** fewer such documents, rather than letting the user
exclude them. Ticket
[`33`](../../.scratch/corpus-adjudication-at-scale/issues/33-who-are-these-documents-about.md)
holds that question and it is a product decision with no measurement behind it yet: the package
promises to find what is no longer true in "your `CLAUDE.md`, `AGENTS.md` and skills", and what
"your" means to a user with sixty installed skills is answered by users, not by a corpus.

## Consequences

- The CI step that runs driftwatch over this repo covers 4 files instead of 1, and stays green.
- `sources` is validated as a feature by having been used and by having its result **rejected**, which is a better test than a passing fixture.
- Anyone proposing to point driftwatch at `docs/` again should read this first, then the 43 findings, which reproduce by changing one line.
- If a future check is added that only reads link targets and frontmatter, including the specification under *that* check becomes reasonable. The rule here is about `path/missing`, not about `docs/` being untouchable.
