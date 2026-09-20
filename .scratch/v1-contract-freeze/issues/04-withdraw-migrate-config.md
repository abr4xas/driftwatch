# 04: `--migrate-config` is withdrawn, with the route written down

**What to build:** the flag comes off the frozen surface, and the way off a module config gets
documented in its place.

This is separate from the other withdrawals because of what it undoes. ADR-0013 withdrew `.ts`,
`.js` and `.mjs` configs **and shipped this flag in the same commit**, on the stated argument
that a withdrawn format with no route off it moves a cost onto users. That flag has existed in
exactly one published release. Removing it without saying anything recreates the cost that ADR
paid to avoid, and a future reader who finds ADR-0013 promising a route and then finds no flag
will reasonably conclude it was lost.

So the route survives the flag: install the last `0.x`, migrate there, then upgrade. It is
recorded where someone hitting the wall will look — the loader already fails loudly on a module
config, and that failure is the right place to say where to go.

**Blocked by:** 01 (the frozen surface)

**Status:** ready-for-agent

- [ ] The flag is gone from the help text, the parser and the specification
- [ ] A module config still fails loudly, and the failure now names the route off it
- [ ] The route is written somewhere a reader of ADR-0013 will find it
- [ ] The frozen surface shrinks by that flag and nothing else
- [ ] The tests that covered the flag are removed rather than left asserting a hole
