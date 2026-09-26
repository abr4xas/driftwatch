# The contract 1.0.0 freezes

**Status: ready-for-agent.** Decided with Angel on 2026-09-20 by interview; every decision below
was put to him and answered. Nothing here is open.

## Problem Statement

The package is `0.5.0` and reads as unfinished to anyone deciding whether to depend on it. No
document in this repository says what `1.0.0` would mean, so the question has no answer to
consult and gets re-argued every time it comes up.

Worse, it has been re-argued from the wrong premise. Because this project measures itself
against ADR-0006's nine conditions, "are we at 1.0?" has been read as "are the conditions met?"
— and condition 6 is not met, at 58 of 66 = 87.9% against a 90% bar. Tying the version to that
number manufactures pressure to close two false-positive classes **in order to move it**, which
is the one move `test/corpus/CLASSIFICATION.md` names as forbidden and which tickets `20` and
`21` have already refused twice, once by saying no to the cheapest repository in the corpus.

Meanwhile the surface that `1.0.0` would actually freeze is not honest enough to freeze:

- `--strict` and `--watch` are advertised in `--help`, parsed, and exit 2 with "not yet
  implemented".
- `SPEC.md` § 4 documents a `--no-group` flag that no code knows about.
- The config accepts, validates and carries three keys that nothing reads.
- `Finding`, `SkippedSource` and `DiscardSink` are reachable through the published types and are
  not exported, so a TypeScript consumer can read those shapes and cannot name them.
- `SPEC.md` § 6's JSON example omits a key the reporter emits.

Freezing that is promising it.

## Solution

**`1.0.0` is a claim about compatibility, not about quality.** It says the public surface stops
moving without a major. It says nothing about precision, and precision never gates a release
again: the number is published every round, whatever it reads.

Before the freeze, the surface is made honest — the six defects above are closed and
`--migrate-config` is withdrawn. All of it ships in one release, because `0.x → 1.0.0` is the
last time removing something is free.

The decision is recorded in an ADR, and the promise is enforced by a **frozen surface**: a
generated artifact listing everything `1.0.0` freezes, committed, and held to the code by a
test. A change to any of it shows up as a diff somebody has to accept, which is what "you may
not remove this without a major" means in practice.

## User Stories

1. As someone evaluating driftwatch, I want the version number to tell me whether the tool's
   interface is settled, so that I can decide whether to depend on it without reading the git
   history.
2. As someone evaluating driftwatch, I want the precision measurement published whether or not
   it meets the project's own bar, so that I can judge the tool on the number rather than on the
   fact that a release happened.
3. As a maintainer, I want the version number not to depend on the precision measurement, so
   that no release ever creates pressure to derive a rule in order to move a number.
4. As a future reader of this repository, I want the reasoning for that separation written down,
   so that I do not reopen it in six months.
5. As a CI operator, I want `--strict` to do what `--help` says it does, so that a flag I read
   about does not fail my build with exit 2.
6. As a CI operator, I want warnings not to fail my build unless I ask, so that new checks can
   ship without flipping gates I did not change.
7. As a CI operator, I want a documented exit code contract, so that my workflow can branch on
   the result.
8. As a CI operator, I want the check ids to be stable, so that the `--skip` list in my config
   keeps meaning what it meant.
9. As a CI operator pinning `abr4xas/driftwatch@v1.0.0`, I want the action's inputs to be
   stable, so that the pin is worth having.
10. As a consumer, I want a flag that is not implemented to be absent rather than advertised, so
    that `--help` is a list of things that work.
11. As a consumer, I want the config to reject a key it will not act on, so that a key I set is
    a key that does something.
12. As a consumer, I want `driftwatch --help` to match the specification, so that neither one is
    a trap.
13. As a TypeScript consumer, I want every shape reachable through the published API to be
    nameable, so that I can write a function that takes a finding.
14. As a TypeScript consumer, I want the JSON contract documented exactly as it is emitted, so
    that I can parse it without running the tool to find out.
15. As a consumer on an old version with a module config, I want a documented route off it, so
    that upgrading to `1.0.0` is not a dead end.
16. As a maintainer, I want the surface that is frozen listed in one artifact, so that
    "did we break the contract?" is a diff rather than a judgement.
17. As a maintainer, I want that artifact generated rather than typed, so that it cannot drift
    from the code the way `site/corpus-data.js` did.
18. As a maintainer, I want a rule for which changes need a major, so that the question is
    answered before the change rather than during the release.
19. As a maintainer, I want adding a tier 2 check to be a minor, so that the roadmap's remaining
    checks do not each cost a major.
20. As a maintainer, I want adding a tier 1 check or a skills root to be a major, so that a
    consumer's green run cannot turn red in a minor.
21. As a maintainer, I want the JSON's own `version` field to be independent of the package
    version, so that the two ones do not get confused for each other.
22. As a maintainer, I want the Node floor treated as part of the contract, so that raising it
    cannot quietly break an install.
23. As a maintainer, I want the cleanup and the freeze in one release, so that the release notes
    tell the whole story rather than half of it twice.
24. As a maintainer, I want the criterion to be one I would accept failing for six months, so
    that it is not a criterion designed around today's numbers.
25. As a maintainer, I want the canonical location of the precision number named, so that the
    four places that publish it cannot disagree again.

## Implementation Decisions

**What `1.0.0` asserts.** Compatibility only. The precision measurement neither gates nor
delays a release, and the ADR says so in those words. Condition 6 of ADR-0006 as amended by
ADR-0009 stays unmet and stays published.

**What is frozen.** Eight surfaces, named explicitly rather than left to "the public API":

1. Exit codes and their meanings.
2. Check ids.
3. CLI flag names and their meanings.
4. The `--json` contract: top-level keys, `summary` keys, per-finding keys.
5. `--format github` and `--format sarif` output shapes.
6. The config file format: accepted keys and the rejection of unknown ones.
7. The names exported from the package entry point.
8. The Node floor in `engines`.

**Version policy after `1.0.0`.**

| change | version |
|---|---|
| a new tier 1 check (defaults to error) | major |
| a new skills root | major |
| a new tier 2 check (defaults to warning) | minor |
| narrowing a check, tuning a discard rule | minor |
| raising the Node floor | major |
| adding an optional field to an existing output | minor |

The bottom half is free because the severity path already exists end to end: a tier 2 check
defaults to warning, and the exit code ignores warnings unless `--strict`. A tier 2 check
therefore cannot turn a green run red, by construction rather than by care.

**The surface is made honest first**, in the same release:

- `--strict` is implemented. The value is already threaded into the exit-code decision; what
  stands in the way is the refusal list the CLI entry point keeps.
- `--watch` is removed from both the help text and the parser until M6 owns it. Advertised and
  broken is worse than absent.
- `--no-group` is deleted from `SPEC.md`.
- `ignore`, `knownPaths` and `staleThreshold` are removed from the config's accepted keys and
  from what `--init` writes. `staleThreshold` returns when `stale/churn` does, which is a minor
  under the table above.
- `Finding`, `SkippedSource` and `DiscardSink` are exported. Their shapes are already public
  through `RunResult` and `RunOptions`; exporting them adds no surface, it makes the surface
  nameable.
- `SPEC.md` § 6's example gains the key the reporter emits.
- `--migrate-config` is withdrawn, and the ADR records the route — install the last `0.x`,
  migrate, upgrade — because ADR-0013 shipped that flag in the same commit that withdrew module
  configs, on the argument that a withdrawn format with no route off it moves a cost onto users.
  A reader who finds ADR-0013 and then finds no flag must not conclude it was lost.

**`--no-tier2` is frozen as it stands.** It filters tier 2 checks correctly and there are none
to filter, which is a correct answer rather than a broken flag. It starts meaning something the
day a tier 2 check exists, with no change.

**The JSON's `version` field stays independent** of the package version, and the ADR says so.
They are two clocks and their both reading `1` is a coincidence.

**The frozen surface is generated.** A script emits it; the artifact is committed; a test
asserts the committed copy is what the script emits now. This is the pattern the repository
already uses for the corpus snapshots and for the site's data, and it is used here for the same
reason: an artifact nothing recomputes is an artifact that drifts, which is what happened to the
site's precision figure.

**One release.** The cleanup and the freeze are `1.0.0`. A `0.6.0` whose whole changelog is
removals, followed by a `1.0.0` whose changelog is "the number changed", tells the story in two
halves.

**The precision number's source is `test/corpus/CLASSIFICATION.md`**, and everything else that
publishes it is derived and held by a test. The ADR names it.

## Testing Decisions

**A good test here asserts what a consumer can observe** — the text `--help` prints, the exit
code a run returns, the keys a JSON document carries, the names the package exports — and never
which module produced them. The whole point of this feature is that the observable surface stops
moving; a test that reaches past it to an internal is testing the wrong thing and will have to be
rewritten by the first refactor that the freeze is supposed to permit.

**One new seam: the frozen surface.** It is derived in process from the source modules rather
than from the built artifact, because that is where the rest of the suite lives and it keeps the
tests independent of a build step. What it loses — visibility of what the tarball actually
carries — is already covered by the packaging check. The JSON key sets are taken from a real run
over a temporary repository rather than by reading the reporter, so the artifact records what is
emitted rather than what is intended.

**Four existing seams carry the rest**, and no new ones are introduced:

- the CLI entry point, already driven end to end with an argv, an IO pair and a working
  directory, for `--strict` working and for the withdrawn flags being gone
- the exit-code function, already covered directly, for warnings and `--strict`
- the config loader, for the removed keys being rejected with the message the loader promises
- the documentation link check, for the specification edits not leaving a dangling reference

**Prior art**, all three of which are the same shape as what this needs: the corpus bookkeeping
test holds a document to the snapshots it describes; the site data test holds a page's prose to
a generated artifact; the documentation link test holds every file that advertises a release to
the version in the manifest. The third one is worth reading before writing the new test: it
carries a comment about a guard that checks four files and leaves out the fifth, and it was
right.

**The test that demands exit 2 for an unimplemented flag has to lose its `--strict` case.** That
test is the to-do list; a ticket that implements a flag deletes its entry and the test goes red
until it is updated. That is the design, not an accident.

## Out of Scope

- **Condition 6 and the precision measurement.** They do not gate this release and are not
  touched. 87.9% stays published.
- **Tier 2 (M5).** Confirmed additive: no shape already published has to change for the four
  tier 2 checks to land later. It is out of this work entirely.
- **`--watch` (M6).** Removed from the surface here, implemented there.
- **Growing the certification corpus.** Unrelated and still deferred.
- **Machinery for staging a new skills root** — shipping it off by default for a minor, on at
  the next major. Considered and rejected in favour of the simpler rule: a new root is a major.
- **A floating `v1` tag for the action.** ROADMAP § M4 already records why the tags here are
  exact, and `1.0.0` does not change that.

## Further Notes

**What the policy costs, stated with the price on.** Under the table above, `0.5.0` would have
been a major: it added `.github/skills/` and two more skills roots, and repositories that had
changed nothing began to report. The next skills root is `2.0.0`. This was put to Angel with
that example and confirmed deliberately.

**The criterion has to survive failing.** It was chosen under the constraint that it would be
acceptable for it to go unmet for six months, so that it is not a criterion written around the
numbers of the day it was written — the mistake ADR-0009 names when it refuses to write a
replacement that today's figures would pass.

**Why there is an ADR at all**, given that this repository's rule is that an ADR records a
decision the code obeys: the decision is hard to reverse, surprising without its context, and the
result of a real trade-off with alternatives that were considered and rejected. And the code does
obey it — the frozen surface is the obedience, and the test is what checks it.
