# 02: Source discovery and the `pretty` reporter

**What to build:** running `driftwatch` with no arguments in this very repo, the tool finds its agent context files, lists them, and closes with the summary line. It verifies nothing yet, so it exits 0. This is the first moment the tool looks like a tool.

**Blocked by:** 01

**Status:** done

- [x] The seven source patterns of `docs/spec/SPEC.md` § 2 are discovered, with the right `kind`
- [x] `.gitignore` is respected; `node_modules`, `dist`, `build`, `.next`, `vendor` and `target` are never walked into
- [x] The root resolves to the directory holding `.git`, falling back to the cwd if there is no repo
- [x] Each source records its own `baseDir`, even though nothing resolves against it yet
- [x] Positional arguments narrow the scope: `driftwatch AGENTS.md docs/` audits only that
- [x] The summary line respects the `docs/spec/SPEC.md` § 5 format, no emojis, with `✓` when there are no problems
- [x] Colors are turned off if `NO_COLOR` is set or if stdout is not a TTY
- [x] **M0 acceptance:** on this repo, the run lists the sources and exits 0 in under 300 ms, measured and noted in the ticket

## Comments

**M0 acceptance measured:** on this repo, `node ./dist/cli.js` lists `AGENTS.md` as `agents-md`, exits 0, and the pipeline takes ~18 ms. The whole process, Node startup included, takes ~50 ms. The budget was 300 ms.

Two design decisions worth recording:

- **The source listing self-destructs.** The M0 criterion asks the tool to "list the sources it found", but SPEC § 5 says that with no problems the output is a single line (`✓ 14 files · no drift`). Instead of picking one, the reporter lists the sources only while the check registry is empty. As soon as ticket 05 registers `path/missing`, the block disappears without anyone deleting it, and a test pins that.
- **The anchored patterns are accepted at any depth.** SPEC § 2 writes `.claude/skills/**/SKILL.md` from the root, but a monorepo with one `.claude/` per package is normal, and a `SKILL.md` under `.claude/skills` is a live skill wherever it sits. The false positive risk is nil: the rule got more permissive about *which files it audits*, not about what it reports.

`--quiet` is now implemented and leaves the to-do list. `--strict` stays on it: it only changes something once warnings exist, and warnings are tier 2, which is M5. Accepting it today would promise too much.

### Later note, on closing ticket 05

The source listing was deleted, not self-destructed. The idea was that the block would disappear on its own when the first check was registered, and the mechanism (`result.checks.length === 0`) worked, but leaving it would have been dead code the moment `path/missing` entered the registry. It was removed along with its two tests, and the M0 acceptance test was rewritten to keep what still holds from the criterion: the time budget, and that a repo with no drift exits 0.
