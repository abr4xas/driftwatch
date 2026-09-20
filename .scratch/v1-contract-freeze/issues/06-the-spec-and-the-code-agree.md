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

**Status:** ready-for-agent

- [ ] The specification no longer describes a flag that does not exist
- [ ] The JSON example matches what the reporter emits, key for key
- [ ] The documentation link check still passes
- [ ] No behaviour changes
