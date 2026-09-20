# 15: A YAML alias in frontmatter crashes the whole run

**What to decide:** whether a `.mdc` rule file whose frontmatter says `globs: *.mdc` should
take the process down with "this is a driftwatch bug".

**Type:** bug

**Blocked by:** nothing

**Status: resolved 2026-09-19.** See §"Answer".

## The repository that found it

`petems/terraform-provider-extip`, one of the 231 the discovery corpus had audited when
ticket `07`'s discard pass ran over it. Its `.cursor/rules/cursor-rules-location.mdc` opens
with frontmatter Cursor writes by hand and every Cursor user has:

```yaml
---
description: Cursor Rules Location
globs: *.mdc
---
```

Run in that directory:

```
driftwatch: internal failure: Unresolved alias (the anchor must be set before the alias): .mdc
  this is a driftwatch bug; report it with the command that produced it
```

Exit 2, and **no other file in the repository is audited**. One rule file takes the run down.

## Why it happens, exactly

`*` opens an **alias** in YAML — a reference to an anchor declared earlier with `&`. There is
no anchor, so `*.mdc` is a dangling reference. It is the same shape as the boolean trap
[`frontmatter-invalid.ts`](../../../src/verify/checks/frontmatter-invalid.ts) already
documents: a glob that a YAML parser reads as syntax.

What makes it a crash rather than a finding is **where** the failure surfaces.
[`parseFrontmatter`](../../../src/parse/frontmatter.ts) uses `parseDocument` precisely so
errors are collected instead of thrown, and the comment there says so. An unresolved alias is
not a parse error: the document parses, `doc.errors` is empty, and the alias is a node. It
fails one line later, in `doc.toJS()`, which throws — outside the one thing the module was
written to be careful about.

```ts
const data: unknown = error === undefined ? doc.toJS() : undefined
```

So the guard is real and the crash goes around it.

## Why it is not ticket 13 again

`13` was a document git lists and the working tree does not have, and the answer there was to
skip the source and name it, because there was nothing to read. Here the file is read, and
what fails is our interpretation of it. The two share a symptom — "this is a driftwatch bug"
for something that is not one — and nothing else.

## What to decide

1. Whether `toJS()` throwing is a `frontmatter/invalid` **finding** (the block does not mean
   anything, which is what that check is for) or a source skipped the way `13` skips one.
   The first looks right: the document is there and it is wrong, which is a fact about the
   repository.
2. Whether it is worth distinguishing a dangling alias from the other ways `toJS()` can
   throw, or whether one reason covers them.
3. Whether the same hole exists anywhere else a parsed structure is converted after being
   checked for errors.

## What is not in question

That one file must not end the run. Whatever the verdict on the block, the other documents in
that repository were never looked at.

## How it was found

Ticket `07`'s discard pass, which runs the analyser over every clone and prints what failed
instead of stopping. It is the second product defect the discovery corpus has produced and
the second that arrived as one line of stderr in a loop over somebody else's repositories.

## Answer

Resolved 2026-09-19. **The block is reported, not skipped and not silenced**, and the run
survives it.

### The decision, and why it was Angel's to make

Three answers were on the table — a `frontmatter/invalid` finding, silence like a template,
or a skipped source like `13` — and the choice adds a finding class to a common file shape,
which is the one kind of change this project does not make on its own. Angel took the
finding, and the check's own docstring is the argument:

> The first is a fact: the block either is YAML or it is not, and a parser we did not write
> says which.

`globs: *.go` is not. Silence would have given driftwatch a category of malformed frontmatter
it declines to mention, which is harder to defend than one it reports; and `13`'s skip is for
a document that could not be **read**, where here it was read and only our interpretation of
it fails.

### There are two ways `toJS` throws, not one

The ticket found the dangling alias. Testing for the general case found a second, and it is
what settles the shape of the fix:

| | `doc.errors` | `toJS()` |
|---|---|---|
| `globs: *.go` | empty | `ReferenceError: Unresolved alias …` |
| aliases that expand exponentially | empty | `ReferenceError: Excessive alias count …` |

Neither carries a position — both are bare `ReferenceError`s, not the library's `YAMLError`.
So a backstop was not speculative generality: there was already a second real case, and it is
a resource-exhaustion guard that any document can trip.

`interpret()` is therefore one code path — `toJS()` inside a `try` — rather than a detector
plus a catch. What varies is only how precisely it can point.

### Where it points

`firstAliasSpan` walks the document for the first `Alias` node and takes its range. For the
dangling case that is *the* offending token; for the alias-count case no single token is at
fault and the first alias is where the expansion starts. A throw that is neither lands on the
block, so the finding always has something a reader can see.

```
.cursor/rules/golang.mdc
  ✗ 3  globs: *.go  invalid YAML: Unresolved alias (the anchor must be set before the alias): .go
```

### What it cost and what it bought

Measured over the ~700 repositories the discovery corpus had acquired:

- **7 files in 4 repositories** carry an unquoted `globs: *…`, out of 167 `.mdc` files. Those
  7 are now findings.
- Those 4 repositories now audit. Before, each of them exited 2 with "this is a driftwatch
  bug" and **nothing else in them was looked at**.
- The run over 700 went from one hard failure to **0 failed**.
- The certification corpus does not move: 66 repos · 320 sources · 33 findings, calibration
  21 · validation 12. The shape does not occur in the 66, which is why the discovery corpus
  is what found it.

### The ticket's third question, answered

*"Whether the same hole exists anywhere else a parsed structure is converted after being
checked for errors."* — `toJS()` is called in exactly one place in `src/`, and it is this one.
Nowhere else converts after an error check.

### How it was found

Ticket `07`'s discard pass, which runs the analyser over every clone and prints what failed
instead of stopping. Second product defect out of the discovery corpus, second one that
arrived as a line of stderr in a loop over somebody else's repositories.
