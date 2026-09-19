# 18: A section that says its files are not here, and the gate that cannot read it

**What to decide:** what to do about a document that names forty paths under one heading and
says in the same breath that none of them is in this repository.

**Type:** task

**Blocked by:** nothing

**Status:** open — it blocks `.github/skills/` in ticket `11`

## The document

`remix-run/react-router`, `.github/skills/agentic-workflows/SKILL.md`:

```markdown
Repository overlay (optional):

- If `.github/aw/instructions.md` exists, load it with `@.github/aw/instructions.md` after …

Read only the files you need:
Load these files from `github/gh-aw` (they are not available locally).

- `.github/aw/action-container-substitutions.md`
- `.github/aw/agent-runtime-instructions.md`
- `.github/aw/agentic-chat.md`
  … forty of them …
```

`.github/aw/` holds exactly one tracked file, `actions-lock.json`. The other forty are in
another repository, and the document says so **in the sentence that introduces them**.

driftwatch reports **80 findings** from this one file.

## Why every gate misses it

Three near-misses, and each one is instructive:

1. **`HEDGED` is window-scoped.** The disclaiming sentence is a heading for a bullet list.
   `lineAround` opens the previous line only when the current line does *not* open its own
   item, and every one of these does — so the window never reaches the sentence. The gate
   that would have caught this cannot see it by construction.
2. **`namesAnotherRepo` wants a URL.** It matches `github.com/owner/repo`; this document
   writes the bare slug `` `github/gh-aw` ``, which is the same statement without the
   hyperlink.
3. **`if exists` does not match ``If `x` exists``.** The marker is the literal string `if
   exists`, and here the path sits between the two words. That is the first finding of the
   eighty, and the only one the author explicitly hedged.

## The shape this actually is

It is `externalRootSections` for another **repository** instead of another **machine**.

That module already solves this exact problem: one sentence establishes a root, a list below
it is written relative to that root, and the existing rules see independent claims and report
every one. The only difference is that `EXTERNAL_ROOT` looks for `` `~/…/` `` and this needs
"the files in this section are somewhere else".

So the candidate answer is a section-scoped gate, not another entry in `HEDGED`. That is
also why it cannot be bundled into ticket `11`: it is a new gate over a new scope, and every
suppression rule in this project has to be measured before it is kept.

## What to do

1. Decide the signal. Options, roughly in order of narrowness:
   - a section-scoped marker list — "not available locally", "are not in this repository";
   - `namesAnotherRepo` widened to a bare `owner/repo` slug in inline code, section-scoped;
   - making `HEDGED`'s `if exists` tolerate a path between the words, which fixes 1 of the 80
     and nothing else.
2. **Measure it the way `16` established**: the certification corpus before and after, and
   then the 700 discovery repositories audited twice with the findings diffed. `16` is the
   precedent for why the first measurement alone is not enough — the 66 did not contain the
   shape, so they could not have shown the cost either way.
3. Then reopen `11` for `.github/skills/`, which is waiting on this and brings four true
   fixable findings with it.

## What this is not

Not a reason to leave `.github/skills/` out permanently. It is the most widely used of the
four roots ticket `11` weighed — 13 of 700 discovery repositories, more than `.cursor`, which
already ships — and the 80 findings are not a fact about the root. **The same file under
`.agents/skills/` produces the same 80 findings today.** This is a live defect that widening
a root happened to expose, not a cost of widening it.

Worth stating plainly for the same reason: the tool has this bug right now, for anybody whose
skill is installed somewhere driftwatch already reads.

Reproduced rather than argued. The file was copied to `.agents/skills/agentic-workflows/` in
an otherwise empty git repository, `git add`ed so the index lists it, and audited with the
built CLI: **80 findings**, the same count and the same classes.

One thing does differ by root, and only one: the *suggestion* on the last finding is derived
from what else the repository holds, so it names whichever `SKILL.md` is nearest. The
findings are identical; one of their suggested targets is not.

## It can reach ADR-0006 condition 2

That reproduction turned up something the corpus run did not, and it raises the priority.

In `remix-run/react-router` the 80 are all unfixable — the snapshot reads `fixable: 0` —
because the repository holds several `SKILL.md` files and no basename suggestion is
unambiguous. In the one-file repository it becomes:

```
✗ 107  skills/otel-queries/SKILL.md   path does not exist  → .agents/skills/agentic-workflows/SKILL.md?
1 fixable with --fix
```

**A false positive carrying an autofix**, which is the one thing condition 2 admits at no rate
whatsoever. The trigger is ordinary: a repository with exactly one `SKILL.md` that installs
this skill. That is a smaller repository than react-router, not a rarer one.

The reproduction is synthetic — one file in an empty repo — so what it establishes is that the
class *can* produce a fixable finding, not how often it does. It is also **shape-dependent**,
which is the whole mechanism: with one `SKILL.md` in the index the basename suggestion is
unambiguous and `fixable: true` at confidence 1; with several it is not fixable at all, which
is why react-router shows `fixable: 0`. Re-running it needs the empty-repo shape exactly. Nothing in the certification
corpus produces it today and condition 2 is not currently broken. But the class is no longer
only a noise problem, and that is the argument for doing this before `11` rather than after.
