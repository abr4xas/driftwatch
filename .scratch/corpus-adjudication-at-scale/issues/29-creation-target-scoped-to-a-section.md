# 29: `creation-target` scoped to a section

**What to decide:** whether the gate that suppresses a path the document tells you to create
should reach the whole document or only the section the instruction is in.

**Type:** research

**Blocked by:** nothing. First of the three experiments ticket `27` put on its shortlist.

**Status: resolved 2026-09-20. No — the document scope stays.** The narrowing resurrects the
finding the gate was written to prevent. See §"Answer".

## The proposal

`creationTargets` collects every backticked span in a create-imperative sentence and
`declaresDestination` suppresses that text **anywhere in the document**. `27` measured 51
candidates, 44 reading as claims and 12 of those as ungoverned, with 8 more ambiguous — the
highest claimed count in the table, on the widest scope in the file. The module admits the
cost in those words: "a document that says Create `x` in one place and asserts `x` exists in
another."

A section is the obvious narrower scope, `sectionBoundaries` already exists, and
`elsewhereSections` and `externalRootSections` are both scoped that way.

## Answer

Built: `creationTargets` returns the section ranges each target was declared in, and
`declaresDestination(text, offset)` requires the claim to sit in one of them. Both call sites
in `paths.ts` already had the offset.

**Certification: `remix-run/react-router` CHANGED, calibration 21 to 22.**

```
+ .agents/skills/prepare-release-notes/SKILL.md:76:6  [path/missing] inline-code
+   scripts/changes/whats-changed.md
+   -> .agents/skills/prepare-release-notes/references/whats-changed.md (1, fixable)
```

That is the finding this gate exists for, named in its own docstring, and it comes back
**fixable at confidence 1 pointing at a different file the document mentions one line above.**
ADR-0006 condition 2 admits no false positive among the fixable at any rate, so the experiment
fails on the certification corpus before the discovery numbers are even read.

The mechanism is worth recording, because it is the argument and not the count. The document
has headings. The claim on line 76 and the "Add `scripts/changes/whats-changed.md`" bullet
that qualifies it are in **different sections**, so a section scope cannot join them. The
four bullets the docstring quotes are one passage to a reader and two sections to
`sectionBoundaries`.

**Discovery: +244 findings, 0 removed, 5 of them fixable.** The largest block is
`cenconq25/claude-code-app-studio`, a skills repository whose every `SKILL.md` says "create
`docs/architecture/architecture.md`" under one heading and refers to it under others — the
class the document scope was built for, at volume.

Reverted. `src/extract/` is unchanged by this ticket.

## What it leaves

The cost the module admits is real and `27` sized it: roughly a quarter of the gate's claimed
candidates. What this ticket establishes is that **a section is not the scope that separates
them**, not that the document scope is free. A narrower rule would have to key on something
other than headings — distance, or the list the instruction opens — and nothing here argues
that such a rule exists.
