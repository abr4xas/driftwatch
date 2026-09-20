# 01: The frozen surface, generated and pinned

**What to build:** the artifact that makes breaking the contract a diff somebody has to accept
rather than a thing somebody notices. It lists everything `1.0.0` freezes — the exit codes and
their meanings, the check ids, the CLI flags, the `--json` top-level, `summary` and per-finding
keys, the other output formats' shapes, the config's accepted keys, the names the package
exports, and the Node floor. A script emits it, the artifact is committed, and a test asserts
the committed copy is what the script emits now.

It captures the surface **as it stands today, defects included**: the flags that are advertised
and refuse to run, the config keys nothing reads, the types that cannot be named. Every ticket
after this one is verified by the diff it makes here, so this one must go in before them and
must not tidy anything on the way past.

The JSON key sets come from a real run over a temporary repository rather than from reading the
reporter, so the artifact records what is emitted and not what was intended. Everything else is
derived in process from the source modules: the suite does not depend on a build step.

Prior art worth reading first: the corpus bookkeeping test, which holds a document to the
snapshots it describes, and the site data test, which holds a page's prose to a generated
artifact. Both exist because an artifact nothing recomputes is an artifact that drifts.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A script regenerates the artifact and writes nothing else
- [ ] The artifact is committed and human-readable, so a diff of it can be reviewed line by line
- [ ] A test fails when the artifact and the code disagree, naming what moved
- [ ] The artifact covers all eight surfaces the spec lists
- [ ] The JSON key sets are observed from a run, not transcribed
- [ ] Today's defects appear in it unaltered
- [ ] The test suite passes with no other behaviour changed
