# 07: ADR — what `1.0.0` asserts

**What to build:** the decision record, written once the surface it describes is the surface
that exists.

It has to carry four things a future reader will not reconstruct:

**That `1.0.0` is a claim about compatibility and not about quality**, and that the precision
measurement neither gates nor delays a release. Condition 6 of the precision criterion is unmet,
at 58 of 66 against a 90% bar, and it stays unmet and stays published. The reasoning matters more
than the rule: tying the version to that number manufactures pressure to close false-positive
classes in order to move it, which is the one move the classification document forbids and which
two tickets have already refused.

**What is frozen** — the eight surfaces, listed, because "the public API is stable" without a
list is a promise nobody can check.

**The version policy**: a new tier 1 check or a new skills root is a major; a new tier 2 check,
a narrowed check or a tuned discard rule is a minor; raising the Node floor is a major. The lower
half is free rather than disciplined: a tier 2 check defaults to warning and the exit code
ignores warnings unless asked, so it cannot turn a green run red by construction. Say so — that
is why the rule is affordable.

**Why `--migrate-config` is gone** and where the route went, so that ADR-0013 and this one do not
appear to contradict each other.

Two smaller things it should settle in passing: the JSON's own version field is independent of
the package version, and the source of the precision number is the classification document, with
everything else derived and held by a test.

The roadmap gets one line pointing here.

**Blocked by:** 02, 03, 04, 05, 06

**Status:** done 2026-09-20. [ADR-0014](../../../docs/adr/0014-what-1-0-0-asserts.md). See
§"What was built".

- [x] The ADR is numbered next in sequence and follows the existing format
- [x] It describes the surface as it actually is after the preceding tickets
- [x] It states the version policy as a table
- [x] It records why the precision measurement is decoupled from releases, not only that it is
- [x] It resolves the apparent contradiction with the config ADR
- [x] The roadmap points at it
- [x] The documentation link check passes

## What was built

`docs/adr/0014-what-1-0-0-asserts.md`, next in sequence and in the existing format. It carries
the four things the ticket named, and the numbers in it are the ones the snapshots read today
rather than the ones the ticket quoted from memory: **58 of 66, 87.9%**, with the validation
group alone at 29 of 32, 90.6%.

The version policy is a table, and the sentence that makes it affordable is next to it: the
lower half is free **by construction**, because a tier 2 check defaults to warning and the exit
code ignores warnings unless asked, so it cannot turn a green run red. The upper half is priced
with its own example — `0.5.0` would have been a major under it, and the next skills root is
`2.0.0`.

§"Why precision does not gate the version" is three arguments rather than a rule, because the
rule is the part that gets reversed: tying the version to condition 6 manufactures pressure to
reclassify findings, precision is a measurement and a version is not, and the criterion was
chosen to survive failing for six months.

ADR-0013's status line now links here, and §"Why `--migrate-config` is gone" says plainly that
the two do not contradict each other — that ADR promised a route, not a flag, and the route is
alive as a version.

`ROADMAP.md` gains a section above "What a release is, by hand" pointing at both the ADR and
`CONTRACT.md`.

§"What is lost" is deliberately not empty. A tier 1 check that ought to default to error now
waits for a major or ships as a warning it does not deserve; a staged skills root was considered
and rejected; and some readers will take `1.0.0` as a statement about precision, which is the
one thing it is not.

Both self-audits are clean: 5 files with the repo config, 34 with the documentation one.
