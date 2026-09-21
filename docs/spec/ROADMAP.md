# driftwatch — Roadmap

Every milestone has verifiable acceptance criteria. We do not move to the next one without closing them.

---

## M0 — Executable skeleton
**Goal:** `npx @abr4xas/driftwatch` runs and does nothing useful, but it runs.

- TS/ESM repo, build with tsdown, `bin` pointing at the compiled CLI
- `--help`, `--version`, exit codes 0/1/2
- Source discovery (`CLAUDE.md`, `AGENTS.md`, `SKILL.md`) respecting `.gitignore`
- `pretty` reporter with the closing summary
- CI: lint + typecheck + test on Node 24 and 25 (see ADR-0002)

**Acceptance:** on this very repo, `driftwatch` lists the sources it found and exits 0 in under 300 ms.

---

## M1 — The check that justifies the project
**Goal:** `path/missing` working with real precision.

- mdast parsing with positions
- Path extractor with the 7 discard rules from `ARCHITECTURE.md`
- `RepoIndex` built with `git ls-files`, falling back to glob
- Basename suggestions with confidence scoring
- `false-positive-traps` fixture green with **zero findings**

**Acceptance:** see [ADR-0006](../adr/0006-the-m1-precision-criterion.md), which replaces the original "< 5% false positives" criterion. That criterion was measured and turned out not to be measurable: a precise tool produces few findings, and with 9 findings a single false positive is already 11%.

The current criterion has four parts, and all four hold or M1 does not close:

- **Hard floor:** the `false-positive-traps` fixture at zero, and **zero false positives among the `fixable` findings**. A wrong autofix is not noise, it is corruption of the document.
- **Shape of a run:** median false positives per repo 0, 90th percentile ≤ 1, none above 2.
- **Usefulness:** at least **90% of repos producing zero false positives**, over the whole corpus and over the validation group alone, and ≥ 1 true positive in that group so silence is not enough to pass. This replaced an aggregate-precision ratio on 2026-09-10; see [ADR-0009](../adr/0009-precision-is-counted-in-quiet-repos.md).
- **Methodology:** a corpus of ≥20 repos with ≥8 in a validation group that was not inspected. Classifying its findings is the measurement; opening the repo to see what it discarded contaminates it.

If it does not hold, we do not advance — we tune the heuristics, or we accept that the check does not get there and say so.

**Certified on 2026-09-09**: nine of nine conditions, over a corpus of 34 repos with 8 in validation. The record and the classification of every finding are in `test/corpus/CLASSIFICATION.md`.

**Re-measured on 2026-09-10 over three rounds, and the certification does not survive a larger sample.** Ten repos were added to the validation group, taking it from 8 to 18. Validation precision went **100% → 75% → 60% → 37.5%**, and one repo produced 3 false positives against a per-repo cap of 2. **Seven of nine conditions: 5 and 6 are unmet.**

Nothing regressed in the code. The 100% had rested on three observations from a single root cause, and every enlargement moved the number the same way, which is what the original caveat said would decide it.

**The four fixes it exposed were then applied and the whole corpus re-run.** Findings went 17 → 14, false positives 6 → 3, and **true positives stayed at 11**: three findings disappeared across 44 repos and all three were the targets. Validation recovered to **3 of 5 = 60%**, aggregate to 78.6%, and condition 5 holds again. **Eight of nine conditions.**

The corpus is 44 repos with 18 in validation. **41 of the 44 produce no false positive at all, and zero findings have ever been wrongly autofixable.**

**Condition 6 was then rewritten**, because four rounds showed the old one could not be met by improving the tool: fixing a validation false positive moves that repo to calibration under condition 9, deleting the observation that lowered the ratio. [ADR-0009](../adr/0009-precision-is-counted-in-quiet-repos.md) withdraws the ratio and counts **quiet repos** instead — repos producing zero false positives — because that denominator grows with the corpus, and because a user has one repo and never experiences an aggregate.

Against the new condition, when it was written: 93.2% over the corpus and 88.89% over validation, unmet by 1.1 points — deliberately, since a replacement tuned to pass that day would have been the same mistake in a new coat. It predicted that closing the last fixable class would take the corpus figure to 95.5%.

**That class was then closed and the prediction held to the decimal.** A conditional-mood rule, scoped to the sentence holding the claim, suppressed exactly one finding across all 44 repos and cost no true positives. The corpus now reads **42 of 44 = 95.5%**, and validation **15 of 15 = 100%**.

**The replacements were then added — three owed, five given — and the debt is paid.** The corpus is 49 repos with 20 in validation, 21 findings, 14 true and 7 false. Against the rewritten condition 6: **46 of 49 = 93.9%** over the corpus and **19 of 20 = 95%** over validation, both above the bar, on 11 validation findings rather than the three-from-one-cause the original certification rested on.

Condition 5 then failed on one repo, `mattpocock/course-video-manager`, with five false positives against a cap of two — all five from one cause, a skill file documenting a *different* project with every path written relative to an external root. That split was the design working: the quiet-repo rate measures how many users would see noise, the per-repo cap how bad it gets for the unlucky one.

**Both classes behind it were closed and the corpus re-run.** One snapshot changed, from 6 findings to 1: the five false positives gone, the true one kept, nothing moved across the other 48 repos.

**Condition 6 is unmet again, and this time nobody noticed for six rounds.** The corpus is 66 repos with 32 in validation, 37 findings, 27 true and 10 false. Against condition 6: **58 of 66 = 87.9%** over the whole corpus, below the bar, and **29 of 32 = 90.6%** over validation, above it. **Eight of nine conditions.**

Nothing regressed in the code, which is exactly why nothing caught it. Round eighteen widened discovery to the other skills roots and deliberately left three classes of false positive open — two synthesised anchors and a generated directory in `vercel/next.js` and `remix-run/react-router`, a path in the reader's own project, a runtime log in `block/goose`. Three previously quiet repositories joined the count. The criterion table carried the old figure forward by hand, and the number was never divided again.

The numerator grew while the denominator stood still. [ADR-0009](../adr/0009-precision-is-counted-in-quiet-repos.md) records the same failure arriving from the other direction and its conclusion covers both.

**What was decided, on 2026-09-19:** record it and do not chase it. Restoring the bar needs two classes closed rather than one, and a rule derived in order to move a number is the mistake this criterion exists to prevent — ADR-0009 already admitted 90% was chosen with the numbers in view, and that admission survives once. The placeholder class is worth closing on its own evidence and is being weighed that way in its own ticket; if it earns its place the number recovers by itself, and nobody will have tuned to the test. `test/corpus/CLASSIFICATION.md` § "When a condition fails" is the rule for next time, written now so it is not written after the next number.

**All nine conditions are met, on the fourth measurement.** Rounds thirteen to sixteen (2026-09-10) added fifteen validation repos to give condition 6 the finding mass M2 had promised it, broke conditions 2, 5 and 6 in the process, and closed four false-positive classes to repair them: another agent tool's configuration root, an index placeholder, a dependency protocol specifier, and a version-or-date template.

The corpus is **66 repos with 32 in validation, 26 findings, 20 true and 6 false**. Condition 6 reads 61 of 66 = **92.4%** over the corpus and 29 of 32 = **90.6%** over validation, on **12 validation findings** rather than the three-from-one-cause the original certification rested on. No repo carries more than 2 false positives, and the single autofixable finding is correct. `test/corpus/CLASSIFICATION.md` has every finding classified by hand and a ledger of the five still open. That sentence was also true on 2026-09-09 and did not survive fifteen more repositories, so what matters is what changed: the corpus went from 34 repos to 49 and the validation group from 8 to 19, and the conditions now rest on those rather than on three findings from a single root cause.

An eighth round then fixed the last recorded defect: `emdash`'s drift was reported twice through a symlinked `.claude/CLAUDE.md`. Findings 16 to 15, with no detection lost — those 16 covered 15 distinct drift events and now 15 findings cover the same 15.

Two replacement validation repos are owed, for `course-video-manager` and `emdash`. Unlike the moves in round five both leave **clean**, fixed rather than removed, so no figure depends on their departure. `CLASSIFICATION.md` has all eight rounds, including the two where a fix regressed something and the corpus caught it.

This is the milestone that decides whether the project is worth it. Everything else is incremental.

---

## M2 — The other tier 1 checks — **closed 2026-09-10**
- `script/missing` resolving the nearest `package.json` (monorepo)
- `skill/frontmatter` complete
- `link/broken` including anchors
- `frontmatter/invalid`
- Inline ignore directives
- Config file + `--only` / `--skip` / `--no-tier2`

**Acceptance:** the `monorepo` fixture passes. All four checks have their own fixture with positive and negative cases.

**Closed with all six delivered and the acceptance met.** The `monorepo` fixture carries a script claim in both directions; each check has its own fixture — `scripts`, `no-manifest`, `anchors`, `frontmatter`, `skills` — with the negative cases that matter more, and `false-positive-traps` is still at zero with four classes' worth of new traps in it. Verification at close: 398 tests, `pnpm build`, `--help`, the tool over its own repo and over `docs/` (both silent), and the full corpus green at 66 repos.

Two things M2 also owed and paid:

- **Condition 6 was re-measured, not inherited.** The milestone promised it once the validation group carried ~10 findings. Its four checks did not get it there — both findings they produced landed in calibration repos — so fifteen validation repos were added over rounds thirteen to sixteen. The group now carries **12 findings** against the three the M1 certification rested on, and all nine conditions hold: 92.4% of the corpus and 90.6% of validation produce no false positive, no repo above 2, and the one autofixable finding is correct.
- **Four false-positive classes were closed** on the way, three of which broke a condition first: another agent tool's configuration root, an index placeholder, a dependency protocol specifier, and a version-or-date template. `test/corpus/CLASSIFICATION.md` rounds 13–16 have every finding classified by hand.

**Not delivered, deliberately:** `--init` (SPEC § 4), which M2's line does not ask for and which was left out rather than squeezed in; and ticket `02`, the lint rule audit, which was always release-preparation work and is now the first item of it.

---

## M3 — Autofix — **closed 2026-09-11**
- `fix/apply.ts` editing by offset ranges, preserving formatting
- `--fix`, `--fix --dry-run` with a diff
- Only applies on confidence > 0.8 and a single candidate

**Acceptance:** applying `--fix` to a broken fixture leaves it byte-for-byte identical to its correct version. Running `--fix` twice is idempotent.

**Closed with all three delivered and the acceptance met**, in seven tickets. 496 tests, the corpus green at 66 repos with no snapshot moved, and the tool silent over its own repo and over `docs/`.

**What the milestone was actually built around** is a trap the ticket that found it is named after. `Claim.offset` says it "enables --fix without reformatting", and that is true for one of the three autofixes: a `skill/frontmatter` claim spans the **key** token, so replacing it writes `my-skill: wrong-thing`, and a path claim from a Markdown link spans the whole url, so replacing it deletes the `#anchor`. `src/fix/range.ts` owns the answer now, the way `verify/path-claim.ts` owns the verdict on a path claim, and every branch of it checks the bytes it is about to overwrite before writing them.

Three decisions worth carrying forward:

- **The exit code comes from a second full run**, not from subtracting what was applied. Subtracting goes wrong the moment a fix changes what another check sees. It is also free in the common case: nothing written means nothing changed, so only a run that really edited files pays for the second pass.
- **A relative path in a nested source is never rewritten.** A nested document writes half its paths against its own directory and half against the repo root with no syntactic signal separating them — the largest precision correction in the project. Reporting can accept both readings because that only costs detections; writing cannot, because picking one rewrites the path into the other. The corpus refused zero fixes to this rule, which is the absence of evidence that it is expensive rather than evidence that it is cheap.
- **`--dry-run` became a real flag.** SPEC § 8 specified it and § 4's option list did not, so it existed in one section and in no code. Fixing the specification rather than routing around it also exposed a test that had been built on the gap: `args.test.ts` used `--dry-run` as its example of a flag *outside* the specification, and implementing it left that test green for the wrong reason.

**The measurement, read honestly.** `pnpm corpus --fixes` is a new mode that plans every fix across the 66 repos, prints the line before and the line after, and writes nothing. It found **one edit, none refused**, and it is correct: `fireSeqSearch`'s `CLAUDE.md` is one directory out of date and the rewrite preserves the backticks, the list marker and the sentence around it. So ADR-0006's hard floor is met at the level of the **edit** and not only of the finding — on a sample of one. The fix machinery is proven correct once and unproven at scale, and the way to move that is more repositories, not more rules. `test/corpus/CLASSIFICATION.md` round 17 has it.

**The two deferred fixability decisions were closed rather than inherited.** `link/broken`'s anchors stay unfixable: the corpus holds no such finding, and the argument never rested on it. `frontmatter/invalid`'s values stay unfixable, and the corpus made the case concrete — the only such finding in 66 repos is an unquoted `description:` whose text already contains double quotes, so quoting it would mean escaping them, and a `--fix` that escapes is a YAML serializer.

**Not delivered, deliberately:** `--init`, still owed from M2 and still ownerless; it writes a *new* file and shares nothing with this machinery. And no machine-readable form of the fix plan — M4 owns the output formats and will decide whether it belongs in the JSON contract.

---

## M4 — Presentable
What turns a tool that works into a project someone adopts.

- README with a ≤15 s GIF at the very top, before any text
- `--json`, `--github`, `--sarif` formats — **done 2026-09-11**
- Published GitHub Action (`driftwatch/action@v1`) — **done 2026-09-11, as `abr4xas/driftwatch` pinned to an exact release tag.** The `@v1` this line writes never existed: the tags have been exact since `v0.1.0`, and a major-version tag would have to be force-pushed on every release.
- One-page static site with the demo and the GIF — **done 2026-09-11, and it replaced the GIF rather than carrying one.** The page shows the real output and the real corpus figures, generated from the snapshots by `pnpm site-data` and held to the page by a test. A GIF of a terminal is a picture of a measurement; the page publishes the measurement, and when the corpus moved under it the second time, a test said so.
- Published to npm with provenance (`npm publish --provenance`) — **a state, not a schedule.** § "Suggested release order" puts the first publish at M2's close, and `.github/workflows/release.yml` already publishes with provenance, so M4 inherits this rather than waiting for it. What M4 adds is the audience, not the package.
- MIT license (done: `LICENSE`)

**Acceptance:** someone who has never seen the project understands what it does in under 15 seconds, looking only at the README.

**First batch closed 2026-09-11: the three formats, and the documentation split.** Taken before the GIF, the site and the Action deliberately — three of the four remaining deliverables are about *showing* the tool, and a GIF of a `pretty` reporter shows what already existed. The Action in particular was unwritable until `github` and `sarif` existed: without them it pipes a terminal report into a log nobody expands.

`--json` is the stable contract of § 6, with two additions § 6 now documents: `endLine`, without which `endColumn` is ambiguous across a line break, and the fix plan M3 deferred to this milestone. The plan is asymmetric — a per-finding byte range only under `--fix --dry-run`, because after a real fix the findings come from a second run over files that were already rewritten. `--format github` emits annotations and nothing else; `--format sarif` carries `rules[]` built from the checks' own descriptions, which is the half that makes an alert readable a month later.

**The README went from 213 lines to 82**, and nothing was deleted: `docs/guide/` now holds the checks, the flags, the fixes, the formats and the precision argument, in five documents. `docs/spec/`, `docs/adr/` and `docs/agents/` did not move — they are primary source and a different audience. `test/docs-links.test.ts` keeps the split from rotting, and the `link/broken` run over the repo's own documents **stopped being vacuous**: M2 added it noting that no document here wrote an anchor link, and the guide is the day somebody did.

The corpus was re-run and is green at 66 repos with no snapshot moved — 26 findings, 20 true. A batch about output formats that moved a detection would have been a batch with a bug in it.

**Second batch closed 2026-09-11: the GitHub Action.** It lives in this repository as `action.yml` at the root, so it is used as `abr4xas/driftwatch@v1.0.0` rather than from the `driftwatch/action` organisation this line names — that organisation does not exist, and a separate repository would need its own tags plus a hand-maintained answer to "which version of the package does `@v1` run". Here the tag that selects the action selects the `package.json` beside it, and pinning the action pins the tool.

**The documented ref is an exact release tag, and there is no floating `v0` or `v1`.** A major-version tag is the Marketplace convention, and it is convention rather than requirement: it buys a caller upgrades without an edit, and costs a force-pushed tag on every release — the one operation in this repo that rewrites something already published. The tags here have been exact since `v0.1.0`, and the documentation now matches that instead of promising a ref nobody created. What a reader loses is automatic upgrades; what they gain is a workflow file that says which version it runs.

It defaults to `--format github`, writes a SARIF file on request and **does not upload it**: uploading from inside would make every caller grant `security-events: write`, including the ones that only want annotations. `fail-on-drift: false` exists because an advisory annotation and a merge gate want opposite things — and it silences a finding, never a failure, since exit 2 is the tool breaking rather than finding something.

Two things it had to get right that are not visible in the YAML: every input reaches bash through `env:` rather than `${{ }}` inside a `run:`, because an interpolated input is a shell injection in an action anybody can call; and `npx --package` names the binary separately, because `npx <path.tgz>` reads the argument as a command and dies with "Permission denied". A CI job runs the action from `./` against a tarball built from the commit, so it fails on the commit that breaks it rather than on the tag that publishes it.

**The action did not work until the next publish.** `0.1.1` had no `--format github`; the flag parsed and refused. `0.2.0` is the release that paid that debt, published 2026-09-12 — and it is the first release where `version` defaults to something the action can actually use.

**Still open in M4:** the GIF, and with it the launch post § "Suggested release order" schedules. Plus the acceptance criterion itself, which nobody who has read this repository can certify.

The site landed on 2026-09-11 and this line went on saying it had not for nine days, which is the exact shape of the thing the tool reports — in the roadmap of the tool. `path/missing` cannot catch it: the claim is about the state of the work, not about a path.

---

## `--init` — **done 2026-09-11**

Not a milestone. `SPEC.md` § 4 has listed it since the beginning, `--help` has advertised it since M0, and M2, M3 and both M4 batches each deferred it for a reason that was right at the time: it depends on the config file, it is not what any of their lines asked for, and it shares nothing with the machinery they built. Five specs called it ownerless, which is an absence of a status rather than one. [`.scratch/init-flag/`](../../.scratch/init-flag/spec.md) is where it stopped being that.

**The template only presents as working what actually works.** `sources` and `checks` reach `src/run.ts`; `ignore`, `knownPaths` and `staleThreshold` are validated by the loader and read by nobody, so `--init` writes them commented out, each naming what makes it real. A generated file claiming all five would be a document promising more than the code delivers, produced by the tool whose entire subject is that.

**It imports the `Config` type rather than calling `defineConfig`.** Found by running it, not by reading it: the advertised way to use this tool is `npx`, which installs nothing in the target repo, so a generated config calling `defineConfig` fails to load with "could not be loaded" the first time it is used. A type import is erased by the same type stripping that loads the file, so the config works installed or not. `defineConfig` stayed exported for repos that do have the package.

Both halves of that paragraph are now historical: [ADR-0013](../adr/0013-a-config-is-data-not-a-program.md) withdrew the module formats on 2026-09-18, and `defineConfig` left the public API with them. `--init` writing YAML is what survived, and the reasoning above is why.

It refuses rather than overwrites, and the refusal covers every shape the loader looks for — including a `driftwatch` key in `package.json`, where there is no config *file* and it still counts. Writing a second config beside an existing one would create exactly the case `loadConfig` deliberately refuses to merge, and the one that loses would be the one it did not write.

**Reopened the next day, and the answer was the format.** The flag wrote `driftwatch.config.ts` into any repository, and driftwatch audits Go, Rust and Python ones as readily as Node ones — a `.ts` file at the root of a Cargo workspace is an artefact nobody there can explain, and in a TypeScript repo it is worse, because it can land inside the tsconfig include, the lint glob and the build.

JSON was the first proposal and does not survive its own consequence: ticket `01`'s ordering decision lives in comments, and JSON has none. **YAML keeps both properties and costs no new dependency**, since `yaml` is already a runtime dependency of the frontmatter checks — it is imported lazily so a run with no YAML config does not pay for it. It is also the only shape where editor completion needs nothing from the validator, because a YAML schema attaches through a comment rather than a key, so an unknown key can keep being fatal with no exception carved out for `$schema`.

The loader now reads `.yaml` and `.yml` too, and `SPEC.md` § 7 leads with the YAML example. One footgun is now spelled out in three places: **`off` is a severity and a YAML 1.1 boolean.** The parser here implements 1.2, so an unquoted `off` arrives as the string and works; a severity that arrives as a boolean gets an error naming the quotes rather than one blaming the check ids.

**Still unimplemented and still honest about it:** `--watch` (M6) and `--strict`, which only means something once warnings exist, which is tier 2, which is M5.

---

## M5 — Tier 2
- `dep/missing` with a curated dictionary
- `symbol/missing`
- `stale/churn` using git
- `command/unknown`

**Acceptance:** each one can be turned off by config, and none of them pushes the corpus false positive rate above 10% aggregate.

---

## M6 — Daily loop
- `--watch`
- VS Code extension underlining drift live in `CLAUDE.md`
- Optional pre-commit hook (`driftwatch --only path,script --strict`)

---

## Out of scope (decided, not pending)

- LLM mode for verifying prose claims. It breaks determinism and the latency budget. If it is ever explored, it is a separate command (`driftwatch review`), never the default.
- Third-party plugin system.
- Hosted service, dashboard, or anything with an account.
- Support for agent context formats that do not exist yet.

---

## Suggested release order

Do not wait for M6 to show the project. Visible cadence is part of what makes someone trust the tool.

**This section decides the timing, and the milestone lists do not.** M3 to M6 are inventories of what has to be true, in the order the work makes sense; the numbering is not a release calendar. Where a milestone lists something this section has already scheduled — npm, in M4 — the milestone inherits it.

1. Publish to npm when **M2** closes — it is already useful. **Prepared 2026-09-10, not published.** The package is out of `private` at `0.1.0`, the tarball is 14 files and 54 kB (`pnpm pack:check` fails the build if anything outside `dist/` ever enters it), and `.github/workflows/release.yml` runs the whole gate on a `v*` tag, publishes with `--provenance`, and generates the release notes from the commits since the previous tag. What is left is not code, and it is sequenced in [`.scratch/first-release/`](../../.scratch/first-release/spec.md): push so CI runs, tag and publish **by hand once**, then configure the publisher and switch the workflow on. The first publish is manual because npm's per-package settings — a trusted publisher, a granular token — do not exist until the package does, and because `--provenance` needs a CI with OIDC and fails from a laptop. **Both publishes happened: `0.1.0` by hand, `0.1.1` staged by the workflow with signed provenance and approved by hand.** `NPM_PUBLISH` has been `true` since 2026-09-10, so a `v*` tag now publishes — this sentence used to say the opposite and was itself drift.
2. **`0.2.0` — published 2026-09-12.** Everything since `0.1.1` was additive — `--fix` and `--dry-run`, the three output formats, the Action, `--init` — and the public API of `src/index.ts` did not lose a line, so the minor covered the whole of it. It mattered more than a version bump usually does: `0.1.1` had no `--format github`, so the Action was unusable until it landed.
3. **`0.3.0` — the YAML config.** `--init` writes `driftwatch.config.yaml` instead of a `.ts`, and the loader reads `.yaml` and `.yml`. Additive again: every existing config keeps working, and what changes is which format gets written into a repo that had none.
4. **`0.4.0` — a config is data.** The minor half of the sentence above stops being true: [ADR-0013](../adr/0013-a-config-is-data-not-a-program.md) withdrew `.ts`, `.js` and `.mjs` from the loader, and `defineConfig` left `src/index.ts`. **The first release that takes something away**, which is why it is a minor and not a patch, and why `--migrate-config` shipped in the same commit — a withdrawn format with no route off it is a cost moved onto users. The measured basis for doing it now: zero of the 66 corpus repositories carry a driftwatch config of any kind, so the population that has to migrate is the one that reads this file.
5. **`1.0.0` — the contract freeze.** [ADR-0014](../adr/0014-what-1-0-0-asserts.md), and the first release where the version means something specific: the public surface stops moving without a major. It is one release and not two, because the cleanup ships with the freeze — `--strict` implemented, `--watch` and `--migrate-config` withdrawn, three dead config keys removed, three types exported, two corrections to this specification. `0.x` is the last time removing something is free. Precision does not gate it and did not: condition 6 stands at 87.9% and is published as such.
6. Launch post with the GIF when **M4** closes.
7. Sustain commits over months, not a one-week sprint.

### What `1.0.0` means, and what it does not

[ADR-0014](../adr/0014-what-1-0-0-asserts.md) is the decision: **a claim about compatibility, not about quality.** It lists the eight surfaces that are frozen, states the version policy as a table — a new tier 1 check or a new skills root is a major, a new tier 2 check is a minor — and records why the precision measurement neither gates nor delays a release. Condition 6 is unmet at 87.9% and stays published. [`CONTRACT.md`](../../CONTRACT.md) is the frozen surface itself, generated and held by a test.

### What a release is, by hand

`npm pkg set version=<x.y.z>`, commit, tag `v<x.y.z>`, push the tag. The workflow refuses a tag that disagrees with `package.json` before it sends anything. Then update the `uses:` lines in the documentation, which `docs-links.test.ts` § "the documented action ref" holds to `package.json`.

**There is no floating tag to move.** This procedure used to end by forcing `v0` to the new release. It was never done — `v0` has never existed — and it contradicted the decision the rest of the project is built on: every documented `uses:` names an exact release, `action.yml` explains why, and a test enforces it. A step nothing verified was a step nobody took, which is the shape this tool exists to find.

If a floating tag is ever wanted, it needs the test extended to cover it in the same change. Otherwise it decays the same way.
