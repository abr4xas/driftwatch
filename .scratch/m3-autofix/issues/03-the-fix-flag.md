# 03: `--fix` on the command line

**What to build:** the flag that writes. It applies the plan, reports what it applied, and exits on what remains.

**Blocked by:** `02`

**Status:** ready-for-agent

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
