# 01: Config file, with the `sources` key first

**What to build:** driftwatch reads an optional config file, and the `sources` key lets a repo declare context files that discovery does not find on its own.

**Blocked by:** nothing

**Status:** ready-for-agent

`docs/spec/SPEC.md` § 7 already specifies the file and its shape. This ticket does not redesign it; it implements the smallest slice that is coherent, and `sources` is first because there is a repo asking for it today: this one.

- [ ] Lookup, in order: `driftwatch.config.ts`, `.js`, `.json`, then the `driftwatch` key in `package.json`. The first one found wins and the search stops.
- [ ] `--config <path>` forces a file, `--no-config` ignores every one. Both currently throw `notYetImplemented` in `src/cli/main.ts`; remove them from that list.
- [ ] A `--config` pointing at a nonexistent file is a user error: clear message, exit 2, no stack trace.
- [ ] `defineConfig` exported from `src/index.ts`, typed, so a `.ts` config gets completion.
- [ ] `jiti` loaded **lazily**, only when a `.ts` or `.js` config actually exists. A repo with no config, or with a `.json` one, must not pay for it — the cold-start budget is 80 ms and `AGENTS.md` § Dependencies makes this explicit.
- [ ] The `sources` key: paths added to what `discoverSources` found, deduplicated against it, each one classified and read like any other source.
- [ ] An entry in `sources` that does not exist is a user error, not a silent skip. Declaring a source and having it disappear is exactly the drift this tool exists to report.
- [ ] Invalid config (not an object, unknown key, wrong type for a known key) fails with the key named and exit 2. An unknown key is an error and not a warning: a typo in `ignore` silently disabling the ignore list is worse than a red run.
- [ ] Fixture with a config, fixture with no config, and a test that `--no-config` really ignores a present one.
- [ ] The other keys in SPEC § 7 (`ignore`, `checks`, `knownPaths`, `staleThreshold`) are **out of scope here** and get their own tickets. Parse them, do not act on them, and do not reject them as unknown.

## What this unblocks in this repo

`docs/` is not an agent context file, so `classifySource` does not reach it, and it should not: `docs/` in someone else's repo is documentation for humans. In *this* repo it is different, because `AGENTS.md` opens by ordering the agent to read the four documents in `docs/spec/`. That makes them agent context in fact, and the config key is the mechanism the spec already provides for saying so.

Once this lands, add a `driftwatch.config.ts` here with `sources` covering `docs/` and the ADRs, and the CI step that already runs driftwatch over this repo starts covering them. Today it audits `AGENTS.md` and nothing else, so the relative links in `docs/` and in the ADRs are unverified — they were checked by hand with a throwaway script when ADR-0007 was written, and nothing sustains that.

Whether `sources` accepts globs is a real question and not settled here. SPEC § 7 shows a literal path (`'docs/agent-notes.md'`), and this repo would want `docs/**/*.md`. Matching against the already-built repo index rather than walking the filesystem is the cheap way in, since `ignore` is already a dependency. Decide it in the ticket, record it if it changes the spec.

## Comments

Opened after the discussion that produced [ADR-0007](../../../docs/adr/0007-the-corpus-does-not-run-in-ci.md). The alternative considered was a plain test that resolves every relative link in the repo's markdown — cheaper, no product surface, and it would work today. It was not chosen as a replacement because it verifies the repo while leaving the tool unable to do the same job for anyone else, and dogfooding a specified feature is worth more than a private check. If this ticket stalls, that test is the stopgap.

`--init` (write a commented `driftwatch.config.ts`) depends on this and is a separate ticket.
