# Corpus classification

Hand review of every finding against the real repo. First measured 2026-09-09; re-measured 2026-09-10 after adding `spatie/bloom`, and **again after adding four more repos**.

Corpus: **44 public repos pinned to a commit, 13 findings.**
Of the 44, **15 form the validation group**. Three repos were moved out of it on 2026-09-10 under ADR-0006 condition 9, because rules were derived from their findings; **three replacements are owed**, and until they land every validation number below is provisional.

## Criterion status ([ADR-0006](../../docs/adr/0006-the-m1-precision-criterion.md), condition 6 as rewritten by [ADR-0009](../../docs/adr/0009-precision-is-counted-in-quiet-repos.md))

Validation group measurement: **15 repos, 28 sources, 3 findings, all 3 true.**

| # | Condition | Measured | Status |
|---|---|---|---|
| 1 | `false-positive-traps` fixture at zero | 0 findings | **met** |
| 2 | Zero false positives among `fixable` findings | `fixable: 0` across the 44 snapshots | **met** |
| 3 | Median FP per repo = 0 | 0 (42 of 44 repos with no FP at all) | **met** |
| 4 | 90th percentile of FP per repo ≤ 1 | 0 | **met** |
| 5 | No repo above 2 FP | maximum 1 (`spec-kit`, `eve-template`) | **met** |
| 6 | ≥ 90% of repos produce zero false positives, whole corpus and validation alone | 42 of 44 = **95.5%**; validation **15 of 15 = 100%** | met, **provisionally** |
| 7 | ≥ 1 true positive in validation | 3 | **met** |
| 8 | ≥ 20 repos, with ≥ 8 in validation | 44 repos, 15 in validation | **met** |
| 9 | Contamination rule encoded | `holdout` field in `scripts/corpus-repos.ts`; **three replacements owed** | encoded, **debt outstanding** |

**Every condition is met, and the measurement is provisional.** Read the two sentences after this one before quoting the table.

Validation reads 100% partly because the one unquiet validation repo, `vercel-labs/marketing-team-eve-template`, was moved to calibration in the same operation — not because the tool improved on it. Its false positive still exists and is still counted in the whole-corpus figure. **Three replacement validation repos are owed**, and the honest status until they are added and measured is "the criterion is met on a group that has shrunk by the repos that were failing it".

The old condition 6 (aggregate precision ≥ 80% over the validation group) was withdrawn on 2026-09-10 by [ADR-0009](../../docs/adr/0009-precision-is-counted-in-quiet-repos.md), after four rounds showed it could not be met by improving the tool. Aggregate precision is still reported here — **11 true of 14, 78.6%** — it just no longer decides anything.

### What happened, and why the caveat was right

The first measurement recorded a caveat about condition 6: it had passed on **3 findings**, all from one repo and one root cause, and the document said the honest number to cite was not "100% precision" but "3 of 3, with 7 of 8 repos silent". It also said the condition had to be reconfirmed once the validation group accumulated more mass.

**One repo was enough.** `spatie/bloom` contributed a fourth validation finding and it is false, so precision went from 3 of 3 to 3 of 4, and 75% is below the bar. At this sample size an 80% threshold admits zero false positives, which is exactly the defect ADR-0006 diagnosed in its own predecessor.

Four more repos were then added, and **75% was not a fluke**: `laravel/vet` produced a fifth validation finding, also false, taking it to **3 of 5 = 60%**. `rails/rails`, `alpinejs/alpine` and `spatie/laravel-flare` came out silent.

Nothing regressed in the code. The measurement got one observation less thin.

`docs/spec/ROADMAP.md` says what to do when a criterion does not hold: tune the heuristics, or accept that the check does not get there and say so. **It is not resolved in this document**, because the fix is a heuristic change and ADR-0006 condition 9 prices that: tuning against a validation repo's finding moves `spatie/bloom` to calibration and requires a new validation repo. See "The open decision" at the end.

And there is an irony worth recording: [ADR-0006](../../docs/adr/0006-the-m1-precision-criterion.md) argues that a 5% threshold is not measurable because it demands ~20 findings, and picks 80% because "with 10 findings it admits 2 false ones, and that is a difference you can check by hand". With **3** findings, an 80% threshold admits no false ones — it is "zero false positives" again, dressed up as a percentage. The criterion is met by its letter, but at this sample size it suffers exactly the defect it criticized in its predecessor.

**What to do about it:** loosen nothing and invent no new threshold. What is needed is more finding mass, and the natural route is M2: every new check (`script/missing`, `link/broken`, `skill/frontmatter`, `frontmatter/invalid`) produces its own findings over the same corpus. Once the validation group reaches ~10 findings, condition 6 becomes a measurement again rather than a formality. Until then, the honest number to cite is not "100% precision" but "3 of 3, with 7 of 8 repos silent".

## The full corpus

The corpus produces **13 findings, 11 true and 2 false**, so 84.6% aggregate.

| Repo | Findings | True | False | Group |
|---|---|---|---|---|
| `openai/codex` | 3 | 3 | 0 | calibration |
| `tursodatabase/turso` | 3 | 3 | 0 | calibration |
| `modelcontextprotocol/typescript-sdk` | 3 | 3 | 0 | **validation** |
| `cloudflare/workers-sdk` | 1 | 1 | 0 | calibration |
| `calcom/cal.com` | 1 | 1 | 0 | calibration |
| `github/spec-kit` | 1 | 0 | 1 | calibration |
| `vercel-labs/marketing-team-eve-template` | 1 | 0 | 1 | calibration (moved) |
| the other 37 | 0 | — | — | — |

---

## Validation group, one by one

The three findings from the validation group. Their repos were never inspected before running the tool over them, and no rule was derived from any of them.

The eight repos in the group: `vitest-dev/vitest`, `rust-lang/rust-analyzer`, `nuxt/nuxt`, `openai/openai-node`, `modelcontextprotocol/typescript-sdk`, `modelcontextprotocol/python-sdk`, `openai/openai-python`, `railwayapp/cli`. Only the fifth produced findings.

### True positives (3), all in `modelcontextprotocol/typescript-sdk`

**1. `CLAUDE.md:87` — `packages/server/src/server/sse.ts`**

The document says: "**SSE** (`packages/server/src/server/sse.ts`, `packages/client/src/client/sse.ts`) - Legacy HTTP+SSE transport". The client one exists; the server one does **not**. The real file lives at `packages/server-legacy/src/sse/sse.ts`: the package was renamed to `server-legacy` and the internal path was restructured. Real drift.

**2. `CLAUDE.md:93` — `packages/server/src/server/auth/`**

"Full OAuth 2.0 server implementation in `packages/server/src/server/auth/`". That directory does not exist. The real implementations are in `packages/server-legacy/src/auth` and `packages/core-internal/src/auth`. Real drift, from the same rename.

**3. `CLAUDE.md:98` — `packages/client/src/client/auth-extensions.ts`**

"OAuth client support in `packages/client/src/client/auth.ts` and `packages/client/src/client/auth-extensions.ts`". The first exists and is not reported; the second does not, because the real file is **`authExtensions.ts`**, camelCase and without the hyphen. Real name drift, of the kind an agent cannot guess.

### False positives (0)

None. The previous measurement had one, and it is why this group changed composition:

**`browser-use/browser-use` `CLAUDE.md:87` — `tests/ci/test_action_EventNameHere.py`**

The text says: "Make sure any tests specific to an event live in its `tests/ci/test_action_EventNameHere.py` file". `EventNameHere` is a **placeholder**: it has to be replaced with the event's name.

It is a new and general class: a placeholder in **CamelCase with filler** (`EventNameHere`, `YourClassName`, `SomethingHere`). The existing rules covered `<...>`, `{{...}}`, `$VAR`, `[...]`, `foo`, `NNNN` and `your_*`, but not this form.

**It was fixed** (`PLACEHOLDER_CAMEL` in `src/extract/discard.ts`), with three deliberately narrow forms: `...Here` with an uppercase `H` preceded by a lowercase letter, so `sphere` and `elsewhere` are left alone; `Your...`/`My...` followed by another uppercase letter; and `XXX`/`Xxx`. There are tests for both halves: the six forms it discards and the six real words it does not.

That contaminated `browser-use`, which moved to calibration, and to get back to eight validation repos `railwayapp/cli` was added — small, from another ecosystem, never looked at.

**The 75% measurement is neither deleted nor replaced:** it was valid when it was taken, and the current one is a different measurement over a different group. Both stay in the history below.

---

## Calibration, one by one

These nine are in repos whose findings were already looked at to tune heuristics. **They do not measure precision**; they are here for the record.

### True positives (8)

**`openai/codex` `AGENTS.md:35`** — `codex-rs/codex-mcp/src/mcp_connection_manager.rs`, with a "prefer using" aimed at the agent. There is no `mcp_connection_manager.rs` anywhere in the repo.

**`openai/codex` `AGENTS.md:265` and `275`** — `app-server-protocol/src/protocol/v2.rs`. The directory has `common.rs`, `mod.rs`, `mappers.rs`; there is no `v2.rs`.

**`cloudflare/workers-sdk` `AGENTS.md:140`** — `.github/PULL_REQUEST_TEMPLATE.md`. The real one is `.github/pull_request_template.md`, lowercase. True but minor: on a case-sensitive filesystem the path does not exist, and that is what an agent sees in CI.

**`calcom/cal.com` `AGENTS.md:130`** — `packages/features/ee/workflows/lib/constants.ts`. The directory exists, the file does not. `CLAUDE.md`, which is an identical copy, is reported as an alias instead of counting twice.

**`tursodatabase/turso` `.claude/skills/cdc/SKILL.md:158`, `242`, `246`** — `core/translate/emitter.rs` three times, as section headings. `core/translate/` exists; there is no `emitter.rs` anywhere in the repo. Found while turso was in validation.

### False positive (1)

**`github/spec-kit` `AGENTS.md:464`** — `.goose/recipes/`, in a section titled "Goose Integration" that describes **another tool's** convention, for the project spec-kit generates. Detecting it would require understanding that the whole section is about a third party. It is the class with no deterministic fix.

---

## History: why the criterion was changed

The original criterion was "< 5% false positives". It was measured and turned out not to be measurable; [ADR-0006](../../docs/adr/0006-the-m1-precision-criterion.md) has the full argument. The record of that measurement:

| Round | New repos in validation | Findings | True | False |
|---|---|---|---|---|
| 1 | playwright-mcp, anthropic-sdk-typescript, spec-kit, nitro, zod | 2 | 0 | 2 |
| 2 | crush, turso, svelte | 4 | 3 | 1 |
| 3 | vitest, rust-analyzer, nuxt | 2 | 0 | 2 |
| 4 | reader, llm, git-mcp-server, h3 | 0 | 0 | 0 |
| 5 | typescript-sdk, python-sdk, openai-python, browser-use | 4 | 3 | 1 |
| 6 | railwayapp/cli (replaces browser-use, contaminated) | 3 | 3 | 0 |

Every round that informed a rule contaminated its repos, which moved to calibration. Five rounds, and in each one the fresh sample uncovered **a new class** of false positive:

| Round | New class |
|---|---|
| 1 | Uppercase placeholder (`../NNNN/results.md`) |
| 1 | Another tool's convention (`.goose/recipes/`) |
| 2 | A file that has to be created (`your_profile.rs`) |
| 3 | A file the document declares generated (`contributor-names.json`) |
| 4 | None new; but auditing the discards uncovered that the prose window was bleeding between table rows |
| 5 | CamelCase placeholder with filler (`EventNameHere`) |

Round 5 is the first in which the fresh sample produced a majority of true positives: 3 of 4. The four before it, together, gave 3 true out of 8 findings. Round 6, with the `EventNameHere` fix applied and `railwayapp/cli` in place of `browser-use`, gave 3 of 3.

Added up, the six rounds give **13 out-of-sample findings, 6 true and 7 false**. That is the number describing the whole journey; the 100% describes only the final state, over 3 findings.

## The corrections applied

From 231 initial findings down to 13, with 11 true:

| Correction | Where |
|---|---|
| Root fallback for nested sources | `path-missing.ts` |
| A path whose shape exists somewhere is not drift | [ADR-0005](../../docs/adr/0005-a-path-that-exists-somewhere-is-not-drift.md) |
| A single-segment directory is not a claim | [ADR-0004](../../docs/adr/0004-a-bare-directory-is-not-a-claim.md) |
| A path needs a slash | [ADR-0003](../../docs/adr/0003-a-path-needs-a-slash.md) |
| `git check-ignore` over the candidate paths | `src/verify/git.ts` |
| Child probe for generated output directories | `candidatePaths` in `src/run.ts` |
| Fixed list of generated directories, for when there is no git | `src/verify/generated.ts` |
| Inline code with spaces: it is a command | `discard.ts` |
| Decoding the percent-encoding of links | `paths.ts` |
| Example, uncertainty and generation markers in the prose | `context-prose.ts` |
| Create imperatives at the start of a line | `context-prose.ts` |
| The prose window does not bleed between independent items | `context-prose.ts` |
| The line names another repository | `context-prose.ts` + `originSlug` |
| Inline code that is an external link's label | `parseMarkdown` |
| Metasyntactic, uppercase and possessive placeholders | `discard.ts` |
| Identical copies of `AGENTS.md` and `CLAUDE.md` | `collapseDuplicates` in `discover.ts` |

## What each correction cost

Precision was bought with coverage. The most expensive false negative is in [ADR-0005](../../docs/adr/0005-a-path-that-exists-somewhere-is-not-drift.md): **a file that moved between packages is no longer detected**, because it is indistinguishable from a document speaking relatively. The `monorepo` fixture documents the exact case.

Worth noting that the three true positives in `typescript-sdk` survived that rule because the package changed **name** (`server` → `server-legacy`), and that breaks the suffix. Had the file merely moved within the same package, driftwatch would have stayed silent.

## Execution note

The clones are deleted after generating the snapshots: they are a cache rebuildable with `pnpm corpus` and take ~2.7 GB. `pnpm corpus --only <pattern>` runs a subset without re-downloading the rest.


---

## `spatie/bloom`, added 2026-09-10

Swift/macOS, a domain the rest of the corpus does not cover, and **7 sources**: five `SKILL.md` under `.claude/skills/`, plus an `AGENTS.md` and a `CLAUDE.md` that are not byte-identical, so both are audited.

Placed in the **validation** group, and the group was chosen before a single finding was looked at.

### The finding: `CLAUDE.md:133` — `Tools/xcodeproj.sh`

**False positive.**

The document is arguing *against* adding an Xcode project file to the repo, and the surrounding sentence is:

> **Generating it instead does not rescue the argument, it kills it.** XcodeGen or Tuist from a spec, or a `Tools/xcodeproj.sh` that writes one on demand, **would** avoid the merge conflicts, but the whole benefit above is a stamp Xcode writes back into `project.pbxproj` […]

`Tools/` exists and holds twenty-odd scripts. `Tools/xcodeproj.sh` is not one of them, and is not supposed to be: it is a **hypothetical** the document introduces in order to reject it. An agent reading that paragraph would not go looking for the file.

### Why this one is interesting

It is the same class ADR-0008 found in this project's own `docs/`: a document that **argues** rather than asserts, quoting a path as part of a case it is making. What is new is *where*. ADR-0008 could conclude "a specification is not an agent context file" and exclude `docs/`; that escape does not exist here. This is a `CLAUDE.md`, the exact file type the tool is built for, and it contains a paragraph of design argument.

So the class is not confined to specifications. Any sufficiently thoughtful `CLAUDE.md` will at some point explain why the repo is *not* organised some other way, and naming the road not taken means naming paths that do not exist.

### What would suppress it

The conditional mood. `context-prose.ts` has an `EXAMPLE` list and a `HEDGED` list, and neither covers "would". The two-line window around the claim does contain `would avoid`, so a marker would fire.

**It is not applied here**, for two reasons.

First, the risk is real and untested: "would" is a common word, and "you would find the config in `src/config.ts`" is a sentence a document can plausibly write about a file that does exist. A marker that broad could suppress true positives across the whole corpus, and the only way to know is to measure it.

Second, the price is fixed and known. ADR-0006 condition 9: deriving a rule from a validation repo's finding moves that repo to calibration and requires a new validation repo to replace it. Spending `spatie/bloom` on a heuristic guess is a bad trade when the guess has not been measured.

## `spatie/laravel-flare`, added 2026-09-10

PHP/Laravel, a domain the corpus also lacked. One `CLAUDE.md` of 6 KB, and **zero findings**.

It changes no precision number, and that was foreseeable: every repo that has produced a finding has a context file of 9–24 KB, and this one is smaller than all of them. What it does do is widen conditions 3, 4 and 5 — the per-repo distribution now rests on 36 repos, 34 of them with no false positive at all — and it makes the corpus less monolingual.

**It is the cheap kind of addition, not the useful kind.** Condition 6 needs findings in the denominator, and a silent repo contributes none. 29 of the 36 repos are silent.

## The four repos added 2026-09-10, second round

| Repo | Domain | Sources | Findings | Clone |
|---|---|---|---|---|
| `spatie/laravel-flare` | PHP/Laravel | 1 | 0 | 1 MB |
| `laravel/vet` | PHP | 2 | **1, false** | 8 MB |
| `rails/rails` | Ruby | 1 | 0 | 64 MB |
| `alpinejs/alpine` | JS, skills-heavy | 3 | 0 | 8 MB |

`rails/rails` is the largest repo in the corpus, but a shallow clone is 64 MB and not the 289 MB the API reports, so the total clone cost stays near 2.8 GB.

`laravel/vet` also carries a pattern the corpus did not have: its `CLAUDE.md` is ten bytes, `@AGENTS.md`, which is Claude Code's **import** syntax. driftwatch does not follow imports, so it audits a second source with no claims in it. Not a finding, but worth knowing before someone reports it as a bug.

### The finding: `laravel/vet` `AGENTS.md:5` — `.hod/skills/`

**False positive.**

Line 5 is one long line of five sentences, all of them instructions about where to put things:

> `hod` writes this file. Write no sentence in it, because `hod update` writes it again. Write the intention of the project in `.hod/PROJECT.md`. Write a rule in a file in `.hod/rules/`. **Write a skill in a directory in `.hod/skills/`.**

`.hod/` exists. `.hod/PROJECT.md` exists. `.hod/rules/` exists with four rule files. `.hod/skills/` does not, because nobody has written a skill yet — and the sentence is telling you where to put one when you do.

### Why this one is different from `bloom`'s

`bloom`'s false positive was a **new class**: argumentative prose naming a path in order to reject it. No rule covers it.

This one is a **known class with a rule that has a gap**. `context-prose.ts` has `CREATE_IMPERATIVES` for exactly this — an instruction to create, where the path is a destination and not a claim — derived from `tursodatabase/turso`'s "1. Create `perf/memory/src/profile/your_profile.rs`". It escapes through two identifiable holes:

1. **`write` is not in the verb list.** It has `create`, `add`, `new`, `generate`, `scaffold`, `touch`, `mkdir`. Adding `write` is a one-line, narrow change.
2. **The imperative has to open the line.** `isCreateInstruction` strips list markers and then checks `startsWith`, so the fourth sentence of a five-sentence line never matches. That restriction is deliberate and documented — it is what stops "add" and "create" mid-sentence from suppressing everything — but it assumes one claim per line, and a paragraph written as a single long line breaks the assumption.

The second hole is the interesting one, and it is a design question rather than a list entry: the imperative check would have to move from line-level to **sentence-level**, splitting on terminal punctuation. That is a real change with its own false-negative risk.

## The five repos added 2026-09-10, third round

| Repo | Domain | Sources | Findings | Context |
|---|---|---|---|---|
| `vercel-labs/marketing-team-eve-template` | TS, agent template | 2 | **3, all false** | 24 KB |
| `hieunc229/mailflare` | TypeScript | 1 | 0 | 11 KB |
| `ecrespo/vigia-eew` | Python, **Spanish** | 1 | 0 | 7.5 KB |
| `harehare/mq` | Rust | 2 | 0 | 4 KB ×3 |
| `thatseoagent/mcp` | TypeScript | 1 | 0 | 1 KB |

`ecrespo/vigia-eew` is the first context file in Spanish, which is what the Spanish entries in `context-prose.ts` were written for; it came out silent. `harehare/mq` ships `AGENTS.md`, `CLAUDE.md` and `.github/copilot-instructions.md` all at 4112 bytes, and the snapshot confirms the intended behaviour: the two at the root collapse into one source with an alias, and the one under `.github/` does not, because `collapseDuplicates` keys on the directory as well as the content.

### `marketing-team-eve-template`, three findings, three false positives

**1. `AGENTS.md:68` — `#lib/`.** A **new class, and the cleanest fix in the whole list.**

> Imports use the `#*` subpath from `package.json` (`#lib/...` maps to `agent/lib/...`)

`package.json` has `"imports": { "#*": "./agent/*" }`. `#lib/` is a Node **subpath import specifier**, not a filesystem path, and the sentence says so while it says it. Nothing that starts with `#` is a relative path — it is an import specifier or a URL anchor. `GLOB_OR_PLACEHOLDER` does not cover `#`.

**2. `AGENTS.md:86` — `references/ai-phrases-to-avoid.md`** and **3. `AGENTS.md:136` — `writing-quality/references/ai-phrases-to-avoid.md`.**

The file exists nowhere in the tree, and it is not supposed to. `agent/lib/writing-quality/skill.ts:34` declares it:

```ts
"references/ai-phrases-to-avoid.md": AI_PHRASES_TO_AVOID,
```

It is **generated when the skill compiles**, from a TypeScript constant. This is the class `vitest-dev/vitest`'s `contributor-names.json` established and that the project already classifies as a false positive: a file that is neither committed nor gitignored, and only appears after a build step.

Why the existing rules missed it, and the two are not the same:

- **Line 86 is reachable.** It says the entries "**materialize** as real siblings". `HEDGED` has `is generated`, `are generated`, `generated by`, `generated from`, `se genera` — but not `materialize`. Adding it is the same kind of one-word fix as `write` for the imperatives.
- **Line 136 is not.** It says the content is "already in `writing-quality/references/…`" — no generation marker of any kind, because the sentence is about *content duplication*, not about the build. Knowing this path is generated requires reading `skill.ts`. No prose rule reaches it.

## The treadmill this measurement has built into it

Worth stating plainly, because it is a property of the method and not of this round.

Every false positive found in the validation group can be fixed. Fixing it means deriving a rule from that repo's finding, and ADR-0006 condition 9 prices that: the repo moves to calibration and a replacement has to be added. So:

- Fix `vet`'s and the group is 3 of 4 again — **75%**, still under the bar, with one fewer repo.
- Fix both and the group is 3 of 3 — **100%**, which is the thin sample the first measurement already warned was not worth citing.

**Tuning cannot raise the measured precision, because tuning removes the observations that lowered it.** The number only moves by adding repos, and adding repos has now lowered it twice.

That is not an argument for tuning less. It is an argument that condition 6 as written measures something that shrinks when you act on it, and that route 3 below deserves more weight than it had this morning.

## Fourth round, 2026-09-10: four fixes applied and re-measured

Four of the six false positives had a named fix. All four were applied and the **full corpus was re-run over all 44 repos**.

| Fix | Where | Result |
|---|---|---|
| `#` opens a module specifier or an anchor, never a path | new discard rule, `discard.ts` | removed `#lib/` |
| `materialize` joins the generation markers | `HEDGED`, `context-prose.ts` | removed `eve-template` `AGENTS.md:86` |
| `write` joins the create imperatives | `CREATE_IMPERATIVES` | **not enough on its own** |
| the imperative is tested per **sentence**, not per line | `segmentAround`, `context-prose.ts` | removed `vet` `AGENTS.md:5` |

**Findings: 17 → 14. False positives: 6 → 3. True positives: 11 → 11.**

Only three findings disappeared across all 44 repos, and all three were the false positives being targeted. **Nothing else moved.** That is the number that matters more than the ratio: a fix that also silenced real drift somewhere would have shown up as a fourth removed line, and none did.

Validation goes **37.5% → 60%**. Aggregate goes **64.7% → 78.6%**. Condition 5 holds again, since no repo is above 1 false positive.

### Two things this round taught that the analysis had wrong

**`write` alone did nothing.** The prediction written down before running was "6 false positives to 2". It was 6 to 4, because `laravel/vet`'s finding needed *both* gaps closed: the verb list **and** the move to sentence level. The table above had those as separate rows with different confidence, and the prediction collapsed them. The corpus corrected it in one run.

**Splitting on newlines was wrong, and the fixture caught it.** The first attempt at `segmentAround` treated `\n` as a sentence boundary, on the reasoning that it preserved the old per-line behaviour. It broke a wrapped instruction — "Write a skill in a directory in\n`skills/mine/`." is one sentence across two lines — and `false-positive-traps` went red immediately, before the corpus was touched. Terminal punctuation followed by whitespace is the only boundary, and it already covers what the per-line check was doing, because a sentence ending at the end of a line matches `[.!?]\s+`.

Each fix carries its case in `false-positive-traps` and a unit test naming the repo and line it came from. Two extra tests pin the behaviour the sentence-level change risks: an instruction in one sentence must not suppress the claim in the next one, and an instruction that wraps must still count as one.

### The three that remain

| Where | Class | Status |
|---|---|---|
| `github/spec-kit` (calibration) | a third-party tool's convention directory | unresolved by design, from the first measurement |
| `spatie/bloom` | argumentative prose: `would avoid…` names a path in order to reject it | the conditional-mood marker is still untested and still broad |
| `eve-template` `AGENTS.md:136` | a generated file described with no generation marker — "already in `…`" | not reachable by any prose rule; knowing it requires reading `skill.ts` |

## The open decision

Condition 6 is at **60%** — 3 true of 5 in validation — against a bar of 80%. Everything else holds.

### Where the four rounds leave it

| Round | Validation | Aggregate | Conditions |
|---|---|---|---|
| Original certification | 3 of 3 = 100% | 11 of 12 = 91.7% | 9 of 9 |
| +`bloom` | 3 of 4 = 75% | 11 of 13 = 84.6% | 8 of 9 |
| +4 repos | 3 of 5 = 60% | 11 of 14 = 78.6% | 8 of 9 |
| +5 repos | 3 of 8 = 37.5% | 11 of 17 = 64.7% | 7 of 9 |
| **after the fixes** | **3 of 5 = 60%** | **11 of 14 = 78.6%** | **8 of 9** |

Adding repos took it from 100% to 37.5%. Fixing what the repos exposed took it back to 60%. It has not reached 80% and, on this method, it cannot — for the reason set out below.

### The treadmill, now demonstrated rather than argued

ADR-0006 condition 9 prices a fix: deriving a rule from a validation repo's finding moves that repo to calibration and requires a replacement. Paying it for this round means `laravel/vet` and `vercel-labs/marketing-team-eve-template` move out.

Do that accounting and the validation group becomes `typescript-sdk`'s 3 true positives plus `bloom`'s 1 false positive: **3 of 4 = 75%**. Still under the bar, with two fewer repos and no work left to do about it.

So the sequence is: measure honestly → the number falls → fix what the measurement exposed → the number rises but not to the bar → pay the contamination price → **the number falls again**. There is no path through this criterion that ends in it being met, short of a validation repo that produces true positives and no false ones, which is luck rather than engineering.

**A criterion that cannot be met by improving the tool is measuring the wrong thing.**

## Fifth round, 2026-09-10: the conditional mood, and the bill for it

`spatie/bloom`'s class was the last one with a candidate fix, and the candidate was the one this document had twice refused to apply on a single observation. It was applied and measured.

**The rule.** A new `CONDITIONAL` list — `would`, `could`, `might` and their Spanish equivalents — scoped **to the sentence holding the claim**, never to the two-line window. That scoping is the whole design: over the window the modal reaches across a sentence boundary into a neighbouring claim, and it is only possible at all because the fourth round had already built `segmentAround`.

**The measurement.** Over all 44 repos it suppressed **exactly one finding** — `bloom`'s `Tools/xcodeproj.sh` — and nothing else. Findings 14 → 13, false positives 3 → 2, true positives 11 → 11.

That is evidence and not proof. The rule only ever costs something when a document uses a modal *and* the path is genuinely stale, which is much rarer than the frequency of the word "would" suggests; but 44 repos is 44 repos. The word is recorded in the code as the riskiest list in the file.

### The bill: three repos leave the validation group

Rules were derived from the findings of three validation repos across rounds four and five:

| Repo | Rule derived |
|---|---|
| `vercel-labs/marketing-team-eve-template` | the `#` discard, and `materialize` |
| `laravel/vet` | `write`, and the move to sentence-level imperatives |
| `spatie/bloom` | the conditional mood |

Under ADR-0006 condition 9 all three move to calibration and **three replacements are owed**. They have been moved. The group is now 15 repos, 28 sources, 3 findings, all true.

**Validation therefore reads 100%, and that number should not be celebrated.** It is 100% in part because `eve-template` — the one validation repo still producing a false positive — left the group in the same operation. The false positive did not go away; it is still in the whole-corpus figure. Until three replacements are added and measured, the honest description is: *the criterion is met on a group that shrank by the repos that were failing it.*

### A conflict in how condition 9 is worded

Worth fixing, because it made this round's accounting ambiguous.

`docs/adr/0006` § Decision, condition 9: "if the **findings** or the discards of a validation repo are **inspected**, that repo moves to calibration".

The comment on the `holdout` field in `scripts/corpus-repos.ts` says the opposite about half of it: "Classifying its findings **is** the measurement and does not contaminate; opening the repo to see what the tool discarded does."

Taken literally the ADR moves a repo out the moment anyone reads its findings, which would make the group unmeasurable — classifying is the measurement. The code comment is the correct reading, and the line the rounds above actually applied is a third one, narrower than either: **classifying a finding is free; deriving a rule from it is not.** That is ordinary train/test leakage and it is what condition 9 exists to prevent. The ADR's wording should be brought in line with it.

### The decision taken, 2026-09-10

Condition 6 was rewritten. [ADR-0009](../../docs/adr/0009-precision-is-counted-in-quiet-repos.md) withdraws the aggregate-precision ratio and replaces it with the **quiet-repo rate**: at least 90% of repos producing zero false positives, over the whole corpus and over the validation group taken alone.

When the ADR was written the rate stood at 93.2% over the corpus and 88.89% over validation, so the rewritten criterion was **unmet by 1.1 points** — deliberately, because a replacement tuned to pass that day's numbers would have been the same mistake in a new coat. The ADR predicted that closing `bloom`'s class would take validation to 94.1% and the corpus to 95.5%.

The fifth round did exactly that, the same day. Measured now: **42 of 44 = 95.5%** over the corpus and **15 of 15 = 100%** over validation, the second figure inflated by `eve-template` leaving the group. The prediction held on the corpus figure to the decimal, which is some evidence the criterion behaves as designed — it moves when the tool improves, which is the property the old one lacked.

The denominator moved from findings to repos for three reasons, set out in full in the ADR: repos are what the corpus has many of while findings are what the tool deliberately has few of; a user has one repo and never experiences an aggregate; and a repo-level count refuses to divide the cost of crying wolf by how much else the same run got right.

**What is next**, in order:

1. **Three replacement validation repos.** This is the outstanding debt and it blocks calling any of the above final. They need the profile that produces findings: context files of 10 KB or more, ideally several per repo. Until they are measured, validation's 100% describes a group chosen partly by which repos were failing.
2. `eve-template` `AGENTS.md:136` — a generated file described with no generation word. Recorded as **not reachable by any prose rule**: knowing it requires reading `skill.ts`. A limit, not a to-do.
3. `github/spec-kit` — a third-party tool's convention directory. Unresolved by design since the first measurement.
4. Bring ADR-0006's wording of condition 9 in line with what is actually applied — classifying a finding is free, deriving a rule from it is not — as set out above.
