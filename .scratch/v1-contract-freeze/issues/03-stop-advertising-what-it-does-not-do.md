# 03: The surface stops advertising what it does not do

**What to build:** two withdrawals that share one idea — advertised and broken is worse than
absent.

`--watch` is advertised in the help text, parsed, and refuses to run. It belongs to M6 and
nothing here implements it, so it comes out of both the help text and the parser. A caller who
passes it should get the ordinary unknown-flag failure, not a bespoke one, because that is what
"we do not have this flag" means.

The config accepts, validates and carries three keys that no part of the pipeline reads. They
come out of the accepted set and out of what `--init` writes into a new project. The loader
already refuses an unknown key loudly and on purpose — a typo that silently disables something
is worse than a red run — so removing them means a config that sets one now fails, which is the
correct answer for a key that was never doing anything.

One of the three returns when the check that wants it lands. Under the version policy that is a
minor, so nothing is being made expensive.

**Blocked by:** 01 (the frozen surface)

**Status:** ready-for-agent

- [ ] The help text no longer lists `--watch`
- [ ] Passing `--watch` fails the way any unknown flag fails
- [ ] The three unread keys are rejected by the config loader with its usual message
- [ ] `--init` writes a config with none of them
- [ ] The frozen surface shrinks by exactly those flags and keys, and by nothing else
- [ ] The specification agrees with the help text afterwards
