# 04: `--dry-run`, the diff, and the flag the specification forgot

**What to build:** the summarized diff `SPEC.md` § 8 promises, shown by `--fix` and shown *instead of writing* by `--fix --dry-run`. And the specification amendment that makes `--dry-run` a real flag.

**Blocked by:** `03`

**Status:** ready-for-agent

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
