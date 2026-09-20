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

**Status:** ready-for-agent

- [ ] The ADR is numbered next in sequence and follows the existing format
- [ ] It describes the surface as it actually is after the preceding tickets
- [ ] It states the version policy as a table
- [ ] It records why the precision measurement is decoupled from releases, not only that it is
- [ ] It resolves the apparent contradiction with the config ADR
- [ ] The roadmap points at it
- [ ] The documentation link check passes
