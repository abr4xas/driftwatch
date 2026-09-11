# 03: `--fix` on the command line

**What to build:** the flag that writes. It applies the plan, reports what it applied, and exits on what remains.

**Blocked by:** `02`

**Status:** done

`--fix` currently parses and throws `notYetImplemented` from the `UNIMPLEMENTED_BOOLEANS` list in `src/cli/main.ts`. That list is documented as "a to-do list the test suite watches: when a ticket implements a flag, it deletes it from here and the test that demanded exit 2 fails." This is that ticket for `fix`; leave `watch`, `init` and `strict` in place.

## What it does

- [ ] Runs the pipeline, plans the fixes, writes each source that has a plan **once**, and reports.
- [ ] Writes with the same encoding it read. `Source.content` came from disk as UTF-8; it goes back as UTF-8 and nothing else changes.
- [ ] A source with no applicable edit is **not** rewritten. Not even to identical bytes: touching a file's mtime for nothing makes every watcher in the user's editor fire.

## The exit code question

`SPEC.md` § 4: "With `--fix`, the exit code reflects what **remains** after fixing." Two implementations, and the ticket picks one:

- **Re-run the pipeline after writing.** Honest by construction — the remaining findings are the ones a fresh run reports — and it proves the fix worked, which is ticket `06`'s idempotence property being asserted on every real invocation. It roughly doubles the runtime of a `--fix` run, against a 500 ms budget for a run that just did disk writes.
- **Subtract what was applied.** Fast, and wrong the moment a fix changes what another check sees.

Take the re-run, and make the second run's result the one that is printed and counted. If the budget turns out not to survive it, say so with a number rather than switching quietly.

- [ ] **The re-run must find strictly fewer findings.** If it does not, something applied an edit that did not fix anything; that is worth a loud failure in the tests, and not worth a runtime check in the tool.

## Aliases

`Source.aliases` holds byte-identical copies — commonly a `CLAUDE.md` that is a copy of `AGENTS.md`. They are audited once so the same problem is not reported twice. Fixing one and not the other makes them stop being copies, which is a silent change to a fact the user was relying on.

- [ ] **Apply the same edits to every alias**, since the content is identical by definition and so are the offsets. Report it as one fix on the audited path, naming the aliases it also wrote — the reporter already knows how to name them.
- [ ] If that turns out to be wrong for a reason the implementation finds, the fallback is to fix neither and say why in the output. Silently fixing one is the only outcome that is not acceptable.

## Output

- [ ] The count of what was applied, and what remains, in the existing summary line's voice. `report/pretty.ts:84` already prints "N fixable with --fix"; after a fix run that line is replaced by what happened, not printed alongside it.
- [ ] `--quiet` suppresses the summary here as it does elsewhere. It does not suppress the diff, which is `04`'s to define.

## Tests

- [ ] Delete `fix` from `UNIMPLEMENTED_BOOLEANS` and watch the test that demanded exit 2 fail, then update it. That test is the tripwire working.
- [ ] An end-to-end run over a temp copy of a fixture: the file changes, the exit code is `0` where the only error was fixable, and `1` where something unfixable remains.
- [ ] A run where nothing is fixable writes no file at all (assert on mtime, not on content).
- [ ] The alias case, with both files asserted.

## Out of scope

- `--dry-run` and the diff (`04`).
- The git warning (`05`).

## Comments

Closed. `--fix` writes. 477 tests, four of them new in `test/cli.test.ts`, and the tripwire worked exactly as its comment said it would: deleting `fix` from `UNIMPLEMENTED_BOOLEANS` failed the test that demanded exit 2, which is how the to-do list stays honest.

### The re-run was taken, and it is cheap in the case that matters

`SPEC.md` § 4's "the exit code reflects what remains" is a second full run, in `fix/session.ts`. The alternative — subtracting what was applied — is wrong the moment a fix changes what another check sees, and this way every real invocation exercises the idempotence ticket `06` asserts.

The budget worry did not materialise, because the expensive case does not arise: **nothing written means nothing changed**, so a run with no applicable fix keeps the first result and pays nothing. Only a run that really edited files pays for a second pass, and that user just asked for a write.

### Aliases are written, and `realpath` is what separates the two kinds

`Source.aliases` holds two different things and they need opposite treatment. A byte-identical `CLAUDE.md` beside an `AGENTS.md` is a **second file**: not writing it makes the two stop being copies, silently, after the reporter has just told the user they were. A symlink alias is the *same* file under another name, and writing through it would rewrite bytes that are already right.

`fix/write.ts` tells them apart with `realpath`, which is what `collapseSymlinks` used to decide they were aliases in the first place. The test asserts both files come out fixed.

### The summary replaces the "fixable" line rather than joining it

Telling somebody who has just run `--fix` that "1 fixable with --fix" is the output saying it did not do what it was asked. After a fix run the line reads `1 fix applied in 1 file`, or `nothing applied` when no fix was placeable, and the old line is suppressed. A test asserts the string `with --fix` never appears in a `--fix` run's output.

`--quiet` suppresses it with the rest of the summary, since it lives inside `summary()`.

### Where the code went

`fix/write.ts` is the only module in `src/fix/` that touches the disk — everything upstream is pure — and `fix/session.ts` holds what a fix run *is*, so the second-run decision is a paragraph somebody reads rather than a branch inside the CLI. `main()` grew a sibling, `audit()`, and both are back under the 50-line lint limit; `fix/session.ts` is behind its own dynamic import, so a run without `--fix` never loads it.
