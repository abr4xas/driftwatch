# 06: The specification and the code say the same thing

**What to build:** two corrections to the specification, so that neither document is a trap.

The specification documents a flag for ungrouped output that no code has ever known about — it
is in neither the parser nor the help text. It comes out. A specification is primary source in
this repository, so a flag described there and absent everywhere else is the more dangerous half
of the disagreement.

And the JSON section's worked example omits a key the reporter has always emitted, while the
prose two paragraphs down mentions it. The example gains the key. This is cosmetic and it is
exactly the kind of thing the freeze is supposed to stop: once the contract is frozen, an
example that disagrees with the emitter is a documented contract nobody can rely on.

**Blocked by:** None (can start immediately)

**Status:** done 2026-09-20. Both corrections made, and the example is now held to the emitter
by a test rather than by attention. See §"What was built".

- [x] The specification no longer describes a flag that does not exist
- [x] The JSON example matches what the reporter emits, key for key
- [x] The documentation link check still passes
- [x] No behaviour changes

## What was built

**`--no-group` is gone from `SPEC.md`** § 5. It appeared in one parenthesis, describing the
format of a header path "when `--no-group`" — a flag no parser, no help text and no test has ever
known about. The sentence it was in is true without it.

**The JSON example gained two keys, not one.** `endLine` is the one the ticket names, described
in the prose two paragraphs below and missing from the example since the key was added. Checking
key for key turned up a second: the top-level `skipped`, which the reporter has always emitted
and which § 6 only showed in the subsection about skipped sources. Both are in the example now,
in the order the reporter writes them.

**The example is held to the emitter.** The ticket asked for the correction and not for a test,
and the correction on its own would have been the same kind of promise that produced the defect:
a document that agrees with the code today because somebody checked once. `test/formats.test.ts`
now parses the fenced block out of § 6 and compares its top-level, `summary` and per-finding key
sets against a real `--json` run. Keys only — the values in the example are illustrative and are
meant to be.

Verified by deleting `endLine` from the example again: the test fails naming it.

No behaviour changed, and the frozen surface did not move, which is the right answer for a
ticket that only edited a document.
