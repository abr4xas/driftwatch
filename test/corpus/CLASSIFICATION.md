# Corpus classification

Hand review of every finding against the real repo. First measured 2026-09-09; re-measured 2026-09-10 after adding `spatie/bloom`, and **again after adding four more repos**.

Corpus: **44 public repos pinned to a commit, 17 findings.**
Of the 44, **18 form the validation group**: never inspected before measuring.

## Criterion status ([ADR-0006](../../docs/adr/0006-the-m1-precision-criterion.md))

Validation group measurement: **18 repos, 39 sources, 8 findings, 3 true and 5 false.**

| # | Condition | Measured | Status |
|---|---|---|---|
| 1 | `false-positive-traps` fixture at zero | 0 findings | **met** |
| 2 | Zero false positives among `fixable` findings | `fixable: 0` across the 44 snapshots | **met** |
| 3 | Median FP per repo = 0 | 0 (40 of 44 repos with no FP at all) | **met** |
| 4 | 90th percentile of FP per repo ≤ 1 | 0 | **met** |
| 5 | No repo above 2 FP | maximum **3** (`marketing-team-eve-template`) | **NOT MET** |
| 6 | Aggregate precision ≥ 80% in validation | 3 of 8 = **37.5%** | **NOT MET** |
| 7 | ≥ 1 true positive in validation | 3 | **met** |
| 8 | ≥ 20 repos, with ≥ 8 in validation | 44 repos, 18 in validation | **met** |
| 9 | Contamination rule encoded | `holdout` field in `scripts/corpus-repos.ts` | **met** |

**Seven of nine. Conditions 5 and 6 no longer hold.**

### What happened, and why the caveat was right

The first measurement recorded a caveat about condition 6: it had passed on **3 findings**, all from one repo and one root cause, and the document said the honest number to cite was not "100% precision" but "3 of 3, with 7 of 8 repos silent". It also said the condition had to be reconfirmed once the validation group accumulated more mass.

**One repo was enough.** `spatie/bloom` contributed a fourth validation finding and it is false, so precision went from 3 of 3 to 3 of 4, and 75% is below the bar. At this sample size an 80% threshold admits zero false positives, which is exactly the defect ADR-0006 diagnosed in its own predecessor.

Four more repos were then added, and **75% was not a fluke**: `laravel/vet` produced a fifth validation finding, also false, taking it to **3 of 5 = 60%**. `rails/rails`, `alpinejs/alpine` and `spatie/laravel-flare` came out silent.

Nothing regressed in the code. The measurement got one observation less thin.

`docs/spec/ROADMAP.md` says what to do when a criterion does not hold: tune the heuristics, or accept that the check does not get there and say so. **It is not resolved in this document**, because the fix is a heuristic change and ADR-0006 condition 9 prices that: tuning against a validation repo's finding moves `spatie/bloom` to calibration and requires a new validation repo. See "The open decision" at the end.

And there is an irony worth recording: [ADR-0006](../../docs/adr/0006-the-m1-precision-criterion.md) argues that a 5% threshold is not measurable because it demands ~20 findings, and picks 80% because "with 10 findings it admits 2 false ones, and that is a difference you can check by hand". With **3** findings, an 80% threshold admits no false ones — it is "zero false positives" again, dressed up as a percentage. The criterion is met by its letter, but at this sample size it suffers exactly the defect it criticized in its predecessor.

**What to do about it:** loosen nothing and invent no new threshold. What is needed is more finding mass, and the natural route is M2: every new check (`script/missing`, `link/broken`, `skill/frontmatter`, `frontmatter/invalid`) produces its own findings over the same corpus. Once the validation group reaches ~10 findings, condition 6 becomes a measurement again rather than a formality. Until then, the honest number to cite is not "100% precision" but "3 of 3, with 7 of 8 repos silent".

## The full corpus

The corpus produces **17 findings, 11 true and 6 false**, so 64.7% aggregate.

| Repo | Findings | True | False | Group |
|---|---|---|---|---|
| `openai/codex` | 3 | 3 | 0 | calibration |
| `tursodatabase/turso` | 3 | 3 | 0 | calibration |
| `modelcontextprotocol/typescript-sdk` | 3 | 3 | 0 | **validation** |
| `cloudflare/workers-sdk` | 1 | 1 | 0 | calibration |
| `calcom/cal.com` | 1 | 1 | 0 | calibration |
| `github/spec-kit` | 1 | 0 | 1 | calibration |
| `spatie/bloom` | 1 | 0 | 1 | **validation** |
| `laravel/vet` | 1 | 0 | 1 | **validation** |
| `vercel-labs/marketing-team-eve-template` | 3 | 0 | 3 | **validation** |
| the other 35 | 0 | — | — | — |

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

## The open decision

Conditions **5 and 6** are unmet: one repo produced 3 false positives against a bar of 2, and validation precision is **37.5%** against a bar of 80%. `docs/spec/ROADMAP.md` § M1 says we do not advance on an unmet criterion — we tune, or we say the check does not get there.

### What three rounds of adding repos actually established

Route 1 — add validation mass before touching a heuristic — was the recommendation two rounds ago, on the reasoning that the problem was sample size. It was carried out: **ten repos added, validation went from 8 to 18**. Precision went **100% → 75% → 60% → 37.5%**.

That is the answer to the question the route was asking. The 100% was an artifact of three observations from one root cause, and every enlargement of the sample has moved the number the same way. **Adding more repos is no longer information; it is confirmation.** The route is finished.

What it bought is worth more than the number: **six classified false positives across four repos and five distinct classes**, which is enough to tune against without overfitting to one observation. Two rounds ago there was one.

### The classes, with what each would cost to close

| # | Class | Where | Fix | Confidence |
|---|---|---|---|---|
| 1 | Text starting with `#` is a subpath import or an anchor, never a path | `eve-template` | Add `#` to the discard rules | **High.** A category error, not a threshold |
| 2 | Generated file described with `materialize` | `eve-template` | One entry in `HEDGED` | **High.** Extends an established class |
| 3 | Instruction to create, verb not in the list | `vet` | Add `write` to `CREATE_IMPERATIVES` | **High.** Extends an established class |
| 4 | Instruction to create, imperative not at line start | `vet` | Imperative check moves to sentence level | Medium. Real false-negative risk |
| 5 | Generated file with no generation marker in the sentence | `eve-template` | None known. Requires reading the build | **Not reachable by prose rules** |
| 6 | Argumentative prose naming a path to reject it | `bloom` | Conditional mood (`would`) | Low. Broad, untested, likely to suppress true positives |

Closing 1, 2 and 3 removes **four of the six** false positives. Two survive, and both are honest limits rather than oversights.

### The recommendation

**Do 1, 2 and 3, then restate the criterion on what is left.**

Those three are not heuristic tuning in the sense condition 9 is protecting against. Two extend an existing class with a synonym; one corrects a category error the extractor makes about a syntax it does not know. None of them is a threshold fitted to a sample. They should still be *paid for* under condition 9 — `laravel/vet` and `marketing-team-eve-template` move to calibration and are replaced — because the rule exists precisely to stop "this one is obviously right" from becoming the standard argument. Making the exception is the user's call; recording that an exception is being made is not optional.

Then condition 6 has to be rewritten, and not to a lower percentage. The treadmill above is the reason: **fixing a validation false positive deletes the observation that lowered the number**, so no amount of work moves it upward. A criterion that cannot be improved by improving the tool is measuring the wrong thing.

What the tool actually does, over 44 real repositories nobody wrote for us:

- **40 of 44 repos produce no false positive at all.**
- **Zero autofixable false positives**, in any repo, across every round. Not once has `--fix` been offered something wrong.
- Six false positives total, of which four have a known narrow fix.
- Eleven true positives, all real drift, in repos whose maintainers did not know this tool existed.

That is the shape of a usable tool, and it is not what "37.5% precision" conveys. The number is a ratio over a numerator the tool deliberately keeps small — the project's founding rule is that one false positive costs more than ten false negatives, which *guarantees* few findings and makes any percentage over them unstable. ADR-0006 diagnosed this exact defect in its own predecessor and then reintroduced it one threshold down.

A criterion that survives contact with the corpus would be stated per repo and on the fixable subset, both of which are already conditions 2 through 5 — the ones that have held throughout, except where a single repo tripped the per-repo cap that this same reasoning suggests belongs there.

**This is a decision for the user, not for me.** What is not optional is that the table at the top no longer says nine of nine, and it does not.
