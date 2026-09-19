# 14: `skill/frontmatter` mixes drift with lint

**What to decide:** whether validating a `SKILL.md` against its format is driftwatch's job at
all, or whether only the rules that can *become* false belong here.

**Type:** research

**Blocked by:** nothing

**Status: resolved 2026-09-19.** The three lint rules are gone. Raised by Angel while reviewing
ticket `10`, and decided by him. See §"Answer".

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

## Answer

Resolved 2026-09-19. **The three lint rules are removed** — unknown key, `description` shorter
than twenty, `name` not kebab-case. `skill/frontmatter` keeps the one rule that is drift and
the two shapes that are its precondition. Round twenty-five.

Angel's question was the right one and this ticket did not answer it: *"¿por qué hacemos lint
de skills? A nosotros sólo debería importarnos que esté en el directorio correcto y que no esté
roto donde se menciona."*

### The answer was already written down

`BRIEF.md` § Non-goals, which this ticket never quoted:

> - It is not a Markdown linter (it does not check style, formatting or spelling).
> - It does not judge whether the content is *good*, only whether it is *true*.

A `description` under twenty characters is not false. `allowed_tools` for `allowed-tools` is
not false. `pilot_driver` is not false. They are format and quality, which that line names as
the two things this tool does not do.

**And the argument this ticket built for keeping them was a misreading of the same document.**
§"Why this is not obvious" cites *"unlike code, these files have no compiler, no tests, no
linter"* as if it licensed format validation. In place it is the reason **drift** hurts —
lying about the repository has no mechanical consequence — where lying means asserting
something false about the repo. A short description asserts nothing.

The other two arguments do not survive either. *"A malformed skill is an agent failure"* proves
too much: so is a missing dependency, a broken script, a typo in prose, and with that criterion
the tool validates anything that could make an agent fail and stops having a subject. *"Nobody
else does it"* is a market argument rather than a scope one.

### What the measurement said, taken before deciding

Over 700 discovery repositories: the drift rule produced **23 findings from 23 mistakes**; the
three lint rules produced 23 from **five**. Eighteen unknown keys are one snake_case slip in
`meain/dotfiles` copied across fourteen skills and another in `aegntic/cldcde` across four.
Three of the four short descriptions are inside another project's **test fixtures**.

It did not decide anything — the non-goals did — but it is the reason nobody should feel the
removal cost much.

### The bill

One finding: `openai/codex`'s 16-character `description`, which was **true**. Corpus 39 → 38,
calibration 23 → 22, validation untouched, fixable unchanged at 6. `SPEC.md`, `PRODUCT.md`,
`README.md` and `docs/guide/checks.md` all say what the check is now, and each says that format
is not checked rather than leaving it to be discovered.

### The third option, priced and not taken

§"The third option nobody has priced" proposed a separate `skill/format` id so the rules could
be skipped rather than removed. It was offered and Angel went the other way, which is right for
a reason worth recording: a separate id **keeps the behaviour** and asks every user to opt out
of something the project's own non-goals say it should not do. The id would have been a way of
not deciding.

### What is knowingly given up

`allowed_tools` and `user_invocable` are real mistakes — the key does nothing — and almost
nobody runs `skills-ref validate`, which ticket `08` measured at 1 invalid skill in 23 sampled.
Reporting them was useful and it was not this tool's job. A tool that does a neighbouring job
because nobody else will is how a scope stops meaning anything.

### What this leaves open

`MAX_NAME` and `KEBAB` stay as the **autofix gate**, which is where ticket `10` put the first
of them: the fix rewrites a `name` into its directory, so the directory has to be usable as one.
The gate is now strictly stricter than anything the check reports, and that asymmetry is the
shape this ticket says any answer should take — driftwatch will not lint your naming, and it
will not hand you an edit that breaks your skill either.
