# 05: The published types can be named

**What to build:** every shape reachable through the package's public API becomes importable by
name.

Three are reachable and unnameable today. A consumer reading the result of a run can see each
finding and cannot write a function that takes one. A consumer passing options can see the sink
field and cannot name its type. The shapes are already public — they travel through exported
types — so exporting the names adds no surface at all. It makes the surface usable, and it makes
the frozen surface honest about what was already promised.

This is worth doing before the freeze rather than after, because adding an export later is a
minor and nobody would object; what would be wrong is freezing a contract that a TypeScript
consumer cannot actually write against and calling it stable.

**Blocked by:** 01 (the frozen surface)

**Status:** ready-for-agent

- [ ] A consumer can import the finding, skipped-source and discard-sink types by name
- [ ] Their shapes are unchanged — this ticket renames nothing and moves nothing
- [ ] The frozen surface grows by exactly those names
- [ ] The built type declarations carry them
