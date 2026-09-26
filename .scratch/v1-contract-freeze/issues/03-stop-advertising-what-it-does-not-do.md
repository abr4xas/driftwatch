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

**Status:** done 2026-09-20. `--watch` out of the parser, three keys out of the loader, and the
frozen surface shrank by exactly those four lines. See §"What was built".

- [x] The help text no longer lists `--watch`
- [x] Passing `--watch` fails the way any unknown flag fails
- [x] The three unread keys are rejected by the config loader with its usual message
- [x] `--init` writes a config with none of them
- [x] The frozen surface shrinks by exactly those flags and keys, and by nothing else
- [x] The specification agrees with the help text afterwards

## What was built

`--watch` is out of `OPTIONS`, `CliArgs` and the help text. Passing it gets `unknown option:
--watch`, which is what "we do not have this flag" means; the bespoke refusal said the opposite,
that the flag exists and is coming.

`ignore`, `knownPaths` and `staleThreshold` are out of `Config`, out of `KNOWN_KEYS`, out of the
validator and out of what `--init` writes. A config setting one now gets the loader's ordinary
message: `unknown key 'staleThreshold'; the known ones are sources, checks, skillRoots`.

**The refusal list is kept, empty.** `UNIMPLEMENTED_BOOLEANS` held both flags and now holds
nothing, and that emptiness is the claim: nothing the tool accepts refuses to run. It is not
dead code kept for sentiment — it is where a flag added ahead of its milestone goes, and it is
what `CONTRACT.md` reads to record such a flag as refused rather than as working. Deleting it
would have cost the frozen surface a column and changed all fifteen remaining flag lines, which
is the opposite of "shrinks by exactly those flags and keys".

**Four documents carried the old story and now do not**: `SPEC.md` (the flag list, and § 7's two
worked examples, which set all three withdrawn keys), the guide's options table and its two
paragraphs, and the README's status line. `SPEC.md` § 7 gains the paragraph that says why they
went and when `staleThreshold` comes back.

**Two comments elsewhere pointed at `knownPaths` as the answer to something.**
`src/verify/generated.ts` said the built-in list of generated directories could be extended with
it, and `test/fixtures/no-git.ts` pinned a known false positive as waiting on it. Both now say
what is true: there is no such key, and the gitignored-file case has no fix scheduled.

### What the tests had to change

Four lookup-order cases used `staleThreshold` as an inert payload — a value to write into three
configs and see which one won. They use `skillRoots` now, which is additive and equally inert
for the purpose.

One test existed only to assert the three keys were carried and not acted on. It is replaced by
one asserting that a config setting nothing leaves every check running, which is the half of it
that was about the pipeline rather than about the keys. Three new cases assert the keys are
refused, and two assert `--init` does not mention them — the withdrawal is now pinned from both
ends.
