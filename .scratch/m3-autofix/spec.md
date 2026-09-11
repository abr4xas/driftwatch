# M3 — Autofix

The full specification lives in `docs/spec/`. This file only delimits the scope of this batch of tickets and records what was decided before writing them.

M2 shipped five checks that **describe** drift. M3 is the first milestone that **writes to the user's files**, and that changes the failure mode completely: until now the worst outcome was a line somebody reads and dismisses. From here the worst outcome is a document that now points confidently at the wrong file, which the next agent believes.

`AGENTS.md` prices that already: "a `--fix` that rewrites the document to point at the wrong file makes the next agent act on a lie with confidence". M1's hard floor — **zero false positives among the `fixable` findings** — was written for this milestone before it existed. M3 is where it stops being a precaution and becomes the thing being shipped.

## Scope

The three deliverables of `docs/spec/ROADMAP.md` § M3, split into seven tickets.

**The edit model first**, because nothing can be applied until it is known what may be replaced:

- `01` — the fix range: what `--fix` is allowed to overwrite, which is **not** the claim's range in two of the three cases.
- `02` — `src/fix/apply.ts`: plan edits, apply them by offset, refuse what overlaps.

**Then the command line:**

- `03` — `--fix` writes, counts what it applied, and the exit code reflects what remains.
- `04` — `--dry-run` and the summarized diff, plus the `SPEC.md` § 4 gap it exposes.
- `05` — the dirty-working-tree warning (SPEC § 8, last rule).

**Then the evidence:**

- `06` — the acceptance fixture: byte-for-byte identical to the correct version, and idempotent.
- `07` — the corpus with `--fix` in hand, and the two deferred fixability decisions it was supposed to settle.

## The three autofixes that exist, and the fourth that does not

`SPEC.md` § 8 lists four. Checked against the code before writing the tickets, because a ticket that "implements" a fix the extractor cannot place is how this milestone corrupts a file:

| § 8 bullet | Where `fixable: true` is set | What the claim's `offset` covers |
|---|---|---|
| `path/missing`, single candidate by basename | `suggestPath`, `src/fix/suggest.ts` | the path fragment as written |
| `script/missing`, single script within 2 edits | `suggestScript`, same file | the **whole command**, and the suggestion is the whole corrected command |
| `skill/frontmatter`, `name` against its directory | `checkName`, `src/verify/checks/skill-frontmatter.ts:98` | the **key token**, not the value |
| `link/broken`, single candidate target | nowhere | — |

The fourth needs no work and no code. Ticket `05` of M2 settled it: `link/broken` never claims a target that does not exist, because `path/missing` already does and one link must produce one finding. The "single candidate target" § 8 describes **is** the first row. The anchor half is not autofixable and `suggest.ts` says why at length; ticket `07` is where that gets re-read with corpus evidence rather than reopened here.

## The trap this milestone is built around

**`Claim.offset` is not the fix range.** `core/types.ts` calls it "Absolute offsets into `source.content`. Enables --fix without reformatting", and for `path/missing` that is true. For the other two it is not:

- **`skill/frontmatter`** claims the frontmatter **key**. `parse/frontmatter.ts` records the key token's offset because "that is what a finding quotes", and the value's offset is recorded on a different type that the claim does not carry. Replacing the claim's range with the suggestion turns `name: wrong-thing` into `my-skill: wrong-thing`. This is the single most likely way to ship a corrupting `--fix`, and ticket `01` exists for it.
- **`script/missing`** claims the whole command and its suggestion is the whole corrected command, so the two line up — by design, and the comment in `ScriptFact.nameOffset` says so. It works today by a decision somebody already made on purpose; the ticket's job is to not break it.
- **`path/missing`** claims the fragment, but the fragment is not always what the suggestion should replace. A link claim's offset "still points at the full url, anchor included" (`extract/paths.ts:213`), and the suggestion is a bare repo-relative path. Writing it over the url drops the anchor. A path the author wrote as `./src/cli.ts` normalizes to `src/cli.ts` before the index sees it, and the suggestion comes back without the `./`.

So `01` is not plumbing. It is the ticket that decides, per autofix, **which bytes change and what of the author's spelling survives**, and it is the only one that can be got wrong silently.

## What the fix never does

These are the equivalent of the extractor's discard rules, and every one of them belongs in the fixture:

- **It never applies two edits to the same range**, and never applies overlapping ones. Two findings on one claim is a bug upstream, not a merge problem to solve here.
- **It never reformats.** Only the ranges change; the rest of the file is copied byte for byte, newline style and trailing whitespace included.
- **It never fixes an alias it did not audit.** A `CLAUDE.md` that is a byte-identical copy of `AGENTS.md` is reported once through `Source.aliases`. Fixing the one and leaving the other is how the two stop being copies. Ticket `03` decides: fix both, or fix neither and say so.
- **It never applies a suggestion with `fixable: false`**, whatever its confidence. `fixable` is the decision; the 0.8 threshold is how the three producers reach it and is not re-evaluated at apply time.
- **It never touches a finding an ignore directive silenced**, which follows for free: `run()` filters those before anything sees them.

## Idempotence is a property of the re-run, not of the writer

ROADMAP's acceptance says "running `--fix` twice is idempotent". The honest reading is not that the second write produces the same bytes — it is that **the second run finds nothing left to fix**, because the first one made the claims true. If a second run still reports the same finding, the fix did not fix it, and that is a bug the fixture has to be able to catch. Ticket `06` tests the re-run, not just the bytes.

## Exit codes

`SPEC.md` § 4: "With `--fix`, the exit code reflects what **remains** after fixing." So `--fix` on a repo whose only error was autofixable exits `0`. That means the counts printed and the code returned come from a state that no longer matches the findings in hand — either by re-running the pipeline after writing, or by subtracting what was applied. Ticket `03` picks one and writes down the cost; re-running is honest and doubles the runtime, subtracting is fast and can drift from the truth.

## The specification is missing a flag

`SPEC.md` § 8 specifies `--fix --dry-run`. `SPEC.md` § 4's option list does not contain `--dry-run`, and neither does `src/cli/args.ts` or `--help`. Per ADR-0001 the specification is primary source, so the resolution is not to invent the flag in the code and leave the document behind: ticket `04` amends § 4 and the help text in the same change that implements it.

## What does not change

- **No new dependency.** A summarized diff of a handful of single-line replacements is not a job for a diff library; the ranges and the two strings are already in hand. The cold-start budget applies to `--fix` like everything else.
- **The checks stay ignorant of it.** `Check.run` returns a report; it does not learn to edit. The fix lives in `src/fix/`, which is where `suggest.ts` already is.
- **`--fix` is not a git tool** (SPEC § 8). It warns on a dirty file and proceeds. It does not stage, commit, or refuse.

## Acceptance

From `docs/spec/ROADMAP.md` § M3: applying `--fix` to a broken fixture leaves it byte-for-byte identical to its correct version, and running `--fix` twice is idempotent.

Plus, and this is the one that decides whether the milestone is honest:

- **The corpus is run with `--fix --dry-run` over all 66 repos, and every edit it would apply is read by hand.** The whole M1 hard floor is about this number, and until now it has been measured on one finding. Nothing is written to a corpus clone.
- The nine conditions of ADR-0006 hold, aggregate, after whatever `01` changes about ranges.

## Out of scope in this batch

- `--json`, `--github`, `--sarif`, the GIF, the Action, the site (M4).
- The four tier 2 checks (M5) — and no tier 2 check is ever autofixable (SPEC § 8).
- `--watch` (M6).
- `--init`, still. It writes a file, which makes it feel like M3's neighbour, but it writes a *new* one and shares nothing with this machinery. It is owed from M2 and still ownerless; give it its own ticket when somebody wants it.
- Making `link/broken`'s anchors or `frontmatter/invalid`'s values fixable. Both were deferred to "M3 with the corpus in hand" and ticket `07` is that reading. Deferred is not scheduled: the expected outcome is that both stay unfixable and the reason gets written down properly.

## Decisions taken

- [ADR-0006](../../docs/adr/0006-the-m1-precision-criterion.md): zero false positives among `fixable` findings, no rate modulating it. It gates this milestone the way it gated M1.
- [ADR-0007](../../docs/adr/0007-the-corpus-does-not-run-in-ci.md): the corpus is a local gate. `--fix` over somebody else's clone is a write to a checkout we do not own; `--dry-run` is the only form the corpus ever sees.
- [ADR-0001](../../docs/adr/0001-the-specification-lives-inside-the-repo.md): the `--dry-run` gap is fixed in the specification, not routed around in the code.
