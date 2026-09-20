# 02: `--strict` does what `--help` says

**What to build:** warnings count toward the exit code when the caller asks for it. Today the
flag is advertised in the help text, parsed, and then refused at runtime with a "not yet
implemented" failure — so a reader who follows the documentation gets a broken build.

The decision it feeds is already implemented and already tested directly: the exit-code function
takes the flag and adds warnings to the failing count. What stands in the way is the entry
point's refusal list, which exists as a to-do the suite watches — a ticket that implements a
flag removes its entry, and the test demanding the failure goes red until it is updated. That is
the design working, not collateral damage.

No check reports a warning today, because every registered check defaults to error. That is fine
and is the point of doing this now: the flag becomes correct before tier 2 arrives, rather than
arriving with it.

**Blocked by:** None (can start immediately)

**Status:** done 2026-09-20. One entry off the refusal list, and the documents that called it
unimplemented corrected. See §"What was built".

- [x] A run with warnings and `--strict` exits non-zero
- [x] A run with warnings and without `--strict` exits zero
- [x] A run with errors exits non-zero either way
- [x] `--strict` no longer produces a tool failure
- [x] The help text and the specification still describe it the same way
- [x] The test that demanded the failure is updated rather than deleted wholesale

## What was built

`--strict` left `UNIMPLEMENTED_BOOLEANS` in `src/cli/main.ts` and nothing else in the pipeline
changed: `exitCodeFor` has taken the flag and added warnings to the failing count since M0, and
`test/exit-codes.test.ts` has covered that decision directly all along. The refusal list was the
only thing between the flag and the behaviour its help line promised.

**The warning had to be conjured, because no check reports one.** All five default to error, so
the only warning observable today is one a config asks for — `checks: { path/missing: warning }`.
That is what the new cases in `test/cli.test.ts` build, and it is enough: what is under test is
the exit code's decision, not a check's severity.

One of those cases needed a second assertion to be worth anything. "A warning without `--strict`
exits 0" is also what a run that found nothing exits, and the two mean opposite things — so it
also asserts the report names the path and counts the warning.

**Two documents called it unimplemented and now do not**: `docs/guide/usage.md` (which also
gains the row it never had in the options table, and the exit-code note that `0` may carry
warnings unless the flag is passed) and `README.md`. `SPEC.md` needed no edit; it had described
the flag correctly since the beginning, which is the half of the disagreement that was right.

The frozen surface moved by exactly one line: `--strict` from `refused at runtime` to
`implemented`.
