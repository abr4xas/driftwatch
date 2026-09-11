# 06: The acceptance fixture — byte-identical, and idempotent

**What to build:** the two assertions `docs/spec/ROADMAP.md` § M3 accepts the milestone on, as tests that would fail if the fix were subtly wrong.

**Blocked by:** `03`

**Status:** ready-for-agent

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
