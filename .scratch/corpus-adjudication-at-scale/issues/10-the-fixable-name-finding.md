# 10: The fixable `name` finding, and ADR-0006 condition 2

**What to find out:** whether `skill/frontmatter`'s one autofix is offered on a finding that
is not drift, which condition 2 admits at no rate whatsoever.

**Type:** research

**Blocked by:** nothing

**Status: resolved 2026-09-19.** Not a defect. The autofix stays, verified three ways.
See §"Answer".

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

## Answer

Resolved 2026-09-19. **The finding is right, the fix is right, and it stays.** Verified by
running the tools rather than by reading the specification twice.

### 1. The reference implementation rejects it

`skills-ref validate` — the tool <https://agentskills.io/specification.md> § Validation
names — on the exact skill from the `08` sample:

```
Validation failed for ./bankr-dev-portfolio:
  - Skill name 'Bankr Dev - Portfolio' must be lowercase
  - Skill name 'Bankr Dev - Portfolio' contains invalid characters.
  - Directory name 'bankr-dev-portfolio' must match skill name 'Bankr Dev - Portfolio'
```

Three violations, and the third is word for word the rule driftwatch reports.

### 2. The fix produces a skill it calls valid, and the alternative does not

This is the part that settles the *direction*, and it is not what the error message above
suggests. `skills-ref` phrases it as "directory must match name", which reads like an
argument for renaming the directory. Both were tried:

| | `skills-ref validate` |
|---|---|
| driftwatch's fix — `name` → `bankr-dev-portfolio` | **Valid skill** |
| the other way — directory → `Bankr Dev - Portfolio` | **still fails**, name is not lowercase |

When the directory is already kebab-case, rewriting the name is the **only** repair. Which is
exactly the gate `checkName` has carried since it shipped: the fix is offered only when
`KEBAB.test(directory)`. That was reasoned from first principles at the time; it is now
measured.

### 3. Nothing invokes a skill by that field

The ticket's real worry — *"if any of them reads `name` as a display label and invokes by
directory, the autofix breaks a working skill"* — turns out to be backwards. The consumers
key on the **directory**, so `name` is the label, and rewriting a label breaks nothing:

- **Claude Code** invokes `/<directory-name>`; the frontmatter `name` is documentation. (From
  the documentation, not from source — the one claim here that is not a run of a program.)
- **`npx skills`** installs to the *source* directory name and leaves the frontmatter alone.
  Installing a deliberately mismatched skill produced
  `.claude/skills/bankr-dev-portfolio/SKILL.md` still saying `name: Bankr Dev - Portfolio`:
  the installer propagates the mismatch rather than enforcing or fixing it. Its lockfile
  matches on *either* normalised form, so making them agree can only widen what resolves.
- **141 skills installed on this machine: 0 mismatches.** The disagreement is a defect, not a
  convention.

### What the ticket did not expect

**`npx skills init` creates invalid skills.** `npx skills init "Bankr Dev - Portfolio"`
makes a directory literally named `Bankr Dev - Portfolio`, with spaces, and a matching
`name:`. `skills-ref` rejects it; driftwatch reports `name is not kebab-case` and — correctly
— **offers no fix**, because the repair there is renaming a directory and driftwatch does not
rename directories. Both halves of the rule were checked against that shape and both behave.

**A rule looked missing, and it was the wrong instinct.** The specification caps `name` at 64
characters and `skills-ref` enforces it — 64 valid, 65 rejected, checked at the boundary — and
driftwatch checked the other four `name` rules and not that one. So it was added as a finding.

Angel's objection, the same day: *"¿por qué estamos validando el formato de las skills? ¿eso
no se sale del scope de lo que es driftwatch?"* — and against `BRIEF.md` he is right. A name
over the limit is as wrong the day it is written as a year later; nothing about the repository
changed under it, and this tool is about documents that no longer match the repository they
describe. It is lint, and I added it mid-ticket because I was looking at the rule rather than
at the product.

**Withdrawn as a finding and kept as a gate**, which is the split the evidence supports. The
autofix rewrites a `name` into its directory, so the directory has to be usable as a name — a
68-character kebab-case directory is not, and offering it produces a skill `skills-ref`
rejects. `usableAsName()` is asked only by the fix. The asymmetry is deliberate and the
fixtures pin both halves: an over-long name that matches its directory is **silent**, and an
over-long directory is **refused as a fix**.

It had reported nothing anyway, over the 1275 `SKILL.md` files in the 66 certification and 135
discovery repositories. That figure stays here rather than in `src/`: it is a count over the
discovery corpus.

The larger question it opened — that `skill/frontmatter` has been mixing drift with lint since
M2, and only one of its five rules can ever *become* false — is ticket `14`. It is not settled
by this one and the shipped rules were left alone.

**Two live instances exist in the discovery corpus**, and `skills-ref` agrees with driftwatch
on both: `clawwork-ai/ClawWork` (`name: team-create` in `team-creator/`) and `axeII/home-ops`
(`name: but` in `gitbutler/`). The second is the interesting one — `but` is the GitButler CLI
and looks deliberate — and it is still a violation by the specification and by the reference
implementation, which is what this ticket set out to establish.

### The ticket's own criterion, re-read rather than met

Step 4 says: *"If either does not: the finding stays, the **autofix** goes."* And `npx skills`
**does not** enforce the rule — it propagates the mismatch. By the letter of the ticket that
is the trigger for removing the autofix.

It was re-read instead, and that should be on the record rather than passed over. The step
was written when "does the installer enforce it?" stood in for "would the fix break
anything?", and the two came apart: an installer that keys on the directory and ignores the
field is evidence that rewriting the field is **harmless**, not evidence that it is wrong.
What would have triggered removal is a consumer that resolves a skill *by* `name` — and none
was found. The criterion the evidence actually answers is that one.

### What a review caught, and it was a defect I added

The 64-character rule landed as a bare `if` after the fix gate, and the gate still asked only
`KEBAB.test(directory)`. So a kebab-case directory of 68 characters was offered as the fix for
a mismatched name — **an autofix whose output is invalid by the reference implementation**,
which is exactly condition 2's zero-tolerance case and contradicts the `SPEC.md` § 8 line this
ticket quotes. Reproduced against the built CLI before fixing:

```
✗ 2  name  name does not match the directory  → aaaaaaaaaa-…-ffffffffff-gg?
1 fixable with --fix
```

The repair is one named predicate, `usableAsName()`, asked by the fix and by nothing else — so
the question "could this string be a name?" has exactly one answer in the codebase. A fixture
pins it: an over-long directory produces the mismatch finding with **no** suggestion.

Worth noting that the withdrawal above did not remove this defect, it sharpened it. With the
length rule gone the gate is now strictly stricter than what the check reports, which is the
right way round: driftwatch stays quiet about a name it has no business judging, and still
refuses to hand anybody an edit that breaks their skill.

Adding a rule to a check that carries an autofix is the shape to be careful with, and the
lesson is narrower than "be careful": **the gate has to be the same code as the rule**, not a
copy of it that has to be remembered.

### The corpus gates, run

`pnpm corpus --check`: 66 repos, 320 sources, 33 findings, unchanged. `pnpm corpus --fixes`:
one edit, the `fireSeqSearch` path, unchanged. `AGENTS.md` requires both when touching
`src/verify/` and anything an autofix depends on, and this touched both.

### One adjacent gap closed

`compatibility` is in the specification's table and accepted by `skills-ref`, and it was
missing from `KNOWN_KEYS`. Added: the list can only make the unknown-key rule **quieter**, so
falling behind it is free and catching up costs nothing.

### What this does to ADR-0006

Nothing moves, which is the right outcome. Condition 2 is measured over the corpus and this
finding does not occur there; what changed is that the tool's **second** autofix is no longer
unexamined. The verdict is recorded in `CLASSIFICATION.md` next to condition 2's evidence,
labelled as what it is: a property of the tools, not a measurement of a sample.