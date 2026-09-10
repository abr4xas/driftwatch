# 01: Config file, with the `sources` key first

**What to build:** driftwatch reads an optional config file, and the `sources` key lets a repo declare context files that discovery does not find on its own.

**Blocked by:** nothing

**Status:** done

`docs/spec/SPEC.md` § 7 already specifies the file and its shape. This ticket does not redesign it; it implements the smallest slice that is coherent, and `sources` is first because there is a repo asking for it today: this one.

- [x] Lookup, in order: `driftwatch.config.ts`, `.js`, `.json`, then the `driftwatch` key in `package.json`. The first one found wins and the search stops.
- [x] `--config <path>` forces a file, `--no-config` ignores every one. Both currently throw `notYetImplemented` in `src/cli/main.ts`; remove them from that list.
- [x] A `--config` pointing at a nonexistent file is a user error: clear message, exit 2, no stack trace.
- [x] `defineConfig` exported from `src/index.ts`, typed, so a `.ts` config gets completion.
- [x] `jiti` loaded **lazily**, only when a `.ts` or `.js` config actually exists. A repo with no config, or with a `.json` one, must not pay for it — the cold-start budget is 80 ms and `AGENTS.md` § Dependencies makes this explicit.
- [x] The `sources` key: paths added to what `discoverSources` found, deduplicated against it, each one classified and read like any other source.
- [x] An entry in `sources` that does not exist is a user error, not a silent skip. Declaring a source and having it disappear is exactly the drift this tool exists to report.
- [x] Invalid config (not an object, unknown key, wrong type for a known key) fails with the key named and exit 2. An unknown key is an error and not a warning: a typo in `ignore` silently disabling the ignore list is worse than a red run.
- [x] Fixture with a config, fixture with no config, and a test that `--no-config` really ignores a present one.
- [x] The other keys in SPEC § 7 (`ignore`, `checks`, `knownPaths`, `staleThreshold`) are **out of scope here** and get their own tickets. Parse them, do not act on them, and do not reject them as unknown.

## What this unblocks in this repo

`docs/` is not an agent context file, so `classifySource` does not reach it, and it should not: `docs/` in someone else's repo is documentation for humans. In *this* repo it is different, because `AGENTS.md` opens by ordering the agent to read the four documents in `docs/spec/`. That makes them agent context in fact, and the config key is the mechanism the spec already provides for saying so.

Once this lands, add a `driftwatch.config.ts` here with `sources` covering `docs/` and the ADRs, and the CI step that already runs driftwatch over this repo starts covering them. Today it audits `AGENTS.md` and nothing else, so the relative links in `docs/` and in the ADRs are unverified — they were checked by hand with a throwaway script when ADR-0007 was written, and nothing sustains that.

Whether `sources` accepts globs is a real question and not settled here. SPEC § 7 shows a literal path (`'docs/agent-notes.md'`), and this repo would want `docs/**/*.md`. Matching against the already-built repo index rather than walking the filesystem is the cheap way in, since `ignore` is already a dependency. Decide it in the ticket, record it if it changes the spec.

## Comments

Opened after the discussion that produced [ADR-0007](../../../docs/adr/0007-the-corpus-does-not-run-in-ci.md). The alternative considered was a plain test that resolves every relative link in the repo's markdown — cheaper, no product surface, and it would work today. It was not chosen as a replacement because it verifies the repo while leaving the tool unable to do the same job for anyone else, and dogfooding a specified feature is worth more than a private check. If this ticket stalls, that test is the stopgap.

`--init` (write a commented `driftwatch.config.ts`) depends on this and is a separate ticket.

## Comments

Closed 2026-09-10. 34 new tests, 244 in the suite.

### The premise of "What this unblocks in this repo" was wrong

The plan was a `driftwatch.config.ts` with `sources` covering `docs/`. It was written, run, and produced **43 findings, all 43 false positives**, for a structural reason no tuning reaches: a specification and a decision record *argue*, and arguing means quoting paths — from other repositories, from hypothetical ones, from the reader's, from this repo's future. `docs/adr/0004-a-bare-directory-is-not-a-claim.md` alone contributed 15, because listing paths that do not exist is its entire subject.

That is [ADR-0008](../../../docs/adr/0008-a-specification-is-not-an-agent-context-file.md). What shipped instead is `sources: ['docs/agents/**/*.md']`: three files the agent is genuinely pointed at from `AGENTS.md` § "Agent skills", zero findings, and the coverage was proven non-vacuous by renaming `docs/adr/` and watching `docs/agents/domain.md` go red.

The feature is better validated by having had its first real result **rejected** than it would have been by a passing fixture.

Worth recording separately: of the 43, **zero were `fixable`**, and the two that carried a suggestion had it correctly withheld. Both would have rewritten an ADR's quoted evidence to point at this repo's own files. The common-prefix scoring from ticket 09 is what stopped it.

### Decisions taken that the ticket left open

**`sources` accepts globs**, matched against the repo index with `ignore` — the same matcher the no-git fallback uses, imported only when a pattern actually contains a metacharacter. Matching the index rather than walking the disk means `.gitignore` is respected for free and a pattern cannot reach outside the repo. `SPEC.md` § 7's example stays valid: a literal path is just a pattern with no metacharacters. The spec needed no change.

A pattern that matches **nothing** is a user error, like a literal that does not exist. A typo in a glob is the same mistake as a typo in a path.

**No `jiti`.** The ticket asked for it lazily; it turned out to be unnecessary. Node strips the types itself, unflagged since 22.18 and 23.6, and the floor is 24 — so a `.ts` config loads with a plain `await import()`. `AGENTS.md` § Dependencies was corrected, since it named `jiti` explicitly. The cost is that a config using syntax type stripping cannot erase fails; nothing in the spec needs that. **Node 24 is what CI verifies**, and the `.ts` config test is what verifies it there.

### Two things noted, not fixed

`RunOptions.paths` is required, so a library caller has to write `paths: []` to mean "everything". The tests carry a local `audit()` helper to avoid the noise. Making it optional is a small API improvement and belongs to whichever ticket touches `RunOptions` next.

The corpus was **not** run in full. The argument for why it cannot have moved: for a repo with no config, `loadConfig` returns `{}`, `config.sources` is `undefined`, and `discoverSources` takes the same path as before — and no third-party repo can have a driftwatch config, because driftwatch is not published. Two small repos were checked as evidence (`railwayapp/cli` → `ok (0)`, `github/spec-kit` → `ok (1)`) and the clones deleted. This is reasoning plus a spot check, not the full measurement.
