# 02: `fix/apply.ts` — planning and applying edits by offset

**What to build:** the pure core of `--fix`: findings in, a plan of edits out, and a function that turns a plan plus a file's content into new content. No I/O, no process, no CLI.

**Blocked by:** `01`

**Status:** ready-for-agent

`docs/spec/ROADMAP.md` § M3 names the file: `fix/apply.ts`, "editing by offset ranges, preserving formatting".

## The shape

- [ ] `planFixes(findings) -> FixPlan[]`, one plan per **source**, each holding its edits sorted by offset. Grouping by source is what makes a write one write.
- [ ] `applyEdits(content, edits) -> string`, pure. Walk the edits **in reverse offset order** so earlier offsets stay valid, or build the result by slicing between them; either is fine, and the second reads better.
- [ ] The rest of the file is copied byte for byte. No trailing-newline normalization, no line-ending translation, no re-serialization of the frontmatter. A YAML round trip would reformat somebody's document and is exactly what "preserving formatting" forbids.

## What a plan refuses to contain

Each one is a real way to corrupt a file, and each one gets a test:

- [ ] **Overlapping ranges.** Two edits touching the same bytes means something upstream produced two findings for one claim. Drop both and say so, rather than picking a winner: the shape is a bug, and a `--fix` that resolves it quietly hides the bug and edits on a guess.
- [ ] **A suggestion that is not `fixable`.** The threshold lives in `suggest.ts` and is not re-litigated here; `fixable === true` is the only question this module asks.
- [ ] **An empty replacement**, or one equal to what is already there. The second is not an error, it is a no-op, and it must not be counted as an applied fix — that number is what the user reads to decide whether to look at the diff.
- [ ] **A range outside the content**, which can only come from a stale source. Cheap to assert, and the assertion is what keeps a future refactor from writing at the wrong offset.

## Why not a diff library

The edits are a handful of single-line replacements whose ranges and replacement strings are already known. `AGENTS.md` § Dependencies asks for the check before adding anything to the main path; this is under forty lines of `slice`. The *rendering* of a diff is ticket `04`'s problem and is also not a library.

## Tests

- [ ] `applyEdits` with zero, one and several edits, including two on the same line.
- [ ] A file with CRLF endings comes out with CRLF endings.
- [ ] A file with no trailing newline comes out with no trailing newline.
- [ ] Overlap is refused, and the refusal is visible to the caller rather than silent.
- [ ] Multi-byte content: an edit after an emoji lands where it should. JavaScript offsets are UTF-16 code units and so are mdast's, so this should pass — the test is there to catch the day something starts counting bytes.

## Out of scope

- Writing to disk, the CLI flag, the diff, the exit code. All of `03`.
- Deciding ranges (`01`).
