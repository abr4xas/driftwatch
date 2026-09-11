# 04: `--dry-run`, the diff, and the flag the specification forgot

**What to build:** the summarized diff `SPEC.md` § 8 promises, shown by `--fix` and shown *instead of writing* by `--fix --dry-run`. And the specification amendment that makes `--dry-run` a real flag.

**Blocked by:** `03`

**Status:** done

## The gap

`SPEC.md` § 8 says "With `--fix --dry-run`, shows the diff without writing." `SPEC.md` § 4's option list has no `--dry-run`, and neither does `src/cli/args.ts`, nor `--help`. The flag is specified in one section and absent from the contract in another.

[ADR-0001](../../../docs/adr/0001-the-specification-lives-inside-the-repo.md): the specification is primary source, and when the code and the document disagree the first step is deciding which is wrong. Here the document disagrees with *itself*, and § 8's version is the one with a reason behind it.

- [ ] Add `--dry-run` to `SPEC.md` § 4's option list, to `HELP`, and to `OPTIONS` in `args.ts`, in the same change that implements it.
- [ ] `--dry-run` without `--fix` is a user error with a clear message, not a silent no-op. There is nothing else in the tool it could modify.

## The diff

"Summarized", not unified. The reader wants to know what changed and where, and the surrounding three lines of an `AGENTS.md` carry no information.

- [ ] One entry per edit: the file, the line, the old fragment and the new one. The `pretty` reporter's existing vocabulary (`report/colors.ts`, the `✗` column layout) is the house style; a fix entry is a sibling of a finding line, not a new visual language.
- [ ] It groups by file, like the findings do, and it is ordered the same way — the sort in `run.ts` is already the contract for "the order a reader expects".
- [ ] Under `--dry-run` the wording is **conditional and unambiguous**: what *would* be written. A dry run that reads like a done deal is the kind of output somebody acts on twice.
- [ ] No emojis (`AGENTS.md` § Code conventions), and the color is `colors.ts`'s or it is nothing — the reporter already handles the non-TTY case and nothing new should relearn it.

## Tests

- [ ] `pretty.test.ts` gains the diff's snapshot, TTY and non-TTY.
- [ ] `--fix --dry-run` over a temp copy: the output names every edit **and the file on disk is unchanged**, asserted on bytes and not on mtime.
- [ ] `--dry-run` alone exits 2 with the message.
- [ ] The help text and `SPEC.md` § 4 agree, which `test/cli.test.ts` is already the place for.

## Out of scope

- A unified diff, a patch file, `--format json` for fixes. M4 owns the machine-readable output and will decide whether the fix plan belongs in it.

## Comments

Closed. 486 tests. `--dry-run` exists in `SPEC.md` § 4, in `--help`, in the parser and in the pipeline, and the diff prints under both forms.

### The gap was wider than the ticket knew

`SPEC.md` § 8 specified `--dry-run` and § 4's option list did not, which is what the ticket set out to fix. What it did not know is that a test had **built on the gap**: `test/args.test.ts` asserted "does not accept flags that are not in SPEC.md § 4" using `--dry-run` as its example. Implementing the flag left that test green for the wrong reason — a known flag throws too, just for a different reason — and it would have stayed green forever.

Its example is now a flag nobody plans to add, and the comment records what happened, because the same trap is waiting for any future test that picks a real-looking flag as its negative example.

### The dry run stops before the only irreversible step

`applyFixes` plans, builds the diff, and returns. It does not write and it does not re-run: nothing changed, so a second pass would report the same findings and paying for it to prove that is waste. The test asserts the file is untouched **on bytes**, not on mtime — for a dry run "unchanged" is not enough, it has to be untouched.

The exit code of a dry run is the ordinary one: the findings are all still there, so a repo whose only error was fixable still exits 1. That is right — nothing was fixed.

### No new symbol, and no `✓` on something that has not happened

`SPEC.md` § 5 allows three symbols and this adds none. An applied fix carries the green `✓` it has earned; a dry run's rows carry a space where the mark would be, and the section header reads `would fix` instead of `fixed`. A test asserts a dry run's output contains no `✓` at all, because a checkmark next to a change that has not been made is how somebody applies a fix twice.

The summary follows the same rule: `2 fixes would apply in 1 file` against `2 fixes applied in 1 file`, and `nothing to fix` against `nothing applied`.

### The columns line up, because the findings' do

The diff borrows `renderGroup`'s discipline: line numbers right-aligned, the replaced fragment padded to the widest in the file, `truncate` on both sides at the same 40 characters SPEC § 5 fixes. The arrows line up so the eye reads down the replacements. `--quiet` suppresses the diff with the summary, and the color test covers both directions.

### What was left out

A unified diff, a patch file, and any machine-readable form of the plan. M4 owns the output formats and will decide whether the fix plan belongs in the JSON contract; deciding it here would be deciding it twice.
