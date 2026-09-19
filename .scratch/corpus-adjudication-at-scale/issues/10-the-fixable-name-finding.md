# 10: The fixable `name` finding, and ADR-0006 condition 2

**What to find out:** whether `skill/frontmatter`'s one autofix is offered on a finding that
is not drift, which condition 2 admits at no rate whatsoever.

**Type:** research

**Blocked by:** nothing

**Status:** open — **the only ticket here about a defect that ships today**

## The finding

Reproduced against real driftwatch, from a real skill sampled in `08`:

```
.claude/skills/bankr-dev-portfolio/SKILL.md
  ✗ 2  name  name does not match the directory  → bankr-dev-portfolio?
1 fixable with --fix
```

The frontmatter says `name: Bankr Dev - Portfolio`; the directory is its kebab-case form.
driftwatch offers to **rewrite the human-readable title into the slug**.

It appeared in **1 of 23** real `.claude/skills/` skills sampled — not rare.

## Why it is probably correct, and why that is not enough

<https://agentskills.io/specification.md> is explicit on both halves:

> * May only contain unicode lowercase alphanumeric characters (`a-z`, `0-9`) and hyphens
> * **Must match the parent directory name**
>
> ```yaml
> name: PDF-Processing  # uppercase not allowed
> ```

By the letter of that, `Bankr Dev - Portfolio` is invalid twice and the fix is right. Ticket
`08`'s correction rests on exactly this reading.

**But the fix has to be right, not probably right.** ADR-0006 condition 2 admits **zero**
false positives among the fixable findings, with no percentage modulating it, and this is the
check's only autofix. Two more unadjudicated fixable findings arrived in round eighteen, so
the condition is already in suspense.

What the specification does not settle: whether the agents that consume skills actually
enforce it, or read `name` as a display label and invoke by directory. If any of them does
the latter, the autofix breaks a working skill to satisfy a document.

## What to do

1. Check what the reference implementation does — the spec names
   [`skills-ref`](https://github.com/agentskills/agentskills/tree/main/skills-ref) and
   `skills-ref validate ./my-skill`. If it rejects a title-cased `name`, this is settled.
2. Check what `npx skills` does with one, since it is the installer most of the ecosystem
   uses.
3. If both enforce it: record the verdict, close the ticket, and cite it in
   `CLASSIFICATION.md` next to the class.
4. If either does not: the finding stays, the **autofix** goes, and `SPEC.md` § 8's claim that
   this check has one autofix changes with it.

## What is not in question

The finding itself. A `name` that disagrees with its directory is worth reporting either way
— round eighteen's class A and the `08` sample both turn on it. This ticket is only about
whether driftwatch should offer to *change the file*.
