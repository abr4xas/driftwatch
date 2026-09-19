# 14: `skill/frontmatter` mixes drift with lint

**What to decide:** whether validating a `SKILL.md` against its format is driftwatch's job at
all, or whether only the rules that can *become* false belong here.

**Type:** research

**Blocked by:** nothing

**Status:** open — raised by Angel 2026-09-19 while reviewing ticket `10`

## The question, in one table

`BRIEF.md` states the problem the tool exists for: context files "describe paths, commands and
conventions **the repo has already changed**". Against that, the check's rules do not all do
the same kind of work:

| Rule | Can it become false? | |
|---|---|---|
| `name` does not match the directory | **yes** — the directory gets renamed and the frontmatter does not follow | drift |
| frontmatter missing, or no `name`/`description` | no, but the skill does not load at all | boundary |
| `name` is not kebab-case | **no** — as wrong on day one as a year later | lint |
| `description` shorter than 20 characters | **no** | lint |
| unknown key (near-miss only) | **no** | lint |

Only the first row is drift in the sense the brief means. The rest are conformance to a format
— true or false the moment the file is written, and unchanged by anything that happens to the
repository afterwards.

## Why this is not obvious

Three arguments point the other way, and they are why the rules shipped in M2 without anyone
asking:

1. **`BRIEF.md` § "Why it actually hurts" makes the opposite case.** "Unlike code, these files
   have no compiler, no tests, no linter. They are the one part of the repo where lying has no
   mechanical consequence." If driftwatch is the missing compiler, format validation is
   squarely its job.
2. **A malformed skill is an agent failure, which is the product's whole subject.** A
   `description` too short means the skill never gets invoked — the outcome is the same as
   drift even though the cause is not.
3. **Nobody else does it.** `skills-ref validate` exists, and almost nothing runs it: 1 of 23
   sampled real skills in `08` was invalid, and two of the 135 discovery repositories carry a
   `name` the reference implementation rejects.

## What was already decided, and what was not

**Decided in M2, and shipped:** the five rules in `SPEC.md` § 3, announced in `PRODUCT.md`,
carried by the corpus for eleven rounds. This ticket does not undo that by itself.

**Not decided, and settled the narrow way on 2026-09-19:** a sixth rule, `name` over 64
characters, was added during ticket `10` and withdrawn the same day on Angel's objection —
kept as a **gate on the autofix**, where it is needed so the fix cannot produce an invalid
name, and removed as a finding. That is the shape any answer here should probably take for the
other lint rules too, if the answer is that they do not belong.

## What deciding this costs

Removing a shipped rule is not free and the price should be counted before anyone argues:

- Corpus snapshots move, and `CLASSIFICATION.md`'s per-round numbers stop being comparable
  across the change.
- ADR-0006's conditions are measured over those snapshots.
- `PRODUCT.md` and `docs/guide/checks.md` both advertise the check as it stands.
- The `08` and `10` findings, which are real and which `skills-ref` agrees with, would go
  unreported — and there is no other tool in the ecosystem that anybody actually runs.

## The third option nobody has priced

Neither "keep" nor "remove": **a separate check id**, so `skill/format` can be turned off with
`--skip` by somebody who wants drift only, while `skill/frontmatter` keeps the one rule that is
drift. The selection machinery for that already exists. It costs a check id and a migration for
anybody who configured a severity.
