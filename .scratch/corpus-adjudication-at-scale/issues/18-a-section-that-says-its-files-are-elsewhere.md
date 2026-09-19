# 18: A section that says its files are not here, and the gate that cannot read it

**What to decide:** what to do about a document that names forty paths under one heading and
says in the same breath that none of them is in this repository.

**Type:** task

**Blocked by:** nothing

**Status: resolved 2026-09-19.** Eighty findings to none, and `11` is unblocked. See
§"Answer".

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

## Answer

Resolved 2026-09-19. Three changes, each priced on its own, and the document goes from **80
findings to none**. Adjudicated as round twenty-three of `CLASSIFICATION.md`.

### What was built, against the three near-misses this ticket named

1. **One pattern for the hedge a path stands inside**, `if … exists`, read against the line
   with each code span masked to a single character. The third option in §"What to do" was to
   fix `if exists` alone; this is that, and it turned out to be worth more than the 1-of-80 the
   ticket estimated — ten real hedges across 700 repositories were not being heard.
2. **A line that introduces a list speaks for the list.** This is what reaches the other 39.
3. **`ELSEWHERE`, section-scoped.** Not a hedge — `HEDGED` is a document being uncertain and
   this is one being certain in the other direction — so it reports under its own name and
   keeps `07`'s table readable.

The phrasings were **counted, not invented**: over 700 repositories, `not in this repo` in 19,
`not available locally` in 5, `not part of this repo` in 3. Every entry carries its own
negation, because `available locally` alone is 28 repositories saying a thing *is* there.

### Every bound on the lead-in walk came from a repository

The walk is where this could have gone wrong, and it did, twice, before the measurement caught
it:

| bound | found by |
|---|---|
| the window is lead-in **+ item**, nothing in between | `openai/codex` — a sibling bullet writes "(for example, `thread/read`)" four lines up |
| the lead-in must be indented no further than the item | `saubakirov/KZ-IT-telegram-list` — a sibling's wrapped second line carries an `e.g.` about its own paths |

Both lost a true finding to an early version and both have it back. Neither would have been
visible without running the corpus between attempts, which is the argument `AGENTS.md` makes
for running it before *and* after.

### The measurement, both halves

The certification corpus does not move — 66 repos · 334 sources · 35 findings — which this
ticket predicted would be uninformative, so the 700 discovery repositories were audited before
and after:

```
before 1442 · after 1430 · ADDED 0 · REMOVED 12
```

Nothing added, which is structural: every change here only widens suppression. Ten of the
twelve removals are correct and every one is the ``if … exists`` shape a document wrote
explicitly. **Two are the cost**: `DocRoms/Kronn`,
where a table row says to read a file when the *task* references something not in this repo and
the marker read that as being about the file; and `TheAndrewStaker/mcp-midi-control`, where a
lead-in linking to another repository about a different file reached the bullet below it.

Two false negatives in 700 repositories against eighty false positives in one file. The
project's rule settles that, and the direction is the only reason it settles: two real claims
went quiet and are named here rather than rounded off.

The section rule on top removed **nothing further** in 700 repositories. It is kept for the
document it was written for, where it takes 13 to 0. A measured cost of zero is not no cost,
only a rule that rarely fires — its risk is a long section with one aside in it, and nothing
like that occurred in 766 repositories.

### Condition 2

The fixable false positive this ticket recorded — `skills/otel-queries/SKILL.md` suggested as
`.agents/skills/agentic-workflows/SKILL.md` at confidence 1 — is gone with the rest. The
corpus keeps its two fixable findings and both are true.

Worth recording separately, because this gate is not what makes it safe: that suggestion was
confident because `SKILL.md` was the only one in the index, and **a unique basename match on a
fixed format name is not evidence** — the directory is the identity, which is the same thing
ticket `10` established for `name`. Nothing in the corpus produces it today. It is a defect
waiting for a repository with one skill and a document naming another, and it deserves its own
ticket rather than a line in this one.

### What it unblocks

`11`'s `.github/skills/`, which was held by this and nothing else.

### What a review caught, and two of them were mine to have caught

Four findings, and the first is the one that mattered.

**The lead-in silently re-scoped the two sentence rules.** `CONDITIONAL`'s own comment says it
is "tested against the **sentence** holding the claim, never the two-line window" — and a
lead-in usually ends in a **colon**, which `segmentAround` does not split on. So "You could
restructure it like this:" became part of every bullet's sentence and silenced all of them.
The gate hung on the lead-in's punctuation: ending it with a full stop restored the old
behaviour. `ProseWindow` now carries where sentence scope may begin — 0 for a wrapped line,
because there the two lines really are one sentence, and the item's start for a lead-in.

**Stripping every code span manufactures markers.** "Pick a name such `foo` as the slug in
`src/slug.ts`" became "such as". Replaced with one pattern over a **masked** line, and the
measurement then found the mirror image: leaving spans in place reads `` `CREATE TABLE IF NOT
EXISTS` `` as a hedge. A mask fixes both, because it is neither whitespace nor readable.

**A 27-line docstring was attached to the wrong function** — `indentOf` had been inserted
between it and `leadInStart`, so the function carrying the risk had nothing at its signature.

**The measurement was written into `src/`**, again: "over 700 others audited before and after…
766 repositories" as the reason a suppression rule is kept. Fourth time on this branch. It
lives in `CLASSIFICATION.md` round twenty-three and the file now says so.

Two more the reviewer raised are **recorded rather than fixed**, because fixing either widens
suppression and neither has evidence beyond one constructed case. `blanks` counts one blank
line in the whole walk rather than one per gap, so a loose list loses its lead-in from the
second item on — arbitrary, and it errs towards reporting. And `elsewhereSections` treats a
document with no `#` heading as one section; that is not new, `externalRootSections` has shared
`sectionBoundaries` and the same property since it shipped.
