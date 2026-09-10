# 04: Inline ignore directives

**What to build:** `<!-- driftwatch-ignore -->` and its two siblings, so a document can say "this one is fine" without the heuristic that produced the finding having to get worse for everybody.

**Blocked by:** nothing

**Status:** done

`docs/spec/SPEC.md` § 7 § "Inline ignores" specifies the three forms and one rule: an ignore with no id applies to every check on that line, with an id only to that check. `docs/spec/ARCHITECTURE.md` puts the parser at `src/core/ignores.ts` and lists an `ignores` fixture that does not exist yet.

This blocks `05` through `08` on purpose, and `spec.md` § "Why the ignores land before the checks" is the argument: without an escape hatch, the only available answer to a false positive is to weaken a rule, which is how a tool ends up with heuristics nobody can explain.

- [x] Three forms: `<!-- driftwatch-ignore -->` (the line the comment is on), `<!-- driftwatch-ignore-next-line -->`, `<!-- driftwatch-ignore-file -->`. Each takes an optional list of check ids.
- [x] **Directives are read from mdast `html` nodes, never from the raw text.** A comment inside a code fence parses as `code`, not `html`, so an example of the syntax stays an example. This repo's own `SPEC.md` § 7 shows all three forms inside a fenced block; a regex over the file would arm them.
- [x] Ids match the same way `--only` and `--skip` match: exact, or a namespace prefix (`path` covers `path/missing`). Reuse the matcher, do not write a second one.
- [x] **An unknown id in a directive is not an error**, unlike an unknown id in `--only`. The asymmetry is deliberate and belongs in the code as a comment: a flag is typed by the person running the command now, a directive lives in a repo and is read by versions of driftwatch that have not shipped. An id we do not recognise silences nothing, which fails open — the safe direction.
- [x] Filtering happens on **findings**, after verification, not on claims before it. An ignore carrying a check id can only be honoured once the check that produced the finding is known, and doing it in one place keeps every check ignorant of the mechanism.
- [x] `-next-line` means the next line, literally. Not "the next line with content": a blank line in between silences the blank line. Strict and explainable beats convenient and fuzzy.
- [x] A bare `<!-- driftwatch-ignore -->` alone on its own line silences nothing, because there is no claim on that line. That is what `-next-line` is for.
- [x] `parseMarkdown` grows `html: readonly Span[]`. It already collects `inlineCode`, `fences` and `links` from the same visit.
- [x] The `ignores` fixture `ARCHITECTURE.md` § Testing lists: all three forms, with and without an id, plus the negative cases — the directive inside a fence, and an id that does not match the check that fired.
- [x] Unit tests for the parser itself: multiple ids in one directive, comma and whitespace separated, a malformed directive that is just an HTML comment, and a directive whose id names no check.

## Out of scope

- **Reporting a useless ignore** (a directive that silenced nothing). It is a real feature and eslint has it, but it is new finding surface, it needs its own check id and severity, and it would fire on every document written against a driftwatch that has more checks than the one installed. Its own ticket, after the checks exist.
- The `ignore` config key, which is about discovery, not findings, and shares nothing but the word.
- `--fix` interaction. An ignored finding produces no fix because it produces no finding; there is nothing to decide until M3.

## Corpus

A run **is** owed here, and the expectation is that nothing moves: no third-party repo can contain a driftwatch directive, because driftwatch is not published. If a snapshot changes, the parser is matching something it should not — which is the one outcome worth the clone.

## Comments

Closed 2026-09-10. 16 new tests, 293 in the suite. Corpus run in full: **49 repos, 177 sources, 15 findings, zero snapshots changed** — the outcome the ticket predicted, and the only one that would have been worth the 2.7 GB either way.

### mdast is the whole design, not an implementation detail

A regex over the raw text would have been ten lines and would have armed the examples in this repo's own `SPEC.md` § 7, which shows all three forms inside a fenced block. Taking the directives from `html` nodes makes that free: a comment inside a fence parses as `code` and never reaches the parser. `parseMarkdown` grew a `html: Span[]` collection in the visit it was already doing, so the cost is one array.

Two tests pin it: the fenced form and the indented-code form both parse to an empty index.

### The fixture caught the path disclaiming its own claim

The first draft used `src/planned/parser.ts` and produced **zero findings, including the three that were supposed to fire**. `planned` is a prose marker in `context-prose.ts`, and the marker is matched against a window that contains the claim — so the *path* suppressed itself. Everything moved to `src/lib/` and the reason is a comment in the fixture.

Not a defect: the prose rules were measured over 49 repos and a path literally named `planned/` is a fair thing to treat as hedged. But it is a trap for anyone writing a fixture, which is why it is written down where the next person will hit it.

### The asymmetry with `--only`, recorded in the code

An unknown id in `--only` is exit 2 (ticket `03`). An unknown id in a directive silences nothing and says nothing. A flag is typed by the person running the command now; a directive lives in someone's repo and is read by versions of driftwatch that have not shipped. Erroring would mean removing a check from the registry turns other people's documents into hard failures, and it would mean a repo has to know our registry to write a valid document.

It fails **open** — the direction a silencing mechanism should fail in. A misspelled form degrades the same way: `<!-- driftwatch-ignore-nextline -->` reads as a line directive for a check named `-nextline`, which matches nothing. There is a test for exactly that.

### `check-id.ts` exists because of a layering problem

`--only`/`--skip` live in `verify/selection.ts` and the ignores live in `core/ignores.ts`, and core must not import from verify. Rather than a backwards import or a second copy of the matcher, the four-line rule moved to `src/core/check-id.ts`. `ARCHITECTURE.md`'s module tree gained the line.

### Considered and rejected: reporting how many findings were silenced

The empty selection in ticket `03` is refused because printing `no drift` after running nothing is an accident the user did not declare. An ignore is the opposite: an explicit statement in the document that this claim is fine. Silencing it quietly is honouring it, not hiding it. eslint's default is the same.

A **useless** ignore — one that silenced nothing — is the case actually worth reporting, and it is out of scope here for the reason the ticket gives: it needs its own check id, and it would fire on every document written against a driftwatch with more checks than the one installed.

### Lint

No errors. Warnings went 9 to 11, both new ones in `src/parse/markdown.ts`: `parseMarkdown` crossed from 68 to 75 lines and its visit callback crossed 50. Handed to ticket `02` rather than fixed here — that ticket rules on whether these thresholds survive at all, and refactoring the most delicate parser in the project as a side effect of the ignores ticket would be waste if the answer is to raise the limit. `run()` did get its extraction, because it was one line over and the fix was a function that wanted to exist anyway.
