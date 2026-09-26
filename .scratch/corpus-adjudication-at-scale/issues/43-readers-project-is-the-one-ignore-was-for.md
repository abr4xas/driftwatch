# 43: `readers-project` is the class `ignore` was implemented for

**What to decide:** what rule comes out of `readers-project`, ticket `37`'s fifth class.

**Type:** prototype

**Blocked by:** nothing.

**Status: resolved 2026-09-24.** No rule, and for once that is not a refusal: the answer
shipped three commits ago as a config key. No code changed.

## The class

33 findings in 29 repositories, 29 still live in 25. Read end to end, the paths are
indistinguishable from any project's own:

```
src/main.ts                      config/permission.php
cypress/support/e2e.js           test/billing_test.rb
convex/convex.config.ts          example/android/build.gradle.kts
src/pages/                       .github/workflows/pr-check.yml
```

There is nothing to match. What makes them the reader's rather than this repository's is that
the document is a skill instructing an agent how to work in **some other** project, and the
only thing that says so is what the document is.

## The one thing measurable here, and it points where ticket 33 pointed

| | share in `SKILL.md` |
|---|---|
| `path/missing` overall | 9150 of 31 586 = **29.0%** |
| this class | 18 of 29 = **62.1%** |

**2.1× concentrated**, which matches ticket `33`'s independent measurement over a different
population — 54% of its off-subject findings in `SKILL.md` against 29% of the check. Two
questions, two populations, the same answer: this is about installed skills.

## Why there is no rule, already measured

Ticket `36` asked exactly this question and answered it twice over:

- A model cannot draw the line: `aboutThisRepo` at **-31 points** against a person.
- Neither can the disk: eleven comparable pairs, every deterministic axis — provenance
  metadata, the document copied into other repositories, the container directory, naming
  another project — present on **both** sides.

H is dead and this is the class it died on. Nothing has changed since to reopen it.

## The answer exists and it is not a discard rule

`ignore`, landed in `2022823`. A user says which documents are not theirs, in a file they
commit:

```yaml
ignore:
  - '.claude/skills/vendored/**'
```

That is [ADR-0008](../../../docs/adr/0008-a-specification-is-not-an-agent-context-file.md)'s
remedy — the one this repository used on its own `docs/` — finally available to the people who
need it. It reaches what discovery found on its own, which is the whole point for a skill
nobody declared.

**What is left open is not technical.** Angel read `remix-run/react-router`'s published skill
as `this-repo` where ADR-0008 names that exact case as the reader's. Either the ADR is amended
or corpus finding #23 moves. That decision is its own ticket and no measurement settles it.

## The table, finished

Five classes attacked in order of mass:

```
foreign-project    74 repos  ->   53 findings   two clauses
placeholder        57 repos  ->  261 findings   two clauses, one shape refused
runtime-log        36 repos  ->   16 findings   class refused, one structural clause
generated-bundle   31 repos  ->    0 findings   class refused
readers-project    29 repos  ->    0 findings   answered by config, not by a rule
```

**330 findings removed, from a table whose top row promised the most and delivered a fifth of
what the second row did.** Three of five classes produced no rule at all, each for a different
reason:

- `runtime-log` — its vocabulary is the vocabulary of real directories.
- `generated-bundle` — its marker is true and says nothing about absence.
- `readers-project` — its signal is not on disk, and the remedy is configuration.

None of those three reasons was visible in the table, and none of them is a reason the next
reader would guess. That is the argument for reading a class before acting on its size, and
after five rounds it is measured rather than asserted.
