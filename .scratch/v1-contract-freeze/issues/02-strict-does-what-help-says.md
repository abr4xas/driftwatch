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

**Status:** ready-for-agent

- [ ] A run with warnings and `--strict` exits non-zero
- [ ] A run with warnings and without `--strict` exits zero
- [ ] A run with errors exits non-zero either way
- [ ] `--strict` no longer produces a tool failure
- [ ] The help text and the specification still describe it the same way
- [ ] The test that demanded the failure is updated rather than deleted wholesale
