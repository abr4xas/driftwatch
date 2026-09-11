# 06: The acceptance fixture — byte-identical, and idempotent

**What to build:** the two assertions `docs/spec/ROADMAP.md` § M3 accepts the milestone on, as tests that would fail if the fix were subtly wrong.

**Blocked by:** `03`

**Status:** done

> **Acceptance:** applying `--fix` to a broken fixture leaves it byte-for-byte identical to its correct version. Running `--fix` twice is idempotent.

## The fixture

- [ ] A new `test/fixtures/fixable/` holding a `before/` and an `after/` tree. `after/` is the hand-written truth, not a generated snapshot: a snapshot recorded from the implementation asserts that the code does what it does.
- [ ] It covers **all three** autofixes — a path with a single namesake, a mistyped script, a `SKILL.md` whose `name` disagrees with its directory — because ticket `01` showed the three have three different range behaviours.
- [ ] And the spellings that must survive: a `./`-prefixed path, a link with an anchor, a file with CRLF endings, a file with no trailing newline, a frontmatter key whose value is longer than the key.
- [ ] And at least one **unfixable** finding in the same file as a fixable one, so the test proves the fix lands without disturbing the finding next to it.
- [ ] The test copies `before/` to a temp directory and fixes there. Nothing under `test/fixtures/` is ever written by a test.

## Idempotence, read honestly

The property is not "the second write produces the same bytes" — a second run that rewrites the same bytes for the same reason means the first fix did not make the claim true. The property is:

- [ ] **The second run finds nothing left to fix**, and writes no file.
- [ ] The bytes after run two equal the bytes after run one, which follows, and is asserted anyway because it is free.
- [ ] A third assertion worth its line: **the second run's findings are a strict subset of the first's.** A fix that silences one finding by creating another is the failure mode neither of the two ROADMAP sentences catches.

## What this fixture is not

It is not a precision test. `false-positive-traps` stays at zero and the corpus is still the only false-positive measurement there is (`AGENTS.md` § Verification); a green fixture proves the mechanism, not the judgement. Ticket `07` is the judgement.

## Tests

- [ ] The two acceptance assertions above, as `test/fix.test.ts` or as an addition to `fixtures.test.ts` — whichever keeps the temp-directory helper in one place. `test/helpers/` already exists.
- [ ] `false-positive-traps` still at zero, which should be untouched but is cheap to keep asserting.

## Comments

Closed. Six tests in `test/fix-acceptance.test.ts`, 496 in the suite. Both ROADMAP sentences hold, and so does the third assertion this ticket added to them.

### The fixture is data, not a `before/` and `after/` tree on disk

The ticket asked for `test/fixtures/fixable/before/` and `after/`. It was written as data in the test file instead, for the reason `helpers/fixture.ts` already gives about every other fixture in this repo: **a committed `AGENTS.md` full of paths that are broken on purpose would be audited by driftwatch run against its own repo.** The M3 fixture is worse than the others in that respect, because its whole point is a document whose claims are false.

What the ticket was protecting is kept: `AFTER` is hand-written, never a recorded snapshot, so it asserts what a maintainer would have written rather than what the code produced. And the test copies into a temp directory, so nothing under `test/` is written by a test.

It also stays out of `test/fixtures/`, where `fixtures.test.ts` asserts every `.ts` file in the directory is a `Fixture` with expected findings. A fix fixture is a different shape and would have broken that registry.

### Everything the three range behaviours needed

One repo covers all of it: a `./`-prefixed path, a link with an `#anchor` that has to survive, a mistyped script, a `SKILL.md` whose `name` is far longer than its key, a file with CRLF endings throughout, a file with no trailing newline, and an **unfixable** finding sitting in the same document as three fixable ones.

The link is the case worth naming: `./docs/old/notes.md#usage` becomes `./docs/guides/notes.md#usage`, and after the fix `link/broken` resolves the anchor against the new target and reports nothing. Two checks agreeing about one line, which is what ticket `05` of M2 set up.

### A guard against the fixture going quiet

The first test asserts the broken version produces **five** fixable findings across all three checks. Without it, a narrowed rule or a withdrawn suggestion could stop the fixture covering a check and every other assertion here would still pass — a fixture that fixes nothing is byte-identical to its correct version too.

### Idempotence is asserted on the mtime, and on a subset

The second run must write **nothing**, so the assertion is on the mtime and not only on the bytes: a second run that rewrites the same bytes for the same reason means the first fix did not make the claim true, and comparing content alone cannot tell the two apart.

The third assertion is the one neither ROADMAP sentence catches: what remains is a **strict subset** of what was there. A fix that silences one finding by creating another satisfies "fewer findings" and "same bytes twice" and is still wrong.
