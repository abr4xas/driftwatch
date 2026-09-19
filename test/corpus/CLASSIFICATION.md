# Corpus classification

Hand review of every finding against the real repo. First measured 2026-09-09; re-measured 2026-09-10 after adding `spatie/bloom`, and **again after adding four more repos**.

Corpus: **66 public repos pinned to a commit, 52 findings.**

Round eighteen widened discovery to the other skills roots and added 48 findings; **18 of them were a bug and are gone**, and the remaining 30 are ruled on below: 2 true, 28 false. Round nineteen then closed two of those classes, removing 4 more. The corpus stands at **52 findings, 22 true and 30 false**.
Of the 66, **32 form the validation group**. No replacement is outstanding.

## Criterion status ([ADR-0006](../../docs/adr/0006-the-m1-precision-criterion.md), condition 6 as rewritten by [ADR-0009](../../docs/adr/0009-precision-is-counted-in-quiet-repos.md))

Validation group measurement: **32 repos, 67 sources, 12 findings, 8 true and 4 false.**

Round eighteen added two sources to the validation group and **no findings**: all 48 of its new findings landed in calibration. The validation measurement is unchanged, which is why the conditions below can still be read at all.

| # | Condition | Measured | Status |
|---|---|---|---|
| 1 | `false-positive-traps` fixture at zero | 0 findings | **met** |
| 2 | Zero false positives among `fixable` findings | 1 fixable, and it is **true** (`fireSeqSearch`) | **met**, repaired in round 19 |
| 3 | Median FP per repo = 0 | 0 (61 of 66 repos with no FP at all) | **met** |
| 4 | 90th percentile of FP per repo ≤ 1 | 0 | **met** |
| 5 | No repo above 2 FP | maximum **2** (`edgecrab`) | **met**, repaired in round 16 |
| 6 | ≥ 90% of repos produce zero false positives, whole corpus and validation alone | 61 of 66 = **92.4%**; validation **29 of 32 = 90.6%** | **met**, repaired in round 16 |
| 7 | ≥ 1 true positive in validation | 8 | **met** |
| 8 | ≥ 20 repos, with ≥ 8 in validation | 66 repos, 32 in validation | **met** |
| 9 | Contamination rule encoded | `holdout` field in `scripts/corpus-repos.ts`; no debt outstanding | **met** |

Fixable findings: **1**, of which **0 are false**. Round eighteen broke this with two false fixable findings in `remix-run/react-router`; round nineteen closed the class that produced them.

**All nine conditions are met again** after round nineteen repaired condition 2, on 66 repos with 32 in validation and 12 validation findings — four times the mass the M1 certification rested on.

Four rounds happened on 2026-09-10 after M2's checks landed, and they are worth reading together, because two of them broke conditions and two repaired them:

- The **thirteenth** added thirteen validation repos to give condition 6 the finding mass M2 had promised it. It got the mass, and conditions 2 and 5 broke.
- The **fourteenth** closed the class that broke condition 2 — another agent tool's configuration root — which repaired it and also silenced a false positive that had been open in `github/spec-kit` since the first round. The replacement repos it brought in then broke condition 6 over validation.
- The **fifteenth** closed the largest class left, the index placeholder, which cost nothing: the only repo it appeared in had already been moved to calibration. Eight false positives gone, and **no condition moved**, because 5 and 6 count repos rather than findings.
- The **sixteenth** closed the two classes that did move them — a dependency protocol specifier and a version-or-date template — which emptied `aptos-ts-sdk` and `aguara`, cost both of them to calibration, and **repaired conditions 5 and 6**. The two replacements brought one false positive and one true finding between them.

That sequence is the treadmill this document named in round three, running in public: closing a class costs the repo that revealed it, the replacement arrives with its own noise, and the percentage moves for reasons that have nothing to do with the code getting better or worse.

That sentence was also true on 2026-09-09 and did not survive contact with fifteen more repositories, so it is worth saying what is different now. The corpus has grown from 34 repos to **49**, the validation group from 8 to **18**, and the two conditions that decide precision rest on **49 and 18 repos** rather than on three findings from a single root cause. Seven rounds of measurement have added twenty-one findings' worth of evidence and closed seven false-positive classes.

**Two replacement validation repos are owed**, for `mattpocock/course-video-manager` and `emdash-cms/emdash`. Round five's warning does not apply to either: that round's 100% was flattered by the failing repo leaving the group, and both of these leave **clean**, fixed rather than removed. Validation reads 100% with them or without them.

What remains unfixed is two false positives: a third-party convention kept by design, and one **not reachable by any prose rule**.

The old condition 6 (aggregate precision ≥ 80% over the validation group) was withdrawn on 2026-09-10 by [ADR-0009](../../docs/adr/0009-precision-is-counted-in-quiet-repos.md), after four rounds showed it could not be met by improving the tool. Aggregate precision is still reported here — **15 true of 17, 88.2%** — it just no longer decides anything. (The figure had been left at round four's `11 of 14` through three rounds that moved it; it is derived below from the two false positives still open.)

### What happened, and why the caveat was right

The first measurement recorded a caveat about condition 6: it had passed on **3 findings**, all from one repo and one root cause, and the document said the honest number to cite was not "100% precision" but "3 of 3, with 7 of 8 repos silent". It also said the condition had to be reconfirmed once the validation group accumulated more mass.

**One repo was enough.** `spatie/bloom` contributed a fourth validation finding and it is false, so precision went from 3 of 3 to 3 of 4, and 75% is below the bar. At this sample size an 80% threshold admits zero false positives, which is exactly the defect ADR-0006 diagnosed in its own predecessor.

Four more repos were then added, and **75% was not a fluke**: `laravel/vet` produced a fifth validation finding, also false, taking it to **3 of 5 = 60%**. `rails/rails`, `alpinejs/alpine` and `spatie/laravel-flare` came out silent.

Nothing regressed in the code. The measurement got one observation less thin.

`docs/spec/ROADMAP.md` says what to do when a criterion does not hold: tune the heuristics, or accept that the check does not get there and say so. **It is not resolved in this document**, because the fix is a heuristic change and ADR-0006 condition 9 prices that: tuning against a validation repo's finding moves `spatie/bloom` to calibration and requires a new validation repo. See "The open decision" at the end.

And there is an irony worth recording: [ADR-0006](../../docs/adr/0006-the-m1-precision-criterion.md) argues that a 5% threshold is not measurable because it demands ~20 findings, and picks 80% because "with 10 findings it admits 2 false ones, and that is a difference you can check by hand". With **3** findings, an 80% threshold admits no false ones — it is "zero false positives" again, dressed up as a percentage. The criterion is met by its letter, but at this sample size it suffers exactly the defect it criticized in its predecessor.

**What to do about it:** loosen nothing and invent no new threshold. What is needed is more finding mass, and the natural route is M2: every new check (`script/missing`, `link/broken`, `skill/frontmatter`, `frontmatter/invalid`) produces its own findings over the same corpus. Once the validation group reaches ~10 findings, condition 6 becomes a measurement again rather than a formality. Until then, the honest number to cite is not "100% precision" but "3 of 3, with 7 of 8 repos silent".

## The full corpus

The corpus produces **26 findings, 20 true and 6 false**, so 76.9% aggregate — and the aggregate is
the least useful number here, for the reason [ADR-0009](../../docs/adr/0009-precision-is-counted-in-quiet-repos.md)
gives. The numbers the project holds itself to are in the condition table above.

Every row below is derived from the committed snapshots in `snapshots/` and the `holdout` field in
`scripts/corpus-repos.ts`. The verdicts are the ones recorded in the rounds named in the last column;
no finding appears here without one.

| Repo | Findings | True | False | Group | Verdict recorded in |
|---|---|---|---|---|---|
| `tursodatabase/turso` | 4 | 4 | 0 | calibration | rounds 8, 12 |
| `openai/codex` | 3 | 3 | 0 | calibration | round 1 |
| `modelcontextprotocol/typescript-sdk` | 3 | 3 | 0 | **validation** | round 8 |
| `1amageek/SwiftAgent` | 2 | 2 | 0 | **validation** | round 13 |
| `raphaelmansuy/edgecrab` | 2 | 0 | 2 | **validation** | round 13 |
| `fancy1108/Clutch` | 2 | 1 | 1 | **validation** | round 16 |
| `Endle/fireSeqSearch` | 1 | 1 | 0 | **validation** | rounds 13, 17 |
| `CrossPaste/crosspaste-desktop` | 1 | 1 | 0 | **validation** | round 13 |
| `northword/zotero-format-metadata` | 1 | 0 | 1 | **validation** | round 13 |
| `cloudflare/workers-sdk` | 1 | 1 | 0 | calibration | round 1 |
| `calcom/cal.com` | 1 | 1 | 0 | calibration | round 1 |
| `colinhacks/zod` | 1 | 1 | 0 | calibration | round 10 |
| `emdash-cms/emdash` | 1 | 1 | 0 | calibration | rounds 6, 8 |
| `mattpocock/course-video-manager` | 1 | 1 | 0 | calibration | rounds 6, 7 |
| `saubakirov/KZ-IT-telegram-list` | 1 | 0 | 1 | calibration | round 13 |
| `vercel-labs/marketing-team-eve-template` | 1 | 0 | 1 | calibration | round 3 |
| the other 50 | 0 | — | — | — | — |

**`github/spec-kit` is no longer in this table.** It carried the corpus's first false positive, open
from round one — `.goose/recipes/`, another tool's convention — and round fourteen closed the class
that produced it. The repo is still in the corpus and is now silent. The finding and the argument it
generated stay in the history below, where they happened.

Split by group: **validation 12 findings, 8 true and 4 false**, in 7 of its 32 repos; **calibration
14 findings, 12 true and 2 false**, in 9 of its 34 repos. Only the first half measures anything.

---

## Validation group, one by one

Twelve findings, in 7 of the 32 repos. These repos were added after the heuristics were frozen and
none of them was looked at to derive a rule, so their false positive rate is the only honest
out-of-sample number the project has.

### True positives (8)

**1–3. `modelcontextprotocol/typescript-sdk` `CLAUDE.md:87`, `:93`, `:98`**

`packages/server/src/server/sse.ts` — the document says: "**SSE** (`packages/server/src/server/sse.ts`, `packages/client/src/client/sse.ts`) - Legacy HTTP+SSE transport". The client one exists; the server one does **not**. The real file lives at `packages/server-legacy/src/sse/sse.ts`: the package was renamed to `server-legacy` and the internal path was restructured.

`packages/server/src/server/auth/` — "Full OAuth 2.0 server implementation in `packages/server/src/server/auth/`". That directory does not exist. The real implementations are in `packages/server-legacy/src/auth` and `packages/core-internal/src/auth`. Same rename.

`packages/client/src/client/auth-extensions.ts` — "OAuth client support in `packages/client/src/client/auth.ts` and `packages/client/src/client/auth-extensions.ts`". The first exists and is not reported; the second does not, because the real file is **`authExtensions.ts`**, camelCase and without the hyphen. Real name drift, of the kind an agent cannot guess.

Three findings from one cause, counted as three. Drift events: one.

**4–5. `1amageek/SwiftAgent` `AGENTS.md:701` and `CLAUDE.md:701`**

A Markdown link to `docs/SECURITY.md`. The directory is `Docs/`, capitalised, so on a case-sensitive filesystem the path does not resolve. The same line appears in both files and neither is a symlink or an alias of the other, so it is reported twice. Counted as findings it is two; counted as drift events it is **one, written twice**, the same shape as `typescript-sdk`'s three-from-one-cause.

**6. `Endle/fireSeqSearch` `CLAUDE.md:145`**

`fire_seq_search_server/src/query_engine/semantic_query.rs`. There is no `query_engine/` directory; `semantic_query.rs` sits directly in `src/`. The document is one directory out of date.

This is the corpus's **only fixable finding**, and round seventeen checked it at the level of the edit rather than the finding: the rewrite replaces the path and nothing around it. It is what condition 2 rests on, on a sample of one.

**7. `CrossPaste/crosspaste-desktop` `CLAUDE.md:41`**

`app/src/commonMain/sqldelight/`. The directory does not exist.

**8. `fancy1108/Clutch` `CLAUDE.md:190`**

"Single-context repo: one `CONTEXT.md` + `docs/adr/` at the repo root." `docs/agents/domain.md` on the same line exists and is not reported; **`docs/adr/` does not**. Classified true in round sixteen, with the doubt recorded there: the sentence could be read as a convention that materialises when the first ADR is written. The strict reading was taken.

### False positives (4)

**1. `northword/zotero-format-metadata` `AGENTS.md:44`** — `content/scripts/linter.js`, a bundle the sentence itself describes as generated. The class is open.

**2–3. `raphaelmansuy/edgecrab` `AGENTS.md:508` and `:614`** — `gateway/run.rs` is a crate nickname for `crates/edgecrab-gateway/src/run.rs`, and `adapters/base.py` belongs to Hermes, a different project the document is comparing itself to. Two false positives in one repo, which is the corpus maximum and what condition 5 is measured against. No rule shape has been proposed for either.

**4. `fancy1108/Clutch` `.cursor/rules/cli-whitelist-docs.mdc:3`** — a Cursor `globs:` frontmatter value holding a **comma-separated list**, which the frontmatter extractor claims as one path. All three files in it exist; the joined string does not. Left open on purpose: the fix *raises* detection, and it would burn a validation repo the round after it arrived. See the round-sixteen ledger.

All four are in the round-sixteen ledger, all four are unfixable, and none of them can therefore become a bad autofix.

---

## Calibration, one by one

Fourteen findings, in 9 of the 34 repos whose findings were already looked at to tune heuristics.
**They do not measure precision**; they are here for the record.

### True positives (12)

**`openai/codex` `AGENTS.md:35`** — `codex-rs/codex-mcp/src/mcp_connection_manager.rs`, with a "prefer using" aimed at the agent. There is no `mcp_connection_manager.rs` anywhere in the repo.

**`openai/codex` `AGENTS.md:265` and `275`** — `app-server-protocol/src/protocol/v2.rs`. The directory has `common.rs`, `mod.rs`, `mappers.rs`; there is no `v2.rs`.

**`tursodatabase/turso` `.claude/skills/cdc/SKILL.md:158`, `242`, `246`** — `core/translate/emitter.rs` three times, as section headings. `core/translate/` exists; there is no `emitter.rs` anywhere in the repo. Found while turso was in validation.

**`tursodatabase/turso` `.claude/skills/mvcc/SKILL.md:91`** — `make test-mvcc`, in a code fence. The `Makefile` offers no such target. This is the corpus's only `script/missing` finding, and round twelve rejected eight of the nine that check's first draft produced before keeping this one.

**`cloudflare/workers-sdk` `AGENTS.md:140`** — `.github/PULL_REQUEST_TEMPLATE.md`. The real one is `.github/pull_request_template.md`, lowercase. True but minor: on a case-sensitive filesystem the path does not exist, and that is what an agent sees in CI.

**`calcom/cal.com` `AGENTS.md:130`** — `packages/features/ee/workflows/lib/constants.ts`. The directory exists, the file does not. `CLAUDE.md`, which is an identical copy, is reported as an alias instead of counting twice.

**`colinhacks/zod` `.claude/skills/security-advisory/SKILL.md:3`** — the corpus's only `frontmatter/invalid` finding: an unquoted `description:` whose text contains colons, which does not parse. Round seventeen closed the question of fixing it: the value also contains quoted phrases, so quoting it means escaping them, and a `--fix` that escapes is a YAML serializer.

**`emdash-cms/emdash` `AGENTS.md:398`** — `tests/e2e/`. Reported twice through a symlink in round six; round eight collapsed symlinked sources, and it is now one finding for one drift event.

**`mattpocock/course-video-manager` `CLAUDE.md:27`** — `.github/workflows/test.yml`. The survivor of the five false positives this repo produced in round six, all from one cause: paths written relative to an external root named in the first line. Round seven closed that class and this one stayed.

### False positives (2)

**`saubakirov/KZ-IT-telegram-list` `.claude/commands/tfw-init.md:141`** — `.tfw/adapters/antigravity/rules/`, a framework's own directory. Free to leave open: no general rule reaches it.

**`vercel-labs/marketing-team-eve-template` `AGENTS.md:136`** — `writing-quality/references/ai-phrases-to-avoid.md`, a third-party convention no prose rule reaches. Open since round three, and the longest-standing false positive in the corpus.

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

## Sixth round, 2026-09-10: the debt is paid, and condition 5 breaks

Five repos added to the validation group, chosen for the profile that produces findings and, as always, assigned before any finding was looked at. Three of them are the replacements owed under condition 9; the other two are extra.

| Repo | Domain | Sources | Findings |
|---|---|---|---|
| `emdash-cms/emdash` | TS monorepo | **15** | 2, both **true** |
| `mattpocock/course-video-manager` | TS, 10 skills | 11 | 6 — **1 true, 5 false** |
| `Universal-Commerce-Protocol/ucp` | Python | 2 | 0 |
| `awcodes/mason` | PHP | 1 | 0 |
| `mattpocock/sandcastle` | TypeScript | 2 | 0 |

The validation group is now **20 repos, 55 sources, 11 findings** — the mass it has been missing since the first measurement, when condition 6 rested on three findings from one root cause.

### `emdash-cms/emdash`: a true positive, reported twice through a symlink

Both findings are the same claim, `AGENTS.md:398` and `.claude/CLAUDE.md:398`:

> **Structure:** `tests/unit/`, `tests/integration/`, `tests/e2e/` (Playwright).

`tests/unit/` and `tests/integration/` exist under `infra/emdash-bot/` and `packages/core/`, and ADR-0005's suffix rule correctly stays quiet on both. **`tests/e2e/` exists nowhere**: the end-to-end tests live at `e2e/` in the root and at `apps/release-service/e2e`. The document states a three-part convention and one third of it is no longer true. **Real drift**, and a subtle catch — the tool found the odd one out of a list where the neighbours check out.

It is reported twice because `.claude/CLAUDE.md` is a **symlink** to `../AGENTS.md` (git mode `120000`). `readFile` follows it, so the same bytes are audited under two paths, and `collapseDuplicates` does not merge them because it keys on the directory as well as the content — deliberately, as `harehare/mq` confirmed two rounds ago.

Counted as findings it is two; counted as drift events it is **one, found twice**, the same shape as `typescript-sdk`'s three-from-one-cause. It is not a false positive — the claim is stale in both files — but it is noise of exactly the kind `collapseDuplicates` exists to prevent, and **following a symlink to a file already audited is a defect worth its own fix**.

### `mattpocock/course-video-manager`: five false positives from one cause

`.claude/skills/document-ai-hero-api/SKILL.md` documents the API of **a different project**. Its section opens:

> Read the AI Hero API source at `~/repos/ai/course-builder/apps/ai-hero/src/`. Focus on:
>
> - **REST endpoints**: `src/app/api/` — each folder is a route segment.
> - **tRPC routers**: `src/trpc/api/routers/`
> - **Database schema**: `src/db/schema.ts`
> - **Auth**: `src/app/api/auth/`

This repo has no `src/` directory at all. Every one of those paths is relative to the external root named in the first line. **Five false positives, one mistake.**

Two classes, and they are not equally hard:

1. **`~/` is a home-directory path**, pointing outside the repo to the reader's own machine. Exactly the same category error as `#`: a syntax the extractor does not know, with a one-line fix and no judgement involved. It closes 1 of the 5.
2. **A section rooted at an external path.** `namesAnotherRepo` already handles this when the other repo is named as a `github.com` URL; here the root is a filesystem path, and the four remaining claims are relative to it. Closing this needs the rule to carry a *section* scope rather than a sentence or a two-line window, which is a larger change than anything attempted so far. It closes the other 4.

The sixth finding, `CLAUDE.md:27` — "the full unfiltered suite runs in CI on every PR (`.github/workflows/test.yml`)" — is **real drift**. `.github/workflows/` holds eight files and none of them is `test.yml`.

### What this round says about the criteria

Condition 5 breaks and condition 6 holds, and that is the design working rather than a contradiction. The quiet-repo rate measures **how many users would see noise** — 46 of 49 repos see none. The per-repo cap measures **how bad it gets for the unlucky one** — five spurious findings in a single run, which is the experience that gets a tool uninstalled.

A single aggregate would have averaged those into 66.7% and said nothing useful about either.

## Seventh round, 2026-09-10: the two classes behind condition 5

Both classes from `course-video-manager` were closed and the full corpus re-run over all 49 repos.

**`~/` is a home-directory path.** A one-line discard rule, `home-path`, the same category error as `#`: nothing under the reader's home can be verified against a repo index, and nothing in a repo is named `~`. No judgement involved.

**A section rooted somewhere else.** This is the first rule in the project with **section** scope rather than a line or a two-line window, and it needed that: one sentence establishes the root and the claims are four bullets below it, past every boundary the existing rules respect. `namesAnotherRepo` already covers the case where the other repo is a `github.com` URL; it cannot cover a filesystem root, and it cannot reach down the list.

Two constraints keep it from swallowing documents:

- **The root has to be a directory.** `~/.config/gh/hosts.yml` is a file mentioned in passing; only a directory is something other paths can be relative to. Without this, one dotfile reference would silence every real claim in its section.
- **The scope is one markdown section**, heading to heading. Not the document.

It is computed **once per source** rather than once per claim, because a document with two hundred claims would otherwise rescan itself two hundred times against a 500 ms end-to-end budget.

**The measurement.** One snapshot changed. `course-video-manager` went from 6 findings to 1: the five false positives gone, the true one — `.github/workflows/test.yml`, which does not exist among its eight workflows — kept. **Nothing else moved across the other 48 repos.**

Findings 21 → 16. False positives 7 → 2. True positives 14 → 14.

### The bill, and why it reads differently this time

The rules came from a validation repo, so `mattpocock/course-video-manager` moves to calibration under condition 9 and one replacement is owed.

Round five's caution does not carry over. There, validation reached 100% partly because `eve-template` — the repo still failing — left the group in the same operation, and this document said so at the top rather than claiming a result. Here the repo leaves **with zero false positives**: it was fixed, not removed. Validation is 19 of 19 with it and 19 of 19 without it.

### What is left, and what it is

| Where | What | Status |
|---|---|---|
| `github/spec-kit` | a third-party tool's convention directory | unresolved **by design**, since the first measurement |
| `eve-template` `AGENTS.md:136` | a generated file described with no generation word | **not reachable by any prose rule**; knowing it requires reading `skill.ts` |
| `emdash` `AGENTS.md:398` | real drift, reported twice through a symlinked `.claude/CLAUDE.md` | **fixed in round eight** |

## Eighth round, 2026-09-10: the symlink, and a bug the corpus caught

`emdash`'s single piece of drift was reported twice because `.claude/CLAUDE.md` is a symlink to `../AGENTS.md`. Fixed in discovery rather than in `collapseDuplicates`, because the two are not the same problem: that function merges byte-identical **copies within a directory** and keys on the directory on purpose, which `harehare/mq` confirmed. A symlink has no such defence — one file, one `baseDir` that actually applies.

**Findings 16 → 15.** True positives go 14 → 13, and no detection was lost: those 14 covered 13 distinct drift events, and now 13 findings cover the same 13.

### Two things went wrong on the way, and both were caught before the corpus

**Comparing a path to its own realpath is not how you find a symlink.** The first version decided which entry was the link by testing `absPath === realpathSync(absPath)`. Those differ whenever an *ancestor* directory is a symlink — `/tmp` on macOS — so every file looked like a link. The unit test caught it immediately. In production it would have misfired on any repo living under a symlinked path.

**And the corpus caught an unintended behaviour change.** The second version collapsed symlinks in *any* directory, and four repos changed which file they reported: `zod`, `git-mcp-server`, `sandcastle` and `rust-analyzer` all link `AGENTS.md` to a `CLAUDE.md` beside it, and promoting "the real file" flipped the reported source from `agents-md` to `claude-md`.

That is a regression with no upside. Same directory means same `baseDir`, so there is nothing to correct, and `collapseDuplicates` already merges them with a documented preference for `AGENTS.md`. The rule now only acts **across directories**, which is the case where the two paths genuinely disagree about where relative paths resolve from. After the restriction, one snapshot changed instead of five.

Neither mistake would have been visible from reading the diff of the change itself. The first needed a test, the second needed 49 real repositories.

### The bill

`emdash` moves to calibration under condition 9, so two replacements are now owed. Like `course-video-manager`, it leaves clean.

### The decision taken, 2026-09-10

Condition 6 was rewritten. [ADR-0009](../../docs/adr/0009-precision-is-counted-in-quiet-repos.md) withdraws the aggregate-precision ratio and replaces it with the **quiet-repo rate**: at least 90% of repos producing zero false positives, over the whole corpus and over the validation group taken alone.

When the ADR was written the rate stood at 93.2% over the corpus and 88.89% over validation, so the rewritten criterion was **unmet by 1.1 points** — deliberately, because a replacement tuned to pass that day's numbers would have been the same mistake in a new coat. The ADR predicted that closing `bloom`'s class would take validation to 94.1% and the corpus to 95.5%.

The fifth round did exactly that, the same day, and the corpus figure landed on 95.5% to the decimal.

The sixth round replaced the three repos owed under condition 9, with two more, and the rate dipped from 95.5% to 93.9% because one of the five was noisy — which is what a measurement is supposed to do. The seventh closed the two classes behind that noise.

Measured now: **47 of 49 = 95.9%** over the corpus and **19 of 19 = 100%** over validation, on a group of 19 repos rather than the 8 the original certification used.

The denominator moved from findings to repos for three reasons, set out in full in the ADR: repos are what the corpus has many of while findings are what the tool deliberately has few of; a user has one repo and never experiences an aggregate; and a repo-level count refuses to divide the cost of crying wolf by how much else the same run got right.

**What is next.** Every condition is met, so none of these blocks anything; they are the honest to-do list of a passing measurement.

1. **Two replacement validation repos**, owed for `course-video-manager` and `emdash`. The profile that produces findings: context files of 10 KB or more, ideally several sources per repo. The group is at 18 repos but only 3 findings, which is thin again — replacing them matters more for condition 7 than for condition 6.
2. Bring ADR-0006's wording of condition 9 in line with what is actually applied — classifying a finding is free, deriving a rule from it is not — as set out above.
3. Keep adding repos. Eight rounds have shown that the number moves when the corpus grows, and that is the only way this measurement stays honest. It has been wrong twice by being too small, and round eight showed the corpus catching a regression that no amount of reading the diff would have.

---

## Ninth round, 2026-09-10: `link/broken` lands and moves nothing

The first check added since M1 closed. `AGENTS.md` § Verification and `.scratch/m2-other-tier-1-checks/spec.md` § "The obligation nobody should skip" both say the same thing: new finding surface over 49 repositories, so the nine conditions get re-checked aggregate rather than inherited.

**Not one snapshot changed.** 49 repos, 177 sources, 15 findings, identical to the eighth round. Every condition therefore holds exactly where it was — corpus 47 of 49 = 95.9%, validation 19 of 19 = 100%, zero fixable.

### That zero had to be shown not to be vacuous

A check that never runs also changes no snapshot, so the number that matters is not the findings, it is the claims. Measured directly over the corpus:

| | |
|---|---|
| Link claims extracted from discovered sources | **112** |
| Of those, same-file anchors (`#section`) | 110 |
| Anchors actually resolved against a parsed document | **110** |
| Targets skipped because the file is not in the index (`path/missing`'s) | 2 |
| Findings | **0** |

So the check read 110 anchors written by other people and agreed with all of them. That is a real quiet, not an absent one.

### What the corpus does not say

**It contains no true positive for this check**, and therefore no out-of-sample evidence that it detects anything. What fires it is the `anchors` fixture and a scratch repo, both of which we wrote. ADR-0006 condition 7 requires at least one true positive in the validation group and the corpus still meets it — on `path/missing`'s findings, not on this one's.

The honest reading is that `link/broken` is proven **quiet** and unproven **useful**, and that the two need different evidence.

### Why there was so little to find

Across all 377 context files in the 49 clones there are 183 links carrying a fragment, and they break down almost entirely the wrong way for this check:

- **148 are same-file** (`](#section)`), overwhelmingly tables of contents, and a TOC is usually generated from the headings it points at.
- **27 are external**, which the check refuses by construction.
- **6 are cross-file relative Markdown** — `CONTRIBUTING.md#contribution-policy` and four others — and all six resolve.

Cross-file anchors between agent context files are simply rare today. That is a fact about the material, not a defect in the check, and it is the reason the second invocation over this repo's own `docs/` (`driftwatch.docs.config.ts`) is currently vacuous too: not one document here writes a `](...#...)` link either.

### What would change the reading

A validation repo whose context files cross-reference each other by anchor. That is a narrower profile than the one condition 9 already owes two replacements for, and it is worth combining: a repo with several large sources **that link to each other** would serve both.

---

## Tenth round, 2026-09-10: `frontmatter/invalid` lands and finds real drift

The second check added since M1 closed, and the first one whose arrival **moved a snapshot**.

**One snapshot changed, one new finding, and it is true.** 49 repos, 177 sources, **15 → 16 findings**. Every false positive count is untouched, so every condition holds where round nine left it: corpus 47 of 49 = 95.9%, validation 19 of 19 = 100%, `fixable: 0`.

### The finding: `colinhacks/zod` `.claude/skills/security-advisory/SKILL.md:3`

```
description: Triage a draft security advisory in colinhacks/zod — ... because the workflow is different: the report is private, ...
```

An unquoted plain scalar holding `: `. That is not valid YAML in any spec-compliant parser — `yaml` calls it `Nested mappings are not allowed in compact mappings` — so **the frontmatter of this skill does not load**, and the description that decides whether the skill is ever invoked is not read by anything.

Classified **true positive**, and it is the best kind: nobody could have found it by reading the file, the document looks entirely normal, and the failure is silent. It is also the first out-of-sample true positive contributed by a check other than `path/missing`, which is the evidence round nine explicitly said `link/broken` was missing.

The repo is calibration, not validation, so condition 7 still rests on `path/missing`'s three.

### The quiet had to be shown not to be vacuous, again

The type half produced nothing, and a check that never runs also produces nothing. Measured directly over the corpus's discovered sources:

| | |
|---|---|
| Sources with a leading `---` block | **33** of 177 |
| Blocks refused as not key-shaped | 0 |
| Blocks refused for holding a template placeholder | 0 |
| Blocks that parse | **32** |
| Blocks that do not | **1** (the finding above) |
| Top-level key claims extracted | **80** (74 skill, 4 subagent, 2 agents-md) |
| Of those, keys the table types | **65** |
| Type findings | **0** |

So the table was consulted 65 times against fields other people wrote and agreed every time. The two prose gates cost nothing here — no corpus source has a leading block that is not frontmatter, and none is a template — which means they are unproven rather than unused: they exist for the classes the fixture demonstrates, and the corpus neither confirms nor denies them.

### What the corpus says about the table, and what was deliberately not done with it

Two observations from the 33 real blocks, both left unacted on:

- **`disable-model-invocation` and `license` appear on skills** (7 and 6 times), and the table types the first only for `command`. Adding it for `skill` would type three more claims.
- **`argument-hint` is always quoted** in the corpus (`"[pr-url] [output-dir]"`), so it is a string and the exclusion of that key cost no detection. The unquoted `argument-hint: [x]` the exclusion exists for does not appear among the discovered sources.

Neither the addition nor the reversal was made, and the reason is condition 9. The files carrying those keys belong to `alpinejs/alpine` among others, which is **in the validation group**: deriving a rule from what they contain would burn the repo and owe a replacement. The table was written from the documented formats before the corpus was read, and it stays that way. What the corpus is allowed to do here is report, and it reports that the table is conservative.

### The class this check cannot have

`frontmatter/invalid` has no suggestion and nothing `fixable`, by construction — quoting somebody's value is an edit for M3 to decide on with this evidence in hand. Condition 2 is therefore met the way condition 2 is best met: there is nothing for it to be wrong about.

---

## Eleventh round, 2026-09-10: `skill/frontmatter` reads 30 real skills and agrees with all of them

The third check added since M1 closed, and the one with the largest new surface: five rules over every `SKILL.md` in the corpus.

**Not one snapshot changed.** 49 repos, 177 sources, 16 findings, identical to the tenth round. Every condition holds where it was — corpus 47 of 49 = 95.9%, validation 19 of 19 = 100%, `fixable: 0`.

That last number matters more than usual this time. `skill/frontmatter` carries **the first `fixable` finding the project can produce** (a `name` corrected to its directory, SPEC § 8), and `corpus-bookkeeping.test.ts` asserts `fixable: 0` across the corpus. The assertion survived because the rule never fired, not because it cannot.

### The quiet, measured

| | |
|---|---|
| `skill` sources discovered | **31** |
| Blocks claimed by the check | **30** |
| The 31st | `colinhacks/zod`'s unparseable block — `frontmatter/invalid`'s finding, and this check stays silent on it |
| `name` fields read | **30** |
| Of those, matching their directory | **30** |
| `description` fields read | **30** |
| Shortest description | **70 characters** |
| Median description | **151 characters** |
| Other top-level keys read | **14**, in 8 distinct names |
| Findings | **0** |

Two things are worth reading off that table rather than out of the zero.

**The division with `frontmatter/invalid` is visible in it.** 31 skill sources, 30 blocks claimed: the one that is missing is precisely the one whose YAML does not parse, and it produces exactly one finding, from the other check. That is the rule ticket `06` wrote down, working on a real file rather than on a fixture.

**The description-length rule has a 50-character margin.** The shortest real description in the corpus is 70 characters against a floor of 20. It is the rule least likely to ever fire on a maintained repository, and also the only one of the five that is an *opinion* — the other four are arithmetic over two strings, this one is a judgement about what makes a skill discoverable, inherited from SPEC § 3. Worth knowing that it is not what the check earns its keep with.

### The corpus cannot adjudicate the unknown-key narrowing

All 14 non-required keys are on the known list: `disable-model-invocation` (3), `license` (3), `metadata` (3), `allowed-tools` (2), `argument-hint` (2), `user-invocable` (1). So there is no near-miss in the corpus, and **the wide rule and the narrow one both produce zero here**.

[ADR-0011](../../docs/adr/0011-an-unknown-key-is-only-reported-as-a-near-miss.md) is therefore a shape argument, like ADR-0010 before it, and it says so: a key added to the format after our list was written is a new word rather than a typo of an old one, so a stale list can only cost detections. The corpus neither confirms nor denies it. What the corpus does say is that the list, written from the documented format before these repos were read, covers every key 30 real skills use.

### What was not done, again

Round ten recorded that `disable-model-invocation` and `license` appear on real skills while `frontmatter/invalid`'s type table only types the first for `command`. That is still true and still unacted on, for the same reason: the files are `alpinejs/alpine`'s among others, which is in the validation group.

The known-key list of *this* check does include both — because it was written from the documented format, before the measurement, not from it. That ordering is the whole difference between a measurement and a mirror, and it is worth stating plainly in the one round where the two lists overlap.

---

## Twelfth round, 2026-09-10: `script/missing` lands, and the corpus rejects half of its first draft

The fourth check added since M1 closed, and the first one to read **code fences**. Its surface is not the 33 frontmatter blocks the last three rounds moved over: it is every command in 177 sources.

**One snapshot changed, one new finding, and it is true.** 49 repos, 177 sources, **16 → 17 findings**. `fixable: 0` holds, every false positive count is untouched, so every condition stands where round nine left it: corpus 47 of 49 = 95.9%, validation 18 of 18 = 100%.

That is the *second* measurement. The first one produced **nine** findings across six repos, and reviewing them by hand is what this round is actually about.

### What the first draft reported, and why eight of nine were false

| Repo | Finding | Verdict |
|---|---|---|
| `unjs/h3` | `pnpm vitest run <path>      # run specific test` → **suggested `pnpm test run <path>`, `fixable`** | false |
| `unjs/h3` | the same shape, twice more, both `fixable` | false |
| `vercel/next.js` | `pnpm prettier --write <file>` | false |
| `vercel/next.js` | `pnpm prettier --with-node-modules ... --write <files>` | false |
| `calcom/cal.com` | `yarn biome check --write .  # Lint and format` | false |
| `emdash-cms/emdash` | `pnpm wrangler types` | false |
| `spatie/bloom` | `make            list the targets        make lint       Tools/house-rules.sh` | false |
| `tursodatabase/turso` | `make test-mvcc` | **true** |

Three root causes, and all six repos are calibration, so no validation repo was burned under condition 9.

**1. A bare `pnpm X` is not a script claim.** `pnpm vitest`, `pnpm prettier`, `pnpm wrangler` and `yarn biome` all run a **binary** from `node_modules/.bin`, which we do not index and cannot verify. `SPEC.md` § 3 listed `pnpm X` and `yarn X` among the forms to detect, and the specification was wrong: the form is ambiguous by construction. It was narrowed rather than the heuristic weakened — [ADR-0012](../../docs/adr/0012-a-bare-pnpm-x-is-not-a-script-claim.md) — and only the explicit `run`/`task` keyword, plus `make`, survive. `make` keeps its bare form because make has no fallback: its argument is a target or nothing.

Three of these were **`fixable`**, which is the one class ADR-0006 condition 2 admits none of. `pnpm vitest run <path>` sits one edit from the `test` script, so the tool offered to rewrite a working command into a broken one. It is the exact failure mode the condition exists for, and it was caught by the corpus rather than by a fixture — the fixtures were green.

**2. A trailing comment is not part of the command.** `pnpm vitest run <path>      # run specific test` carried the comment into `Claim.text`, and would have carried it into whatever `--fix` wrote back.

**3. A code block can be a table.** `spatie/bloom`'s `Makefile` is documented as a two-column index, and read as a command its first line invokes a target called `list`. Aligned arguments are the signal: two spaces in a row are a column, and a real command does not align. The rule costs the detection of `make swiftlint  Tools/swiftlint.sh` on the same page, which is a fair price for not reading a table as a program.

### The one true finding: `tursodatabase/turso` `.claude/skills/mvcc/SKILL.md:91`

```bash
# TCL tests with MVCC
make test-mvcc
```

The `Makefile` has 40-odd targets, `test-compat`, `test-single`, `test-fuzz` among them, and **no `test-mvcc`**. It has no `include` either, so the enumeration is complete rather than partial. A skill tells an agent to run a target that does not exist, and no suggestion is offered because nothing is within two edits of it.

Classified **true positive**. It is the second out-of-sample true positive from a check other than `path/missing`, and the repo is calibration, so condition 7 still rests on `path/missing`'s three.

### The quiet, measured

A check that never fires also produces nothing, so what the 93 claims did is worth reading:

| | |
|---|---|
| Code fences in the corpus sources | **625** |
| Of those, shell or undeclared | **240** |
| Script claims extracted | **93** |
| From inline code / from fences | **67 / 26** |
| By manager | `make` 45, `npm` 32, `pnpm` 11, `bun` 5, `yarn` 0, `deno` 0 |
| Verified against a manifest and found | **84** |
| Dropped: no manifest of that runner anywhere | **8** |
| Dropped: nearest manifest not enumerable | **0** |
| Findings | **1** |

Three things follow.

**84 real commands were looked up and 84 resolved.** That is not a vacuous zero: the parser reads the right token often enough that 90% of what it claims is verifiably correct, and the one miss is a genuine one.

**The `include` refusal is unproven, not unused.** No Makefile in the corpus that some document points at has an `include` or a pattern rule in a position that mattered — turso's `%` characters all live in recipes, which the reader skips because a tab is what makes a recipe. The rule exists for the class the fixture demonstrates; the corpus neither confirms nor denies it.

**`deno` and `yarn` contributed nothing.** The deno half of the check is therefore fixture-only evidence, and `yarn run X` — which, unlike `pnpm run X`, does accept a binary in Yarn's own resolution — has never been exercised out of sample. ADR-0012 records that as the residual risk and what to do if it ever shows up: drop `yarn run` too, on principle, rather than special-case a repo.

### What this round says about the method

The corpus caught a `fixable` false positive class **on its first run of a new check**, in repos whose snapshots had been green for four rounds. Nothing in the fixtures could have: we wrote them, and `pnpm vitest` is not a shape anybody invents while writing a test for their own parser. [ADR-0007](../../docs/adr/0007-the-corpus-does-not-run-in-ci.md) argues the corpus is a gate a person has to walk through; this round is the clearest evidence so far that the walk is the point.

### A counting error in the record, corrected here

Rounds nine, ten and eleven cite the validation group as **19 of 19**, and the criterion table above said the same. The group has held **18** repos — `holdout: true` appears 18 times in `scripts/corpus-repos.ts`, and the header of this document has said 18 throughout, which is the figure `corpus-bookkeeping.test.ts` pins.

So it was a miscount, not a membership change, and it is corrected above rather than left standing. It changes no verdict: every validation repo produces zero false positives, so the percentage is 100% at either denominator. The historical rounds are left as written, because rewriting a measurement after the fact is worse than recording that its denominator was off by one.

Worth noting where the hole was: the test reads the header sentence and the validation measurement line out of this prose, so those cannot drift, but the criterion table is not read by anything. The number that decides condition 6 was the one nobody was checking.

---

## Thirteenth round, 2026-09-10: thirteen validation repos, and the measurement M2 owed

M2 set itself one obligation beyond its checks: **re-measure condition 6** once the validation group carried around ten findings, "and write the result down, whatever it is". Four new checks did not get it there. Rounds nine to twelve added two findings between them and **both landed in calibration repos**, so the group stayed at the same three findings ADR-0006 had already flagged as too thin to carry a percentage.

Finding mass comes from repositories, not from checks. So thirteen repositories were added, all **validation**.

### How they were chosen, and why that matters here

On metadata only, before a single line of their content was read: public, not archived, not a fork, under ~65 MB of history, and holding more than 1.5 KB of agent context files. GitHub code search for `AGENTS.md` and `CLAUDE.md` gave 200 candidates; 60 survived the size filter; 13 were taken.

Nothing was inspected to guess whether a repo would produce a finding. That is not fastidiousness: a validation group selected on the outcome measures the selection, and the whole reason this document exists is that the calibration group's number already suffers from it.

The language spread is deliberate. The corpus was TypeScript-heavy, and `path/missing` reads a different document in a **Go, Rust, R, Swift, Kotlin, Zig, Java or C** repository — different path shapes, different build commands, different habits for naming a file in prose.

One candidate was refused: `HorusGoul/eslint-plugin-react-render-types` had the most context bytes of all (72 files, 221 KB against 444 KB of history), which makes it a skill collection rather than a repo with skills. Dozens of findings from one templated root cause would have moved the percentage without adding evidence.

### The result

**62 repos · 227 sources · 42 findings.** The validation group goes from 18 repos and 3 findings to **31 repos and 28 findings**, and the two replacements owed since round five are paid.

| Repo | Findings | True | False |
|---|---|---|---|
| `1amageek/SwiftAgent` | 2 | 2 | 0 |
| `Endle/fireSeqSearch` | 1 | 1 | 0 |
| `CrossPaste/crosspaste-desktop` | 1 | 1 | 0 |
| `aptos-labs/aptos-ts-sdk` | 4 | 0 | 4 |
| `northword/zotero-format-metadata` | 1 | 0 | 1 |
| `saubakirov/KZ-IT-telegram-list` | 16 | 0 | 16 |
| `podman-mcp-server`, `huxtable`, `gosec`, `attyx`, `Pktgen-DPDK`, `exoscale/cli`, `opc-ua-demo-server` | 0 | — | — |

Seven of the thirteen are silent. Four of the four true positives are the kind worth having.

### The four true positives

- **`SwiftAgent` `AGENTS.md:701` and `CLAUDE.md:701`** — `[docs/SECURITY.md](docs/SECURITY.md)`, and the file is `Docs/SECURITY.md`. The link works on the author's case-insensitive filesystem and 404s on GitHub. The suggestion names the right file. Two findings because the two documents are not byte-identical, so neither is an alias of the other.
- **`fireSeqSearch` `CLAUDE.md:145`** — "Query path: `fire_seq_search_server/src/query_engine/semantic_query.rs`". There is no `query_engine/` directory; the file is `fire_seq_search_server/src/semantic_query.rs`. **The project's first `fixable` corpus finding, and it is correct**: one candidate, same basename, parent one segment off.
- **`crosspaste-desktop` `CLAUDE.md:41`** — a list of four source directories, three of which exist. The fourth says `app/src/commonMain/sqldelight/`; `app/src/commonMain/` holds `composeResources` and `kotlin` only, and the schema lives in `shared/src/commonMain/sqldelight`. An agent told to look for schema definitions under `app/` finds nothing.

### Condition 2 is broken, and by exactly the shape it was written for

Three `fixable` findings in the corpus now. One is the `fireSeqSearch` one above. The other two are false:

```
.claude/commands/tfw-config.md:123  .agent/workflows/tfw-task.md  -> .claude/commands/tfw-task.md (1, fixable)
.claude/commands/tfw-init.md:184    .agent/workflows/tfw-plan.md  -> .claude/commands/tfw-plan.md (1, fixable)
```

The source is a table row and a bullet describing **where a workflow file is copied for another agent tool**:

```
| `.claude/commands/tfw-task.md`, `.agent/workflows/tfw-task.md` | Adapter-only meta-workflow; ... |
  - Antigravity: `.agent/workflows/tfw-plan.md`, `tfw-handoff.md`, `tfw-review.md` (+ others)
```

`.agent/workflows/` is Antigravity's directory, not this repo's. The suggestion is not merely useless, it is **actively wrong**: applying it would rewrite the Antigravity path into the Claude Code one and destroy the distinction the table exists to draw. ADR-0006 condition 2 has no rate modulating it for this exact reason, and this is the first time the corpus has produced the failure.

### The three false-positive classes, unfixed

Twenty-one false positives, three root causes, and **no rule was changed in this round** — deliberately. Condition 9 prices a fix against a validation repo at moving that repo to calibration plus a replacement, and the point of this round was the measurement. What to do about them is the next decision, not this one.

**A. An index placeholder — 7 findings, `KZ-IT-telegram-list`.** `research/iterN/` and `research/iterN/RES.md`, where the document says outright "(N = highest folder number + 1, or 1 if none)". `discard.ts` already refuses `NNNN`, `XXXX` and `ID` as segments; `iterN` is the same convention with a prefix, and no `research/` directory exists at all.

**B. Another tool's layout, and copy instructions into it — 9 findings, `KZ-IT-telegram-list`.** `.agent/rules/`, `.agent/workflows/`, `.cursor/rules/`, `.cursor/rules/tfw.mdc`, `.tfw/adapters/antigravity/rules/`. The lines are of the form "Cursor: copy `tfw.mdc.template` → `.cursor/rules/tfw.mdc`" — a target that will exist after the copy, in a directory belonging to a different agent tool. Two mechanisms in the extractor already cover halves of this (`isCreateInstruction` for what a document asks you to create, `namesAnotherRepo` for what belongs elsewhere) and neither reaches an arrow in a table row.

**C. A dependency protocol specifier — 3 findings, `aptos-ts-sdk`.** `` `link:../..` `` in prose about how the examples resolve the SDK. It is npm's `link:` protocol, the same family as `file:`, `workspace:` and `portal:`, and it is not a path any more than `#lib/x` or `~/x` is — both of which `discard.ts` already refuses **as syntax classes**. The normalizer also mangles it: the trailing-punctuation trim turns `link:../..` into `link:../`, so the reported text is not even what the document says.

**D. Two singletons.** `aptos-ts-sdk`'s `upgrade-guides/UPGRADE_GUIDE_X.Y.Z.md` is a version metavariable in a filename, in a sentence that asks the maintainer to *write* the file (the real ones are `UPGRADE_GUIDE_6.0.0.md` and `7.0.0`). `zotero-format-metadata`'s `content/scripts/linter.js` is an esbuild bundle, and the same sentence says so — "(from `src/index.ts` via esbuild)".

### What the numbers say, read honestly

- **Condition 6 is finally a measurement.** 28 validation findings, not 3. It passes: 28 of 31 validation repos are entirely silent, 90.3%, against a 90% floor. It passes *by one repo* — a fourth noisy validation repo would break it.
- **Aggregate precision is 19 true of 42 = 45.2%**, and over validation alone **7 of 28 = 25%**. [ADR-0009](../../docs/adr/0009-precision-is-counted-in-quiet-repos.md) withdrew that ratio as a criterion precisely because one document can carry sixteen findings from two root causes, and this round is the clearest illustration the corpus has produced: one repo of 62 holds 16 of the 23 false positives. It is reported and it decides nothing.
- **The quiet repos are the real result.** Seven of thirteen new repos, in seven languages the corpus had barely seen, produced nothing at all. That is what condition 6 is designed to count.
- **Two conditions broke, and both broke on documents nobody wrote for us.** That is the corpus working. `fixable: 0` across the corpus was never a property of the rules, only of what the corpus happened to contain — ticket 07 said so when it shipped the first autofix, and ticket 08 repeated it. It is no longer true.

---

## Fourteenth round, 2026-09-10: another tool's directory is not our repo's

Condition 2 broke in the thirteenth round on two autofixable false positives, and it is the one condition with no rate modulating it: a `--fix` that rewrites a document to point at the wrong file makes the next agent act on a lie with confidence. So it was the class to close first.

### The rule

`verify/foreign-tools.ts`: **a path inside an agent tool's configuration root, in a repo that does not have that root, is a statement about the tool and not about the repo.**

The gate is the whole rule. A repo that has `.cursor/` uses Cursor, so a path under it either exists or is real drift and is reported exactly as before. A repo with no `.cursor/` anywhere does not use Cursor, and a mention of `.cursor/rules/tfw.mdc` is documentation.

The list is somebody else's vocabulary — `.claude`, `.agent`, `.cursor`, `.windsurf`, `.aider`, `.continue`, `.cline`, `.roo`, `.kilocode`, `.gemini`, `.codex`, `.opencode`, `.junie`, `.trae`, `.qodo`, `.amazonq`, `.augment`, `.crush`, `.goose`, `.zed` — which [ADR-0011](../../docs/adr/0011-an-unknown-key-is-only-reported-as-a-near-miss.md) argues a tool should not be holding. The direction is what makes this one safe: the list can only make driftwatch **quieter**. An assistant nobody has added keeps producing findings; one added next year costs a detection. Falling behind is free, and being wrong is not available.

`.claude` is on the list too, which is the entry worth arguing about. It is ours, and the gate is what decides: a repo with no `.claude/` directory at all is being audited through its `CLAUDE.md` alone, and a `CLAUDE.md` saying "skills live in `.claude/skills/`" there is saying where they *would* go. What it costs is a repo that deleted its whole `.claude/` and still describes the contents.

### What it moved

**Seven of the eight class-2 findings in `KZ-IT-telegram-list`, including both autofixable ones.** The repo goes from 16 findings to 9 and from 2 fixable to 0, so **condition 2 is repaired**: the one fixable finding left in the corpus is `fireSeqSearch`'s, and it is true.

**And one finding in `github/spec-kit`, which is a calibration repo the rule was not derived from.** `AGENTS.md:464` claimed `.goose/recipes/`; the repo does not use Goose. That finding had been open since the first round and this document had it recorded as "a third-party convention kept by design" — the class was known and thought unfixable. The list was written from the tools' own vocabulary before the corpus was consulted, and `.goose` was on it because Goose is an agent, not because of `spec-kit`. A rule that closes a false positive in a repo it never saw is the only evidence available that a class is general rather than fitted.

The eighth class-2 finding survives: `.tfw/adapters/antigravity/rules/` is the *framework's own* directory in that one repo, and adding `.tfw` to a list of published assistants would be fitting the rule to a single document.

### The bill: one validation repo, and two replacements that are not quiet

The rule was derived from `KZ-IT-telegram-list`'s findings, so ADR-0006 condition 9 moves it to **calibration**. It leaves with nine false positives still open, so unlike rounds eight and nine this one does not leave clean.

Two replacements were added on the same metadata-only basis as the thirteen before them, and **both arrived with two false positives**:

- **`raphaelmansuy/edgecrab`** `AGENTS.md:508`, `gateway/run.rs`. The document names modules as `wire/sse.rs`, `backend/provider.rs`, `backend/adapter.rs` — and those are **real directory suffixes** (`crates/edgecrab-proxy/src/wire/sse.rs`), which is why the suffix rule from round eight passes them. `gateway/run.rs` is the same convention applied to a *crate* nickname: the file is `crates/edgecrab-gateway/src/run.rs` and there is no `gateway/` directory. False, and a harder class than the one already closed — the shorthand is a name for a crate, not a suffix of a path.
- **`raphaelmansuy/edgecrab`** `AGENTS.md:614`, `adapters/base.py` in the cell "`UpstreamAdapter` trait (Hermes `adapters/base.py`)". A Python file in a Rust repo, belonging to a project named in the same cell. `namesAnotherRepo` recognises another repository when it is a `github.com` URL and not when it is a bare product name.
- **`garagon/aguara`** `CLAUDE.md:156` and `:161`, `product/vX.Y.Z/_index.md` and `product/vX.Y.Z/status-YYYY-MM-DD.md`. Version and date metavariables, in two lines that ask you to *create* the file. `discard.ts` refuses `NNNN` and `XXXX` as whole segments; `vX.Y.Z` and `status-YYYY-MM-DD.md` are the same convention inside one.

That third item is the same class as `aptos-ts-sdk`'s `upgrade-guides/UPGRADE_GUIDE_X.Y.Z.md` from the thirteenth round: **three findings, two repos, one root cause**, and both repos are validation.

### Where the conditions stand, and the treadmill in plain sight

**64 repos · 230 sources · 38 findings — 19 true, 19 false.**

| | Round 13 | Round 14 |
|---|---|---|
| Condition 2 (no false autofix) | **broken**, 2 of 3 | **met**, 0 of 1 |
| Condition 5 (no repo above 2 FP) | broken, max 16 | broken, max 9 |
| Condition 6, whole corpus | 91.9% | 90.6% |
| Condition 6, validation | 90.3% | **87.5%, broken** |

Condition 6 did not break because the tool got worse. It broke because the repo carrying nine false positives moved to calibration, where it no longer counts against validation, and the two repos that replaced it brought four between them. Round three named this treadmill; this is the first round where it is visible in a single table.

The honest reading is the one ADR-0009 already argued for: **the percentage of quiet repos is the right measurement and it is noisy at this sample size**, one repo in thirty-two being worth 3.1%. What is not noisy is the ledger of open classes.

### The four open classes, and what each one costs

| Class | Findings | Repos | Cost of closing it |
|---|---|---|---|
| An index placeholder (`research/iterN/`) | 8 | `KZ-IT` (calibration) | **Free.** The repo is already burnt. |
| A version or date metavariable in a segment (`vX.Y.Z`, `status-YYYY-MM-DD.md`, `UPGRADE_GUIDE_X.Y.Z.md`) | 3 | `aguara`, `aptos-ts-sdk` (both validation) | Two validation repos, two replacements |
| A dependency protocol specifier (`link:../..`) | 3 | `aptos-ts-sdk` (validation) | One validation repo (shared with the above) |
| A crate nickname, a foreign project's file, a generated bundle | 3 | `edgecrab`, `zotero` (validation) | Two validation repos, and no rule shape proposed yet |

Condition 5 needs the first two classes closed (`KZ-IT` to 1, `aptos-ts-sdk` to 3 — still above 2, so it needs the third as well). Condition 6 over validation needs any **one** validation repo silenced: closing the metavariable class alone takes `aguara` to zero and the group to 29 of 32 = 90.6%.

None of that was done in this round. The rule that repaired condition 2 was the one worth its price; the rest is a decision about how much of the corpus to burn, and it is recorded here rather than taken quietly.

---

## Fifteenth round, 2026-09-10: the free one, and what "free" does not buy

Eight of the nineteen false positives left after round fourteen were one class in one document, and that document belonged to a repo that had already been moved to calibration in the previous round. So this class cost nothing under condition 9: the contamination was already paid for.

### The rule

`discard.ts` gains one pattern: **a word with a trailing capital standing for a number**.

```
research/iterN/            "Count `research/iterN/` folders
research/iterN/RES.md       (N = highest folder number + 1, or 1 if none)"
research/iterN-1/RES.md
```

The document defines the placeholder in the same sentence that uses it, which is as clear as this ever gets. `PLACEHOLDER_UPPERCASE` already refused `NNNN` and `XXXX` as whole segments; this is the same convention with a word attached, and the arithmetic form (`iterN-1`) is part of the pattern because the corpus contains it.

It is narrow in two ways, both of which cost detections rather than buy them. The word before the capital must be **all lowercase**, so `ModuleX` and `matrixTranspose` are untouched; and the capital must be one of `N M K X Y Z`, so `moduleA` and `partB` still get reported. A tutorial repo with a real `partN/` directory now goes unchecked, which is the price.

### What it moved, and what it did not

**`KZ-IT-telegram-list` goes from 9 findings to 1**, and nothing else in the corpus changed. The one left is `.tfw/adapters/antigravity/rules/`, the framework's own directory in that repo, which no general rule reaches.

**64 repos · 230 sources · 30 findings — 19 true, 11 false.** The false positive count is down 42% in one round.

And **not one condition moved**:

| | Round 14 | Round 15 |
|---|---|---|
| False positives, total | 19 | **11** |
| Condition 5 (no repo above 2 FP) | broken, max 9 | broken, max **4** |
| Condition 6, whole corpus | 90.6% | 90.6% |
| Condition 6, validation | 87.5% | 87.5% |

That is not a disappointment, it is the criterion behaving as designed. [ADR-0009](../../docs/adr/0009-precision-is-counted-in-quiet-repos.md) replaced an aggregate ratio with the **percentage of repos that see no noise at all**, precisely so that eight findings in one already-noisy document could not flatter the number. Eight findings left that document and it is still not quiet, so nothing moves.

The corollary is worth stating because it is the opposite of what a ratio would say: **the cheapest remaining work is worth the least**. What conditions 5 and 6 need is not fewer false positives, it is fewer *repos carrying any*, and the three repos left carrying them are all in the validation group.

### The ledger after this round

| Class | Findings | Repos | Cost of closing it |
|---|---|---|---|
| A version or date metavariable in a segment (`vX.Y.Z`, `status-YYYY-MM-DD.md`, `UPGRADE_GUIDE_X.Y.Z.md`) | 3 | `aguara`, `aptos-ts-sdk` (validation) | Two validation repos. Takes `aguara` to zero, so **condition 6 over validation is repaired**: 29 of 32 = 90.6% |
| A dependency protocol specifier (`link:../..`) | 3 | `aptos-ts-sdk` (validation) | Shares its repo with the class above. Together they take `aptos-ts-sdk` to zero and **repair condition 5** |
| A crate nickname (`gateway/run.rs`), a foreign project's file (`Hermes adapters/base.py`) | 2 | `edgecrab` (validation) | One validation repo, and no rule shape proposed yet |
| A generated bundle the sentence describes as generated | 1 | `zotero-format-metadata` (validation) | One validation repo |
| A framework's own directory (`.tfw/`) | 1 | `KZ-IT` (calibration) | Free, and no general rule reaches it |

Closing the first two classes — one repo's worth of contamination, since they overlap on `aptos-ts-sdk`, plus `aguara` — would repair **both** broken conditions. That is the next decision, and it is a decision about the corpus rather than about the code: two more validation repos have to be found, and the last four that were added brought six false positives with them.

---

## Sixteenth round, 2026-09-10: the two classes that were worth their price

Round fifteen ended with the arithmetic laid out: conditions 5 and 6 needed **repos** to go quiet, not findings to go away, and the two classes that would empty a repo were the ones with a price — two validation repos, because they overlapped on `aptos-ts-sdk`.

Both are closed.

### A specifier exists in order not to be a path

`discard.ts` already refused a leading `#` because a Node subpath import is *required* to start with one, so it cannot be confused with a path. A leading `scheme:` is the same statement in the other syntax: `link:`, `file:`, `workspace:`, `portal:`, `npm:`, `jsr:`, `catalog:`, `patch:`.

Real case, `aptos-labs/aptos-ts-sdk`, three findings: "`examples/typescript`, `examples/javascript` use a **linked** SDK (`link:../..`)". It is a `package.json` dependency value quoted in prose, and the normalizer made the report worse than the claim — the trailing-punctuation trim trimmed `..` and printed `link:../` for text that says `link:../..`.

The scheme is matched **generally** rather than from a list of protocol names, which is [ADR-0011](../../docs/adr/0011-an-unknown-key-is-only-reported-as-a-near-miss.md)'s argument inverted: a list of somebody else's vocabulary falls behind, and falling behind *here* would produce findings rather than miss them. What a general rule costs instead is a file whose **first** segment holds a colon — illegal on Windows, and absent from any repo in this corpus. The colon a real path does carry is a `:12` line suffix, which comes after a slash, and the pattern is anchored.

### A version or a date standing in for the real one

`VERSION` in `discard.ts` refuses a segment that **is** a number (`1.0`, `v2.1`). This refuses one that is the **shape** of a number:

- `garagon/aguara`: "confirm links in `product/vX.Y.Z/_index.md`", "Create status file - `product/vX.Y.Z/status-YYYY-MM-DD.md`".
- `aptos-labs/aptos-ts-sdk`: "write an upgrade guide at `upgrade-guides/UPGRADE_GUIDE_X.Y.Z.md`", where the real files are `UPGRADE_GUIDE_6.0.0.md` and `UPGRADE_GUIDE_7.0.0.md`.

The letters are required uppercase and in order, so `x.y.z` and a file genuinely called `a.b.c` are untouched, and `YYYY` is a spelling nobody uses for anything else.

### What it cost and what it bought

`aptos-ts-sdk` and `aguara` both go to **zero findings** and both move to calibration under condition 9. Unlike `KZ-IT-telegram-list` in round fourteen, both leave **clean**: the rules fixed them rather than the move hiding them.

Two replacements were added on the same metadata-only basis — `ckotzbauer/vulnerability-operator` (Go) and `fancy1108/Clutch` (TypeScript/Python) — and between them they brought **one false positive and one true finding**, which is the best a replacement pair has done in four rounds.

**66 repos · 236 sources · 26 findings — 20 true, 6 false.** Every condition is met:

| | Round 13 | Round 14 | Round 15 | Round 16 |
|---|---|---|---|---|
| False positives | 23 | 19 | 11 | **6** |
| Condition 2 (no false autofix) | broken | met | met | **met** |
| Condition 5 (max 2 FP per repo) | broken, 16 | broken, 9 | broken, 4 | **met, 2** |
| Condition 6, corpus | 91.9% | 90.6% | 90.6% | **92.4%** |
| Condition 6, validation | 90.3% | 87.5% | 87.5% | **90.6%** |

Validation carries **12 findings** now, four times the three the M1 certification rested on, and the caveat ADR-0006 wrote about its own condition 6 is finally spent.

### The new repos, classified

**`ckotzbauer/vulnerability-operator`: silent.**

**`fancy1108/Clutch`: two findings, one of each.**

- `CLAUDE.md:190` — "Single-context repo: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`." `docs/agents/domain.md` exists and is not reported; **`docs/adr/` does not exist**. Classified **true**, and the doubt is worth recording: the sentence could be read as stating a convention that materialises when the first ADR is written, in which case it is noise. The strict reading is that a declarative sentence about the repo's layout is wrong, and that is the reading taken. It changes no condition either way — the repo carries a false positive regardless — so it only moves the ratio.
- `.cursor/rules/cli-whitelist-docs.mdc:3` — **false**, and a class nobody had seen. The frontmatter is Cursor's:

  ```
  globs: services/orchestrator/src/tools_status.py,apps/desktop/src/services/cliInstallGuides.ts,services/orchestrator/src/engine_router.py
  ```

  A **comma-separated list**, which the frontmatter extractor claims as one path. All three files exist; the joined string does not. The suggestion even names the third one, which is the tool almost getting there.

  It is left open on purpose. The fix is to split a comma-separated frontmatter value into one claim per item — which would *raise* detection rather than lower it, since all three of these verify — and it would burn `Clutch` the round after it arrived, owing a fifth replacement. It goes in the ledger instead.

### The ledger

| Class | Findings | Repos | Cost of closing it |
|---|---|---|---|
| A comma-separated frontmatter value read as one path (`globs:`) | 1 | `Clutch` (validation) | One validation repo. The fix **adds** detection: three real paths become three claims |
| A crate nickname (`gateway/run.rs`), a foreign project's file (`Hermes adapters/base.py`) | 2 | `edgecrab` (validation) | One validation repo, and no rule shape proposed yet |
| A generated bundle the sentence describes as generated | 1 | `zotero-format-metadata` (validation) | One validation repo |
| A framework's own directory (`.tfw/`) | 1 | `KZ-IT` (calibration) | Free, and no general rule reaches it |
| A third-party convention no prose rule reaches | 1 | `eve-template` (calibration) | Open since round one |

Nothing here is load-bearing for a condition: the maximum per repo is 2, and closing any of them would move condition 6 by at most 1.5 points. The four remaining rounds' worth of work is in the corpus growing, not in these five findings.

## Seventeenth round, 2026-09-11: the fixes, read one by one

The first sixteen rounds classified **findings**. This one classifies **edits**, which is a different question and the one ADR-0006's hard floor is actually about: not "is this path really missing" — that is measured — but "is the rewrite the one a maintainer of that repo would have made".

`pnpm corpus --fixes` is the new mode that asks it. It plans every fix across the 66 repos and prints the line before and the line after. **It never writes**: a corpus clone is a checkout we do not own ([ADR-0007](../../docs/adr/0007-the-corpus-does-not-run-in-ci.md)), and the judgement is a human's anyway.

### What it found

Snapshots first: `pnpm corpus --check` is green, **66 repos · 236 sources · 26 findings**, unchanged. M3 added a value span to the frontmatter parser and a module deciding fix ranges, and moved no detection at all — which is what it was supposed to do.

Then the edits: **one edit would be applied across the whole corpus, and none was refused.**

```
# Endle/fireSeqSearch
CLAUDE.md:145  [path/missing]
  - - Query path: `fire_seq_search_server/src/query_engine/semantic_query.rs`
  + - Query path: `fire_seq_search_server/src/semantic_query.rs`
```

**Classified true.** Verified against the clone: there is no `query_engine/` directory under `fire_seq_search_server/src/`, and `semantic_query.rs` sits directly in `src/` alongside `app_state.rs`, `config.rs`, `lib.rs` and `main.rs`. The document is one directory out of date and the correction is the only candidate.

The *rewrite* is also right, which is the part this round exists to check. The replacement covers the path and nothing else: the backticks, the list marker, the `Query path:` label and the surrounding line all survive because they were never inside the range.

### The honest reading: this is one observation

Condition 2 is met — zero false positives among the fixable findings — and it is met on a sample of **one**. That was already true before M3 and it stays true after it. What changed is that the one observation is now checked at the level of the edit rather than at the level of the finding.

The three-checks-deep thing this round cannot tell you: whether the **rewrite** logic is right in the cases the corpus does not contain. There is no fixable script finding in 66 repos, no fixable skill name, no fixable path in a nested source. Every one of those is covered by the fixture, and covered by a fixture is a weaker claim than measured on somebody else's repo. `link/broken` was "proven quiet and unproven useful" in round nine; the fix machinery is **proven correct once and unproven at scale**, and the honest way to move that number is more repositories, not more rules.

### The nested-source refusal cost nothing measurable

`fix/range.ts` refuses to rewrite a relative path in a source that is not at the repo root, because a nested document writes half its paths against its own directory and half against the root and picking one convention rewrites the path into the other. The worry when that rule was written was that it might refuse most real fixes.

Over the corpus it refused **zero**, because the only fixable finding is in a root `CLAUDE.md`. That is not evidence the rule is cheap — a denominator of one measures nothing — it is the absence of evidence that it is expensive. Recorded so the next round with more fixable findings knows to look.

### The two deferred decisions, closed

Both were postponed in writing to "M3 with the corpus in hand". Both stay as they were, and now for a stated reason rather than a deferral.

**`link/broken` anchors stay unfixable.** The corpus holds **zero** `link/broken` findings, exactly as round nine reported, so it offers no evidence either way. The argument in `fix/suggest.ts` never needed the corpus: every case where the correction is obvious — wrong case, wrong punctuation — is already accepted by the canonical key and never reported, so what is left to report is a real typo whose target is a guess. That is structural, and the empty corpus neither supports nor weakens it.

**`frontmatter/invalid` values stay unfixable, and the corpus made the case concrete.** There is exactly one such finding, in `colinhacks/zod`:

```
.claude/skills/security-advisory/SKILL.md:3
  invalid YAML: Nested mappings are not allowed in compact mappings
```

An unquoted `description:` whose text contains colons. The obvious fix is to quote it — and the value contains `"the draft advisories"`, `"the security reports"`, `"the vulnerability queue"`, so quoting it means **escaping the quotes inside it**. A `--fix` that does that is a YAML serializer, which is precisely the reformat of somebody's document this milestone refuses everywhere else. One case is not a rule, but it is the only case there is, and it points the same way the code comment already did.

### Where the conditions stand

Unmoved. Nothing in M3 touched a heuristic, the snapshots are byte-identical, and the table at the top of this document still reads as it did after round sixteen: **all nine met, 66 repos, 32 in validation, 26 findings, 20 true and 6 false.**

The five open false-positive classes in the round-sixteen ledger are all still open and none of them is fixable, so none of them can become a bad autofix. The two replacement validation repos owed since M2's close are still owed; this round did not pay them, because it changed no rule and burned no repo.


---

## Eighteenth round, 2026-09-19: the other skills roots, and 48 findings nobody has ruled on

**This round is not a measurement.** It is the ledger of a corpus diff, opened here rather than left in a patch file, because this document is where findings live and a diff sitting in `.scratch/` is a finding nobody will ever read.

### What changed in the tool

`classifySource` read `.claude/skills/**/SKILL.md` and nothing else. It now reads `.agents/skills/` and `.cursor/skills/` as well. The reason is that `.claude/skills/` was never the location: `npx skills add` writes to **`.agents/skills/` by default** — the universal target covering Amp, Cline, Codex, Cursor, GitHub Copilot, Gemini CLI, Kilo, Kimi, OpenCode, Warp and Zed — and offers fifty-odd others behind a picker. This corpus had been saying so since it was assembled and it was read as noise:

| root | `SKILL.md` | repos |
|---|---|---|
| **`.agents/skills/`** | **83** | 9 |
| `.claude/skills/` | 32 | 8 |
| `.flue/skills/` | 11 | |
| `.codex/skills/` | 11 | |
| `.github/skills/` | 7 | |
| `.opencode/skills/` | 3 | |
| `.cursor/skills/` | 1 | 1 |

Three roots were taken, not seven and not fifty-six. Each one audits more files in every repository that has it, which is exactly the cost this document exists to price.

### The arithmetic

| | round 17 | round 18 |
|---|---|---|
| sources | 236 | **320** |
| findings | 26 | **74** |
| calibration / validation | 14 / 12 | **62 / 12** |
| fixable | 1 | **3** |
| snapshots changed | — | 10 of 66 |

**Validation did not move.** All 48 new findings are in calibration, so conditions 3 through 7 read exactly as they did after round seventeen. That is luck rather than design, and it is the only reason this round can be left open without invalidating the certification.

Two results nobody predicted:

- **Widening did not wake `skill/frontmatter`.** Zero of the 48 are its findings. The corpus's skills are well formed wherever they live, which is round eleven's result again across three roots and 83 more files.
- **`link/broken` produced the first two findings of its existence.** It had read zero since it landed in round nine.

### The verdicts

48 findings arrived. **18 were a bug in driftwatch and no longer exist**; the other 30 are ruled on here: **2 true, 28 false**.

| # | Class | n | Verdict |
|---|---|---|---|
| B | `.emdash/types.ts` and `.emdash/schema.json`, in nine template copies | 18 | **false — and a bug**, see below |
| A | A path prefixed with a package name — `react-router/docs/start/modes.md` | 16 | false |
| C | An absolute path that is a documentation-site URL — `/docs/app/glossary` | 3 | false |
| D | A literal placeholder — `path/to/file.ts`, `#anchor-a`, `+types/` | 4 | false |
| F1 | A file the document tells you to create — `scripts/changes/whats-changed.md`, `tasks/rfc-decisions.md` | 3 | false, **2 of them fixable** |
| E | A path in the **reader's** project, not this repo — `app/entry.server.tsx` | 1 | false |
| F2 | A runtime log — `agent/goose.txt` | 1 | false |
| F3 | `docs/upgrading/future-flags.md` | 1 | **true** |
| F4 | `src/client/components/image.tsx` | 1 | **true** |

### Class B was not a class. It was a bug, and it had been there all along.

The eighteen `emdash` findings are paths its own `.gitignore` covers — `.emdash/` is line 35 of it — and `gitIgnoredPaths` exists precisely so that a path git ignores is never reported missing. It did not fire, and the reason is worth the space:

```
$ git check-ignore -n -v -- <380 paths including '.agents/skills/__driftwatch_probe__'>
fatal: pathspec '.agents/skills/__driftwatch_probe__' is beyond a symbolic link
```

`.agents/skills` in `emdash` is a **symlink**. `check-ignore` refuses a pathspec that crosses one by aborting the **whole invocation** with exit 128 and no output — and `git.ts` treated an empty stdout as "none of these is ignored", which is what exit 1 means. So one refused path silently cancelled the gitignore suppression for **up to 400 others**.

Fixed by distinguishing exit 1 from a real failure, and by halving a refused batch until the offending paths are alone. The 18 findings disappeared with it and the corpus went from 74 to 56.

**This is the round's most valuable result and it is not about skills.** The bug was reachable from any repository with a symlink on a claimed path; widening discovery only supplied one. It had been live since `gitIgnoredPaths` landed.

### Condition 2 is broken, by two findings of one claim

```
.agents/skills/prepare-release-notes/SKILL.md:30  scripts/changes/whats-changed.md
  -> .agents/skills/prepare-release-notes/references/whats-changed.md  (confidence 1, fixable)
```

The document's own next four bullets settle it:

> 4. Review whether `scripts/changes/whats-changed.md` is needed:
>    - Read `CHANGELOG.md` examples or `references/whats-changed.md` when uncertain
>    - **Add** `scripts/changes/whats-changed.md` only for features, …
>    - **Do not add it** for ordinary bug fixes, …

The file is written during a release when the change warrants it. The document does not claim it exists; it spends four bullets on when to create it. Both findings are false.

The autofix is worse than the finding. It would rewrite `scripts/changes/whats-changed.md` — the release artifact — into `references/whats-changed.md`, the skill's own reference document, which the line directly above mentions as a **different** file. The suggestion earns confidence 1 because the basenames match exactly, and the directories have nothing to do with each other.

ADR-0006 condition 2 admits no false positive among the fixable findings at any rate. It is broken until this closes, and there are two shapes of fix: the finding (a path the document elsewhere says to create) or the autofix (a candidate sharing a basename but no ancestry).

### The two true positives, which are why the widening was worth it

```
remix-run/react-router  .agents/skills/implement-rfc/SKILL.md:143
  `docs/upgrading/future-flags.md`
```

`docs/upgrading/` exists and holds `component-routes.md`, `future.md`, `index.md`. The document was renamed to `future.md` and the skill's table still points at the old name. **That is the drift this tool exists to find**, and before round eighteen nobody was looking: the file is under `.agents/skills/`, which discovery did not read.

```
vercel/next.js  .agents/skills/update-docs/SKILL.md:50
  `src/client/components/image.tsx` → `docs/01-app/.../image.mdx`
```

A code-to-docs mapping table. The real file is `packages/next/src/client/image-component.tsx` — different directory, different name. Recorded as true with less confidence than the first: the table may be describing a path shape rather than a file.

### The classes that stay open

Four, none of them new in kind, all of them semantic:

- **A, a package-name prefix.** The skill says so in prose: *"When this skill references `react-router/docs/...`, read the matching file under `node_modules/react-router/docs/`"* — and that sentence is itself one of the sixteen findings. A rule shape does exist here and is worth pricing: the repo contains `packages/react-router/package.json` with `"name": "react-router"`, so a first segment that matches a package name in the repo is a package specifier, not a path.
- **C, an absolute path that is a site URL.** `/docs/app/glossary` in a repository that publishes a documentation site. Whether it is drift depends on whether the site's routes track the repo's files, which is a judgement about next.js.
- **D, placeholders.** `path/to/file.ts` is the universal metasyntactic path and `discard.ts` keeps a `METASYNTACTIC` set that does not include it. The cheapest correction in this round.
- **F1, a file the document tells you to create.** `CREATE_IMPERATIVES` already covers `add` and `write` at the start of a sentence; it does not cover *"**Save** the resolved decisions to a scratch file at `tasks/rfc-decisions.md`"*, nor an instruction that appears two lines below the claim rather than in it.

### What this round cost

Nothing in validation: all 48 landed in calibration, so no repo moved groups and no replacement is owed. `emdash` contributed 18 findings that were never real, and its snapshot is now clean.

### What is owed

1. **Repair condition 2.** Two false fixable findings, one class, two possible shapes of fix.
2. Price class A's rule — a first segment matching a package name in the repo.
3. Add `path/to` to `METASYNTACTIC`, which closes class D's largest member for one line.
4. The two replacement validation repos owed since M2 are **still** owed. This round did not pay them and burned nothing: every finding it produced landed in calibration.

---

## Nineteenth round, 2026-09-19: two classes closed, and condition 2 repaired

Round eighteen left four things owed. Two of them are done here, and they are the two that cost a rule each.

### The metasyntactic path

`path/to/file.ts`, in `withastro/astro`'s review-output template:

    `[medium][requirements]` `path/to/file.ts:87` - Short title. Explain the unmet
    requirement, impact, and minimal remediation direction.

Round eighteen called this "the cheapest correction in this round — add `path/to` to `METASYNTACTIC`, one line". **That was wrong about where it goes.** `METASYNTACTIC` is tested one segment at a time, and `path` and `to` are both ordinary directory names: `src/path/resolve.ts`, `lib/to/index.ts`. Adding either would have been one of the widest false-negative rules in the file.

`path/to` is a **sequence**, so it gets its own test: two adjacent segments, at any position, case-insensitive. `some/path/to/thing` is as much a placeholder as `path/to/thing`, and a repository with a real `path/to/` directory is not a thing.

One finding closed, in a calibration repo. Free.

### A path the document tells you to create, somewhere else in the document

This is the one that broke condition 2, and the class is worth stating precisely because the existing rule was so close to catching it.

`CREATE_IMPERATIVES` asks whether **the sentence holding the claim** opens with an imperative. In `remix-run/react-router` the instruction and the claims are in different sentences:

> 4. Review whether `scripts/changes/whats-changed.md` is needed:
>    - Read `CHANGELOG.md` examples or `references/whats-changed.md` when uncertain
>    - **Add** `scripts/changes/whats-changed.md` only for features, …
>    - Do not add it for ordinary bug fixes …

The two findings sat on the "Review whether" line and on a "Use `…`" line fifty lines below. Both refer to a file the document spends four bullets explaining when to create.

So the gate now also collects **every backticked path in any sentence that opens with a create imperative**, once per document, and a claim naming one of them is not a claim. Only backticked spans count, because a path without code formatting is not extracted as a claim in the first place.

`save` joins the imperatives, for the third finding of the same class: *"Save the resolved decisions to a scratch file at `tasks/rfc-decisions.md`."*

**What it costs** is a document that says "Create `x`" in one place and asserts `x` exists in another. Such a document contradicts itself, and this project takes the quiet reading of a contradiction every time.

### The bill

Three findings closed in `react-router`, one in `astro`. Both are **calibration** repos, so nothing moved groups and no replacement is owed — the first round in a while where closing a class cost nothing, and only because round eighteen's findings all landed in calibration.

| | round 18 | round 19 |
|---|---|---|
| findings | 56 | **52** |
| fixable | 3 | **1** |
| false fixable | 2 | **0** |

**Condition 2 is repaired.** The one remaining fixable finding is `fireSeqSearch`, true since round 14.

### Still owed from round eighteen

1. Class A, the package-name prefix — 16 findings, and a rule shape that exists: a first segment matching a package name in the repo. Not taken here because it is the only one of the four that needs the manifests, and it deserves its own round.
2. Class C, an absolute path that is a documentation-site URL — 3 findings, and a judgement about next.js rather than about a string.
3. The two replacement validation repos owed since M2.
