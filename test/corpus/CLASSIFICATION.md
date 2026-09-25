# Corpus classification

Hand review of every finding against the real repo. First measured 2026-09-09; re-measured 2026-09-10 after adding `spatie/bloom`, and **again after adding four more repos**.

Corpus: **96 public repos pinned to a commit, 337 findings.**

Round eighteen widened discovery to the other skills roots and added 48 findings; **18 of them were a bug and are gone**, and the remaining 30 are ruled on below: 2 true, 28 false. Rounds nineteen through twenty-one then closed every class round eighteen opened, removing 23 more. The corpus stands at **32 findings, 22 true and 10 false**: rounds twenty-two and twenty-four widened the skills roots, round twenty-five took the lint rules out of `skill/frontmatter`, round twenty-six closed one class and measured another away, and round twenty-seven withdrew `skill/frontmatter` entirely.
Of the 96, **32 form the validation group**. No replacement is outstanding: round thirty-one's thirty are all calibration, because round twenty-nine's `@` rule was derived from a frequency over the discovery corpus they came from.

## Criterion status ([ADR-0006](../../docs/adr/0006-the-m1-precision-criterion.md), condition 6 as rewritten by [ADR-0009](../../docs/adr/0009-precision-is-counted-in-quiet-repos.md))

Validation group measurement: **32 repos, 71 sources, 12 findings, 8 true and 4 false.**

Round eighteen added two sources to the validation group and **no findings**: all 48 of its new findings landed in calibration. The validation measurement is unchanged, which is why the conditions below can still be read at all.

| # | Condition | Measured | Status |
|---|---|---|---|
| 1 | `false-positive-traps` fixture at zero | 0 findings | **met** |
| 2 | Zero false positives among `fixable` findings | 1 fixable, and it is **true** (`fireSeqSearch`) | **met**, repaired in round 19 |
| 3 | ~~Median FP per repo = 0~~ | — | **withdrawn** ([ADR-0015](../../docs/adr/0015-the-tail-conditions-are-two-tautologies-and-one-impossibility.md)): implied by 6 |
| 4 | ~~90th percentile of FP per repo ≤ 1~~ | — | **withdrawn** ([ADR-0015](../../docs/adr/0015-the-tail-conditions-are-two-tautologies-and-one-impossibility.md)): implied by 6 |
| 5 | ~~No repo above 2 FP~~ | — | **withdrawn** ([ADR-0015](../../docs/adr/0015-the-tail-conditions-are-two-tautologies-and-one-impossibility.md)): unstatable over a repository of real size |
| 6 | ≥ 90% of repos produce zero false positives, whole corpus and validation alone | **81 of 96 = 84.4%**; validation **29 of 32 = 90.6%** | **NOT met** on the whole-corpus half — and further than before, see round thirty-one |
| 7 | ≥ 1 true positive in validation | 8 | **met** |
| 8 | ≥ 20 repos, with ≥ 8 in validation | 66 repos, 32 in validation | **met** |
| 9 | Contamination rule encoded | `holdout` field in `scripts/corpus/repos.ts`; no debt outstanding | **met** |

Fixable findings: **6**, of which **0 are false**. Round eighteen broke this with two false fixable findings in `remix-run/react-router`; round nineteen closed the class that produced them. Round twenty-two added the second, a `name` that had lost a word in `openai/codex`; round twenty-four added four more in `securego/gosec`. Round twenty-seven withdrew the check that produced those five, leaving only `fireSeqSearch`'s. Round thirty-one added five more — three copies of one `tools/` to `extensions/` move in `BuilderIO/agent-native`, and one each in `hecateq/hecateq-openagent` and `BetterSEQTA/DesQTA`, all three of them a file that changed directory. All six are true, and under ADR-0015 a `fixable` finding is the one thing that may never be left unread.

**Condition 6 is not met, and was not noticed.** Eight of the 66 repositories carry a false
positive, not five: round eighteen opened three classes that were deliberately left open — the
`+types/` placeholder and two anchors in `vercel/next.js`, `app/entry.server.tsx` in
`remix-run/react-router`, a runtime log in `block/goose` — and those three repositories joined
the count without anyone dividing again. Round twenty-one closed with "33 findings, 11 false"
and the eleven were already spread across eight repositories.

Nothing regressed in the code. The numerator grew while the denominator stood still, which is
the same mechanism [ADR-0009](../../docs/adr/0009-precision-is-counted-in-quiet-repos.md)
records, arriving from the other direction. **The validation half still holds at 90.6%**, so
the out-of-sample measurement — the only one ADR-0009 says means anything — is unaffected.

What to do about it is ticket `20`, and it is deliberately not decided here: `ROADMAP.md` says
tune the heuristics or accept that the check does not get there and say so, and the one thing
forbidden is discovering a reason why 87.9% was always acceptable. The other eight conditions
are met.

The table above is now derived from the per-finding rows rather than carried forward by hand,
and `corpus-bookkeeping.test.ts` holds it to them.

Four rounds happened on 2026-09-10 after M2's checks landed, and they are worth reading together, because two of them broke conditions and two repaired them:

- The **thirteenth** added thirteen validation repos to give condition 6 the finding mass M2 had promised it. It got the mass, and conditions 2 and 5 broke.
- The **fourteenth** closed the class that broke condition 2 — another agent tool's configuration root — which repaired it and also silenced a false positive that had been open in `github/spec-kit` since the first round. The replacement repos it brought in then broke condition 6 over validation.
- The **fifteenth** closed the largest class left, the index placeholder, which cost nothing: the only repo it appeared in had already been moved to calibration. Eight false positives gone, and **no condition moved**, because 5 and 6 count repos rather than findings.
- The **sixteenth** closed the two classes that did move them — a dependency protocol specifier and a version-or-date template — which emptied `aptos-ts-sdk` and `aguara`, cost both of them to calibration, and **repaired conditions 5 and 6**. The two replacements brought one false positive and one true finding between them.

That sequence is the treadmill this document named in round three, running in public: closing a class costs the repo that revealed it, the replacement arrives with its own noise, and the percentage moves for reasons that have nothing to do with the code getting better or worse.

That sentence was also true on 2026-09-09 and did not survive contact with fifteen more repositories, so it is worth saying what is different now. The corpus has grown from 34 repos to **49**, the validation group from 8 to **18**, and the two conditions that decide precision rest on **49 and 18 repos** rather than on three findings from a single root cause. Seven rounds of measurement have added twenty-one findings' worth of evidence and closed seven false-positive classes.

~~**Two replacement validation repos are owed**, for `mattpocock/course-video-manager` and `emdash-cms/emdash`.~~ **Paid in round thirteen** and left standing here for six rounds — `scripts/corpus/repos.ts` records that the thirteen repos added then "also settle the two replacements owed for `course-video-manager` and `emdash`", and the header of this document has said "No replacement is outstanding" since. Two statements in one file disagreeing about a debt is drift in the document that records drift, and it was repeated as fact in rounds eighteen and nineteen before anyone checked. Corrected 2026-09-19.

What the sentence was about, for whoever reads this next: ADR-0006 condition 9 prices a rule derived from a validation repo's finding — that repo moves to calibration, and a new one has to join validation to keep the group's size honest. Both of these moved that way, both left clean, and both were replaced.

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

## When a condition fails

Written on 2026-09-19, after condition 6 was found below its bar and **not** before — which is
the point of writing it down now, so that the next one is decided before the number is in view.
Ticket `05` asked for this and was overtaken; this is what it asked for, a round late.

`ROADMAP.md` already states the rule: *tune the heuristics, or accept that the check does not
get there and say so.* What it does not say is the order, and the order is where the mistake
lives.

1. **Divide again before anything else.** A condition is a fraction. Both halves move, and the
   one that moved is not always the one being discussed. `corpus-bookkeeping.test.ts` now
   derives conditions 6 from the per-finding rows so this step cannot be skipped.
2. **Say the number, in public, before deciding what to do about it.** `PRODUCT.md` and
   `docs/guide/precision.md` carry the figure a user reads. They are updated in the same commit
   that finds the failure, not in the one that fixes it.
3. **A rule may only be derived from evidence that is independent of the condition.** Closing a
   false-positive class is the intended remedy — ADR-0009 chose this shape precisely because
   improving the tool improves the number. But the justification has to stand without the
   condition: measured over the discovery corpus before and after, with the findings diffed,
   the way ticket `16` established. If the only argument for a rule is that it restores a bar,
   it is not an argument.
4. **The threshold does not move.** Not down, not re-scoped to the half that still passes, not
   redefined as "the one that was always meaningful". ADR-0009 § "The threshold is not a priori"
   admits 90% was chosen with 93.2% and 88.89% in view. That admission is survivable once.
5. **If no rule earns its place, the criterion is unmet and stays unmet**, recorded here and in
   `ROADMAP.md`, until one does. An unmet condition carried honestly is worth more than a met
   one nobody believes.

## The full corpus

The corpus produces **337 findings, 32 true, 17 false and 288 unruled**, so no aggregate is quoted — and the aggregate
is the least useful number here, for the reason [ADR-0009](../../docs/adr/0009-precision-is-counted-in-quiet-repos.md)
gives. The numbers the project holds itself to are in the condition table above.

Every row below is derived from the committed snapshots in `snapshots/` and the `holdout` field in
`scripts/corpus/repos.ts`, and the per-finding record is the table after it.

| Repo | Findings | True | False | Group |
|---|---|---|---|---|
| `openai/codex` | 5 | 5 | 0 | calibration |
| `securego/gosec` | 4 | 4 | 0 | validation |
| `tursodatabase/turso` | 4 | 4 | 0 | calibration |
| `modelcontextprotocol/typescript-sdk` | 3 | 3 | 0 | validation |
| `remix-run/react-router` | 3 | 1 | 2 | calibration |
| `vercel/next.js` | 3 | 1 | 2 | calibration |
| `1amageek/SwiftAgent` | 2 | 2 | 0 | validation |
| `fancy1108/Clutch` | 2 | 1 | 1 | validation |
| `raphaelmansuy/edgecrab` | 2 | 0 | 2 | validation |
| `block/goose` | 1 | 0 | 1 | calibration |
| `calcom/cal.com` | 1 | 1 | 0 | calibration |
| `cloudflare/workers-sdk` | 1 | 1 | 0 | calibration |
| `colinhacks/zod` | 1 | 1 | 0 | calibration |
| `CrossPaste/crosspaste-desktop` | 1 | 1 | 0 | validation |
| `emdash-cms/emdash` | 1 | 1 | 0 | calibration |
| `Endle/fireSeqSearch` | 1 | 1 | 0 | validation |
| `mattpocock/course-video-manager` | 1 | 1 | 0 | calibration |
| `northword/zotero-format-metadata` | 1 | 0 | 1 | validation |
| `saubakirov/KZ-IT-telegram-list` | 1 | 0 | 1 | calibration |
| `vercel-labs/marketing-team-eve-template` | 1 | 0 | 1 | calibration |

**`github/spec-kit` is no longer in this table.** It carried the corpus's first false positive, open
from round one — `.goose/recipes/`, another tool's convention — and round fourteen closed the class
that produced it. The repo is still in the corpus and is now silent. The finding and the argument it
generated stay in the history below, where they happened.

Split by group: **validation 16 findings, 12 true and 4 false**; **calibration 21 findings, 15
true and 6 false**, over 20 repositories in all. Only the first half measures anything.

The two sections that follow walk the findings adjudicated up to round seventeen. They are kept as
written — the reasoning is the point — and the **complete** record, rounds one to twenty-four, is
the per-finding table above.

### Every finding, one row

The table above is a summary; **this is the record**. One row per finding in `snapshots/`, with
the verdict and the round that adjudicated it. `corpus-bookkeeping.test.ts` asserts that every
snapshot finding appears here exactly once and that the counts agree, so it cannot go stale the
way the per-repo table did — that one said 26 findings while the snapshots held 39, and thirteen
adjudications from rounds 18 to 24 lived only in prose.

That is not a tidiness problem. Round twenty-three justified a bound with a finding it called
true which round thirteen had ruled **false**, because the verdict was fourteen hundred lines
away and there was nowhere to look it up. Ticket `01` asked for this table before anything could
be fed to a model; the error is the argument for it.

**32 true, 17 false, 288 pending, 337 findings.**

| # | Repo | Location | Check | Claim | Verdict | Class | Adjudicated |
|---|---|---|---|---|---|---|---|
| 1 | `1amageek/SwiftAgent` | `AGENTS.md:701:34` | `path/missing` | `docs/SECURITY.md` | **true** | — | validation, round 4 |
| 2 | `1amageek/SwiftAgent` | `CLAUDE.md:701:34` | `path/missing` | `docs/SECURITY.md` | **true** | — | validation, round 4 |
| 3 | `block/goose` | `evals/harbor/.agents/skills/compare-tasks/SKILL.md:94:60` | `path/missing` | `agent/goose.txt` | **false** | runtime-log | calibration, round 18, F2 |
| 4 | `calcom/cal.com` | `AGENTS.md:130:24` | `path/missing` | `packages/features/ee/workflows/lib/constants.ts` | **true** | — | calibration, round 10 |
| 5 | `cloudflare/workers-sdk` | `AGENTS.md:140:8` | `path/missing` | `.github/PULL_REQUEST_TEMPLATE.md` | **true** | — | calibration, round 10 |
| 6 | `colinhacks/zod` | `.claude/skills/security-advisory/SKILL.md:3:1` | `frontmatter/invalid` | `description: Triage a draft security advisory in colinh…` | **true** | — | calibration, round 17 |
| 7 | `CrossPaste/crosspaste-desktop` | `CLAUDE.md:41:4` | `path/missing` | `app/src/commonMain/sqldelight/` | **true** | — | validation, round 14 |
| 8 | `emdash-cms/emdash` | `AGENTS.md:398:56` | `path/missing` | `tests/e2e/` | **true** | — | calibration, rounds 6, 8 |
| 9 | `Endle/fireSeqSearch` | `CLAUDE.md:145:16` | `path/missing` | `fire_seq_search_server/src/query_engine/semantic_query.rs` | **true** | — | validation, round 17 |
| 10 | `fancy1108/Clutch` | `.cursor/rules/cli-whitelist-docs.mdc:3:8` | `path/missing` | `services/orchestrator/src/tools_status.py,apps/desktop/…` | **false** | comma-separated-globs | validation, round 16 |
| 11 | `fancy1108/Clutch` | `CLAUDE.md:190:42` | `path/missing` | `docs/adr/` | **true** | — | validation, round 16 |
| 12 | `mattpocock/course-video-manager` | `CLAUDE.md:27:252` | `path/missing` | `.github/workflows/test.yml` | **true** | — | calibration, rounds 6, 7 |
| 13 | `modelcontextprotocol/typescript-sdk` | `CLAUDE.md:87:13` | `path/missing` | `packages/server/src/server/sse.ts` | **true** | — | validation, round 14 |
| 14 | `modelcontextprotocol/typescript-sdk` | `CLAUDE.md:93:60` | `path/missing` | `packages/server/src/server/auth/` | **true** | — | validation, round 14 |
| 15 | `modelcontextprotocol/typescript-sdk` | `CLAUDE.md:98:79` | `path/missing` | `packages/client/src/client/auth-extensions.ts` | **true** | — | validation, round 14 |
| 16 | `northword/zotero-format-metadata` | `AGENTS.md:44:89` | `path/missing` | `content/scripts/linter.js` | **false** | generated-bundle | validation, round 14 |
| 17 | `openai/codex` | `AGENTS.md:35:51` | `path/missing` | `codex-rs/codex-mcp/src/mcp_connection_manager.rs` | **true** | — | calibration, round 1 |
| 18 | `openai/codex` | `AGENTS.md:265:4` | `path/missing` | `app-server-protocol/src/protocol/v2.rs` | **true** | — | calibration, round 1 |
| 19 | `openai/codex` | `AGENTS.md:275:133` | `path/missing` | `app-server-protocol/src/protocol/v2.rs` | **true** | — | calibration, round 1 |
| 20 | `raphaelmansuy/edgecrab` | `AGENTS.md:508:41` | `path/missing` | `gateway/run.rs` | **false** | crate-nickname | validation, round 15 |
| 21 | `raphaelmansuy/edgecrab` | `AGENTS.md:614:59` | `path/missing` | `adapters/base.py` | **false** | foreign-project | validation, round 15 |
| 22 | `remix-run/react-router` | `.agents/skills/implement-rfc/SKILL.md:143:28` | `path/missing` | `docs/upgrading/future-flags.md` | **true** | — | calibration, round 18, F3 |
| 23 | `remix-run/react-router` | `.agents/skills/react-router/SKILL.md:22:4` | `path/missing` | `app/entry.server.tsx` | **false** | readers-project | calibration, round 18, E |
| 24 | `saubakirov/KZ-IT-telegram-list` | `.claude/commands/tfw-init.md:141:25` | `path/missing` | `.tfw/adapters/antigravity/rules/` | **false** | another-tools-layout | calibration, round 13 |
| 25 | `tursodatabase/turso` | `.claude/skills/cdc/SKILL.md:158:24` | `path/missing` | `core/translate/emitter.rs` | **true** | — | calibration, rounds 8, 12 |
| 26 | `tursodatabase/turso` | `.claude/skills/cdc/SKILL.md:242:15` | `path/missing` | `core/translate/emitter.rs` | **true** | — | calibration, rounds 8, 12 |
| 27 | `tursodatabase/turso` | `.claude/skills/cdc/SKILL.md:246:15` | `path/missing` | `core/translate/emitter.rs` | **true** | — | calibration, rounds 8, 12 |
| 28 | `tursodatabase/turso` | `.claude/skills/mvcc/SKILL.md:91:1` | `script/missing` | `make test-mvcc` | **true** | — | calibration, round 12 |
| 29 | `vercel/next.js` | `.agents/skills/insight-error-page/SKILL.md:165:281` | `link/broken` | `#anchor-a` | **false** | placeholder | calibration, round 18, D |
| 30 | `vercel/next.js` | `.agents/skills/insight-error-page/SKILL.md:165:311` | `link/broken` | `#anchor-b` | **false** | placeholder | calibration, round 18, D |
| 31 | `vercel/next.js` | `.agents/skills/update-docs/SKILL.md:50:4` | `path/missing` | `src/client/components/image.tsx` | **true** | — | calibration, round 18, F4 |
| 32 | `vercel-labs/marketing-team-eve-template` | `AGENTS.md:136:169` | `path/missing` | `writing-quality/references/ai-phrases-to-avoid.md` | **false** | third-party-convention | calibration, round 3 |
| 33 | `BetterSEQTA/DesQTA` | `.cursor/skills/premium-ui-refinement/SKILL.md:170:108` | `path/missing` | `../../docs/development/premium-animations-analysis.md` | **true** | — | calibration, round 31 |
| 34 | `BetterSEQTA/DesQTA` | `AGENTS.md:163:25` | `path/missing` | `src/lib/utils/netUtil.ts` | **true** | — | calibration, round 31 |
| 35 | `BuilderIO/agent-native` | `.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 36 | `BuilderIO/agent-native` | `.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 37 | `BuilderIO/agent-native` | `.agents/skills/automations/SKILL.md:234:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 38 | `BuilderIO/agent-native` | `.agents/skills/capture-learnings/SKILL.md:21:28` | `path/missing` | `memory/MEMORY.md` | **pending** | — | calibration, round 31 |
| 39 | `BuilderIO/agent-native` | `.agents/skills/configuration/SKILL.md:188:2` | `path/missing` | `plans/core-configuration-attack-plan.md` | **pending** | — | calibration, round 31 |
| 40 | `BuilderIO/agent-native` | `.agents/skills/create-skill/SKILL.md:27:61` | `path/missing` | `memory/MEMORY.md` | **pending** | — | calibration, round 31 |
| 41 | `BuilderIO/agent-native` | `.agents/skills/create-skill/SKILL.md:194:43` | `path/missing` | `memory/MEMORY.md` | **pending** | — | calibration, round 31 |
| 42 | `BuilderIO/agent-native` | `.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 43 | `BuilderIO/agent-native` | `.agents/skills/new-branch/SKILL.md:26:110` | `path/missing` | `feat/` | **false** | placeholder | calibration, round 31 |
| 44 | `BuilderIO/agent-native` | `.agents/skills/onboarding/SKILL.md:63:6` | `path/missing` | `packages/core/docs/content/onboarding.md` | **pending** | — | calibration, round 31 |
| 45 | `BuilderIO/agent-native` | `.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 46 | `BuilderIO/agent-native` | `.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 47 | `BuilderIO/agent-native` | `.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 48 | `BuilderIO/agent-native` | `.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 49 | `BuilderIO/agent-native` | `.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 50 | `BuilderIO/agent-native` | `.agents/skills/writing-agent-instructions/SKILL.md:348:14` | `path/missing` | `memory/MEMORY.md` | **pending** | — | calibration, round 31 |
| 51 | `BuilderIO/agent-native` | `.claude/commands/sidecar.md:3:1` | `frontmatter/invalid` | `argument-hint: [investigation task, e.g. "check PR #1660 for` | **pending** | — | calibration, round 31 |
| 52 | `BuilderIO/agent-native` | `community-templates/account-expert/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 53 | `BuilderIO/agent-native` | `community-templates/account-expert/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 54 | `BuilderIO/agent-native` | `community-templates/account-expert/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 55 | `BuilderIO/agent-native` | `community-templates/account-expert/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 56 | `BuilderIO/agent-native` | `community-templates/account-expert/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 57 | `BuilderIO/agent-native` | `community-templates/account-expert/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 58 | `BuilderIO/agent-native` | `community-templates/account-expert/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 59 | `BuilderIO/agent-native` | `community-templates/account-expert/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 60 | `BuilderIO/agent-native` | `community-templates/account-tiering/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 61 | `BuilderIO/agent-native` | `community-templates/account-tiering/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 62 | `BuilderIO/agent-native` | `community-templates/account-tiering/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 63 | `BuilderIO/agent-native` | `community-templates/account-tiering/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 64 | `BuilderIO/agent-native` | `community-templates/account-tiering/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 65 | `BuilderIO/agent-native` | `community-templates/account-tiering/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 66 | `BuilderIO/agent-native` | `community-templates/account-tiering/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 67 | `BuilderIO/agent-native` | `community-templates/account-tiering/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 68 | `BuilderIO/agent-native` | `community-templates/call-follow-up-drafter/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 69 | `BuilderIO/agent-native` | `community-templates/call-follow-up-drafter/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 70 | `BuilderIO/agent-native` | `community-templates/call-follow-up-drafter/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 71 | `BuilderIO/agent-native` | `community-templates/call-follow-up-drafter/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 72 | `BuilderIO/agent-native` | `community-templates/call-follow-up-drafter/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 73 | `BuilderIO/agent-native` | `community-templates/call-follow-up-drafter/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 74 | `BuilderIO/agent-native` | `community-templates/call-follow-up-drafter/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 75 | `BuilderIO/agent-native` | `community-templates/call-follow-up-drafter/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 76 | `BuilderIO/agent-native` | `community-templates/churn-early-warning/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 77 | `BuilderIO/agent-native` | `community-templates/churn-early-warning/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 78 | `BuilderIO/agent-native` | `community-templates/churn-early-warning/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 79 | `BuilderIO/agent-native` | `community-templates/churn-early-warning/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 80 | `BuilderIO/agent-native` | `community-templates/churn-early-warning/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 81 | `BuilderIO/agent-native` | `community-templates/churn-early-warning/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 82 | `BuilderIO/agent-native` | `community-templates/churn-early-warning/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 83 | `BuilderIO/agent-native` | `community-templates/churn-early-warning/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 84 | `BuilderIO/agent-native` | `community-templates/demo-clip-library/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 85 | `BuilderIO/agent-native` | `community-templates/demo-clip-library/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 86 | `BuilderIO/agent-native` | `community-templates/demo-clip-library/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 87 | `BuilderIO/agent-native` | `community-templates/demo-clip-library/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 88 | `BuilderIO/agent-native` | `community-templates/demo-clip-library/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 89 | `BuilderIO/agent-native` | `community-templates/demo-clip-library/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 90 | `BuilderIO/agent-native` | `community-templates/demo-clip-library/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 91 | `BuilderIO/agent-native` | `community-templates/demo-clip-library/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 92 | `BuilderIO/agent-native` | `community-templates/linkedin-icp-prospect-tracker/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 93 | `BuilderIO/agent-native` | `community-templates/linkedin-icp-prospect-tracker/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 94 | `BuilderIO/agent-native` | `community-templates/linkedin-icp-prospect-tracker/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 95 | `BuilderIO/agent-native` | `community-templates/linkedin-icp-prospect-tracker/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 96 | `BuilderIO/agent-native` | `community-templates/linkedin-icp-prospect-tracker/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 97 | `BuilderIO/agent-native` | `community-templates/linkedin-icp-prospect-tracker/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 98 | `BuilderIO/agent-native` | `community-templates/linkedin-icp-prospect-tracker/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 99 | `BuilderIO/agent-native` | `community-templates/linkedin-icp-prospect-tracker/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 100 | `BuilderIO/agent-native` | `community-templates/linkedin-signal-watch/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 101 | `BuilderIO/agent-native` | `community-templates/linkedin-signal-watch/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 102 | `BuilderIO/agent-native` | `community-templates/linkedin-signal-watch/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 103 | `BuilderIO/agent-native` | `community-templates/linkedin-signal-watch/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 104 | `BuilderIO/agent-native` | `community-templates/linkedin-signal-watch/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 105 | `BuilderIO/agent-native` | `community-templates/linkedin-signal-watch/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 106 | `BuilderIO/agent-native` | `community-templates/linkedin-signal-watch/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 107 | `BuilderIO/agent-native` | `community-templates/linkedin-signal-watch/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 108 | `BuilderIO/agent-native` | `community-templates/outbound-in-your-voice/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 109 | `BuilderIO/agent-native` | `community-templates/outbound-in-your-voice/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 110 | `BuilderIO/agent-native` | `community-templates/outbound-in-your-voice/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 111 | `BuilderIO/agent-native` | `community-templates/outbound-in-your-voice/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 112 | `BuilderIO/agent-native` | `community-templates/outbound-in-your-voice/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 113 | `BuilderIO/agent-native` | `community-templates/outbound-in-your-voice/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 114 | `BuilderIO/agent-native` | `community-templates/outbound-in-your-voice/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 115 | `BuilderIO/agent-native` | `community-templates/outbound-in-your-voice/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 116 | `BuilderIO/agent-native` | `community-templates/win-loss-memo/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 117 | `BuilderIO/agent-native` | `community-templates/win-loss-memo/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 118 | `BuilderIO/agent-native` | `community-templates/win-loss-memo/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 119 | `BuilderIO/agent-native` | `community-templates/win-loss-memo/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 120 | `BuilderIO/agent-native` | `community-templates/win-loss-memo/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 121 | `BuilderIO/agent-native` | `community-templates/win-loss-memo/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 122 | `BuilderIO/agent-native` | `community-templates/win-loss-memo/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 123 | `BuilderIO/agent-native` | `community-templates/win-loss-memo/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 124 | `BuilderIO/agent-native` | `packages/core/src/templates/default/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 125 | `BuilderIO/agent-native` | `packages/core/src/templates/default/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 126 | `BuilderIO/agent-native` | `packages/core/src/templates/default/.agents/skills/app-permissions/SKILL.md:19:2` | `path/missing` | `server/plugins/permission-policy.ts` | **pending** | — | calibration, round 31 |
| 127 | `BuilderIO/agent-native` | `packages/core/src/templates/default/.agents/skills/app-permissions/SKILL.md:75:28` | `path/missing` | `server/plugins/permission-policy.ts` | **pending** | — | calibration, round 31 |
| 128 | `BuilderIO/agent-native` | `packages/core/src/templates/default/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 129 | `BuilderIO/agent-native` | `packages/core/src/templates/default/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 130 | `BuilderIO/agent-native` | `packages/core/src/templates/default/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **true** | — | calibration, round 31 |
| 131 | `BuilderIO/agent-native` | `packages/core/src/templates/default/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 132 | `BuilderIO/agent-native` | `packages/core/src/templates/default/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 133 | `BuilderIO/agent-native` | `packages/core/src/templates/default/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 134 | `BuilderIO/agent-native` | `packages/core/src/templates/headless/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 135 | `BuilderIO/agent-native` | `packages/core/src/templates/headless/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 136 | `BuilderIO/agent-native` | `packages/core/src/templates/headless/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **true** | — | calibration, round 31 |
| 137 | `BuilderIO/agent-native` | `packages/core/src/templates/headless/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 138 | `BuilderIO/agent-native` | `packages/core/src/templates/headless/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 139 | `BuilderIO/agent-native` | `packages/core/src/templates/headless/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 140 | `BuilderIO/agent-native` | `packages/core/src/templates/workspace-core/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 141 | `BuilderIO/agent-native` | `packages/core/src/templates/workspace-core/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 142 | `BuilderIO/agent-native` | `packages/core/src/templates/workspace-core/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 143 | `BuilderIO/agent-native` | `packages/core/src/templates/workspace-core/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 144 | `BuilderIO/agent-native` | `packages/core/src/templates/workspace-core/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **true** | — | calibration, round 31 |
| 145 | `BuilderIO/agent-native` | `packages/core/src/templates/workspace-core/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 146 | `BuilderIO/agent-native` | `packages/core/src/templates/workspace-core/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 147 | `BuilderIO/agent-native` | `packages/core/src/templates/workspace-core/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 148 | `BuilderIO/agent-native` | `packages/core/src/templates/workspace-root/AGENTS.md:5:2` | `path/missing` | `packages/shared/AGENTS.md` | **pending** | — | calibration, round 31 |
| 149 | `BuilderIO/agent-native` | `packages/core/src/templates/workspace-root/AGENTS.md:5:33` | `path/missing` | `packages/shared/.agents/skills/` | **pending** | — | calibration, round 31 |
| 150 | `BuilderIO/agent-native` | `packages/core/src/templates/workspace-root/AGENTS.md:35:25` | `path/missing` | `packages/shared/AGENTS.md` | **pending** | — | calibration, round 31 |
| 151 | `BuilderIO/agent-native` | `packages/core/src/templates/workspace-root/AGENTS.md:36:2` | `path/missing` | `packages/shared/.agents/skills/` | **pending** | — | calibration, round 31 |
| 152 | `BuilderIO/agent-native` | `packages/core/src/templates/workspace-root/AGENTS.md:88:9` | `path/missing` | `packages/shared/.agents/skills/delegate-to-agent/SKILL.md` | **pending** | — | calibration, round 31 |
| 153 | `BuilderIO/agent-native` | `packages/core/src/templates/workspace-root/AGENTS.md:163:4` | `path/missing` | `packages/shared/.agents/skills/composable-mini-apps/SKILL.md` | **pending** | — | calibration, round 31 |
| 154 | `BuilderIO/agent-native` | `packages/core/src/templates/workspace-root/AGENTS.md:221:9` | `path/missing` | `packages/shared/.agents/skills/shadcn-ui/SKILL.md` | **pending** | — | calibration, round 31 |
| 155 | `BuilderIO/agent-native` | `templates/analytics/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 156 | `BuilderIO/agent-native` | `templates/analytics/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 157 | `BuilderIO/agent-native` | `templates/analytics/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 158 | `BuilderIO/agent-native` | `templates/analytics/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 159 | `BuilderIO/agent-native` | `templates/analytics/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 160 | `BuilderIO/agent-native` | `templates/analytics/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 161 | `BuilderIO/agent-native` | `templates/analytics/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 162 | `BuilderIO/agent-native` | `templates/analytics/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 163 | `BuilderIO/agent-native` | `templates/assets/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 164 | `BuilderIO/agent-native` | `templates/assets/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 165 | `BuilderIO/agent-native` | `templates/assets/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 166 | `BuilderIO/agent-native` | `templates/assets/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 167 | `BuilderIO/agent-native` | `templates/assets/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 168 | `BuilderIO/agent-native` | `templates/assets/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 169 | `BuilderIO/agent-native` | `templates/assets/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 170 | `BuilderIO/agent-native` | `templates/assets/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 171 | `BuilderIO/agent-native` | `templates/brain/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 172 | `BuilderIO/agent-native` | `templates/brain/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 173 | `BuilderIO/agent-native` | `templates/brain/.agents/skills/brain/SKILL.md:187:72` | `path/missing` | `context/company-brain/` | **pending** | — | calibration, round 31 |
| 174 | `BuilderIO/agent-native` | `templates/brain/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 175 | `BuilderIO/agent-native` | `templates/brain/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 176 | `BuilderIO/agent-native` | `templates/brain/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 177 | `BuilderIO/agent-native` | `templates/brain/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 178 | `BuilderIO/agent-native` | `templates/brain/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 179 | `BuilderIO/agent-native` | `templates/brain/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 180 | `BuilderIO/agent-native` | `templates/calendar/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 181 | `BuilderIO/agent-native` | `templates/calendar/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 182 | `BuilderIO/agent-native` | `templates/calendar/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 183 | `BuilderIO/agent-native` | `templates/calendar/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 184 | `BuilderIO/agent-native` | `templates/calendar/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 185 | `BuilderIO/agent-native` | `templates/calendar/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 186 | `BuilderIO/agent-native` | `templates/calendar/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 187 | `BuilderIO/agent-native` | `templates/calendar/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 188 | `BuilderIO/agent-native` | `templates/chat/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 189 | `BuilderIO/agent-native` | `templates/chat/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 190 | `BuilderIO/agent-native` | `templates/chat/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 191 | `BuilderIO/agent-native` | `templates/chat/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 192 | `BuilderIO/agent-native` | `templates/chat/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 193 | `BuilderIO/agent-native` | `templates/chat/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 194 | `BuilderIO/agent-native` | `templates/chat/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 195 | `BuilderIO/agent-native` | `templates/chat/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 196 | `BuilderIO/agent-native` | `templates/clips/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 197 | `BuilderIO/agent-native` | `templates/clips/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 198 | `BuilderIO/agent-native` | `templates/clips/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 199 | `BuilderIO/agent-native` | `templates/clips/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 200 | `BuilderIO/agent-native` | `templates/content/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 201 | `BuilderIO/agent-native` | `templates/content/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 202 | `BuilderIO/agent-native` | `templates/content/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 203 | `BuilderIO/agent-native` | `templates/content/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 204 | `BuilderIO/agent-native` | `templates/content/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 205 | `BuilderIO/agent-native` | `templates/content/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 206 | `BuilderIO/agent-native` | `templates/content/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 207 | `BuilderIO/agent-native` | `templates/content/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 208 | `BuilderIO/agent-native` | `templates/crm/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 209 | `BuilderIO/agent-native` | `templates/crm/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 210 | `BuilderIO/agent-native` | `templates/crm/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 211 | `BuilderIO/agent-native` | `templates/crm/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 212 | `BuilderIO/agent-native` | `templates/crm/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 213 | `BuilderIO/agent-native` | `templates/crm/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 214 | `BuilderIO/agent-native` | `templates/crm/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 215 | `BuilderIO/agent-native` | `templates/crm/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 216 | `BuilderIO/agent-native` | `templates/design/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 217 | `BuilderIO/agent-native` | `templates/design/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 218 | `BuilderIO/agent-native` | `templates/design/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 219 | `BuilderIO/agent-native` | `templates/design/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 220 | `BuilderIO/agent-native` | `templates/design/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 221 | `BuilderIO/agent-native` | `templates/design/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 222 | `BuilderIO/agent-native` | `templates/design/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 223 | `BuilderIO/agent-native` | `templates/design/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 224 | `BuilderIO/agent-native` | `templates/dispatch/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 225 | `BuilderIO/agent-native` | `templates/dispatch/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 226 | `BuilderIO/agent-native` | `templates/dispatch/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 227 | `BuilderIO/agent-native` | `templates/dispatch/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 228 | `BuilderIO/agent-native` | `templates/dispatch/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 229 | `BuilderIO/agent-native` | `templates/dispatch/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 230 | `BuilderIO/agent-native` | `templates/dispatch/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 231 | `BuilderIO/agent-native` | `templates/dispatch/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 232 | `BuilderIO/agent-native` | `templates/factory/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 233 | `BuilderIO/agent-native` | `templates/factory/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 234 | `BuilderIO/agent-native` | `templates/factory/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 235 | `BuilderIO/agent-native` | `templates/factory/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 236 | `BuilderIO/agent-native` | `templates/factory/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 237 | `BuilderIO/agent-native` | `templates/factory/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 238 | `BuilderIO/agent-native` | `templates/factory/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 239 | `BuilderIO/agent-native` | `templates/factory/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 240 | `BuilderIO/agent-native` | `templates/forms/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 241 | `BuilderIO/agent-native` | `templates/forms/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 242 | `BuilderIO/agent-native` | `templates/forms/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 243 | `BuilderIO/agent-native` | `templates/forms/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 244 | `BuilderIO/agent-native` | `templates/forms/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 245 | `BuilderIO/agent-native` | `templates/forms/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 246 | `BuilderIO/agent-native` | `templates/forms/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 247 | `BuilderIO/agent-native` | `templates/forms/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 248 | `BuilderIO/agent-native` | `templates/mail/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 249 | `BuilderIO/agent-native` | `templates/mail/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 250 | `BuilderIO/agent-native` | `templates/mail/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 251 | `BuilderIO/agent-native` | `templates/mail/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 252 | `BuilderIO/agent-native` | `templates/mail/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 253 | `BuilderIO/agent-native` | `templates/mail/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 254 | `BuilderIO/agent-native` | `templates/mail/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 255 | `BuilderIO/agent-native` | `templates/mail/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 256 | `BuilderIO/agent-native` | `templates/plan/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 257 | `BuilderIO/agent-native` | `templates/plan/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 258 | `BuilderIO/agent-native` | `templates/plan/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 259 | `BuilderIO/agent-native` | `templates/plan/.agents/skills/plan-local-codebase-chat/SKILL.md:19:40` | `path/missing` | `instructions/local-codebases/` | **pending** | — | calibration, round 31 |
| 260 | `BuilderIO/agent-native` | `templates/plan/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 261 | `BuilderIO/agent-native` | `templates/plan/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 262 | `BuilderIO/agent-native` | `templates/plan/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 263 | `BuilderIO/agent-native` | `templates/plan/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 264 | `BuilderIO/agent-native` | `templates/plan/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 265 | `BuilderIO/agent-native` | `templates/slides/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 266 | `BuilderIO/agent-native` | `templates/slides/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 267 | `BuilderIO/agent-native` | `templates/slides/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 268 | `BuilderIO/agent-native` | `templates/slides/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 269 | `BuilderIO/agent-native` | `templates/slides/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 270 | `BuilderIO/agent-native` | `templates/slides/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 271 | `BuilderIO/agent-native` | `templates/slides/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 272 | `BuilderIO/agent-native` | `templates/slides/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 273 | `BuilderIO/agent-native` | `templates/tasks/.agents/skills/actions/SKILL.md:29:91` | `path/missing` | `actions/list-meals.ts` | **pending** | — | calibration, round 31 |
| 274 | `BuilderIO/agent-native` | `templates/tasks/.agents/skills/actions/SKILL.md:149:100` | `path/missing` | `actions/foo-bar.ts` | **pending** | — | calibration, round 31 |
| 275 | `BuilderIO/agent-native` | `templates/tasks/.agents/skills/efficient-frontier/SKILL.md:3:1` | `frontmatter/invalid` | `description: Apply the same orchestration as `/efficient-fab` | **pending** | — | calibration, round 31 |
| 276 | `BuilderIO/agent-native` | `templates/tasks/.agents/skills/external-agents/SKILL.md:457:51` | `path/missing` | `.vscode/mcp.json` | **pending** | — | calibration, round 31 |
| 277 | `BuilderIO/agent-native` | `templates/tasks/.agents/skills/portability/SKILL.md:92:65` | `path/missing` | `netlify/functions/` | **pending** | — | calibration, round 31 |
| 278 | `BuilderIO/agent-native` | `templates/tasks/.agents/skills/secrets/SKILL.md:426:4` | `path/missing` | `packages/core/src/tools/fetch-tool.ts` | **pending** | — | calibration, round 31 |
| 279 | `BuilderIO/agent-native` | `templates/tasks/.agents/skills/storing-data/SKILL.md:32:52` | `path/missing` | `drizzle/START_HERE.md` | **pending** | — | calibration, round 31 |
| 280 | `BuilderIO/agent-native` | `templates/tasks/.agents/skills/storing-data/SKILL.md:32:160` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 281 | `BuilderIO/agent-native` | `templates/tasks/.agents/skills/storing-data/SKILL.md:53:65` | `path/missing` | `drizzle/schema.ts` | **pending** | — | calibration, round 31 |
| 282 | `CamilleScholtz/swmpc` | `.agents/skills/asc-aso-audit/SKILL.md:21:53` | `path/missing` | `metadata/version/` | **false** | placeholder | calibration, round 31 |
| 283 | `CamilleScholtz/swmpc` | `.agents/skills/asc-shots-pipeline/SKILL.md:19:18` | `path/missing` | `.asc/screenshots.json` | **pending** | — | calibration, round 31 |
| 284 | `CamilleScholtz/swmpc` | `.agents/skills/asc-shots-pipeline/SKILL.md:96:10` | `path/missing` | `.asc/screenshots.json` | **pending** | — | calibration, round 31 |
| 285 | `CamilleScholtz/swmpc` | `.agents/skills/asc-whats-new-writer/SKILL.md:19:53` | `path/missing` | `metadata/version/` | **pending** | — | calibration, round 31 |
| 286 | `CamilleScholtz/swmpc` | `.agents/skills/asc-whats-new-writer/SKILL.md:172:55` | `path/missing` | `metadata/version/` | **pending** | — | calibration, round 31 |
| 287 | `CamilleScholtz/swmpc` | `.agents/skills/asc-workflow/SKILL.md:3:122` | `path/missing` | `.asc/workflow.json` | **pending** | — | calibration, round 31 |
| 288 | `CamilleScholtz/swmpc` | `.agents/skills/asc-workflow/SKILL.md:29:12` | `path/missing` | `.asc/workflow.json` | **pending** | — | calibration, round 31 |
| 289 | `CamilleScholtz/swmpc` | `.agents/skills/asc-workflow/SKILL.md:65:18` | `path/missing` | `.asc/workflow.json` | **pending** | — | calibration, round 31 |
| 290 | `CamilleScholtz/swmpc` | `.agents/skills/asc-workflow/SKILL.md:204:10` | `path/missing` | `.asc/workflow.json` | **pending** | — | calibration, round 31 |
| 291 | `MuLTiAcidi/claudeos` | `agents/deserialization-hunter/CLAUDE.md:64:68` | `path/missing` | `AAEAAAD/////` | **false** | binary-signature | calibration, round 32 |
| 292 | `MuLTiAcidi/claudeos` | `agents/discord-bot-manager/CLAUDE.md:613:10` | `path/missing` | `plugins/DiscordSRV/config.yml` | **pending** | — | calibration, round 31 |
| 293 | `MuLTiAcidi/claudeos` | `agents/doc-generator/CLAUDE.md:854:16` | `path/missing` | `docs/api.md` | **pending** | — | calibration, round 31 |
| 294 | `MuLTiAcidi/claudeos` | `agents/docker-inspector/CLAUDE.md:12:42` | `path/missing` | `redteam/loot/docker-inspector/` | **pending** | — | calibration, round 31 |
| 295 | `MuLTiAcidi/claudeos` | `agents/drupal-hunter/CLAUDE.md:530:68` | `path/missing` | `core/drupal.js` | **pending** | — | calibration, round 31 |
| 296 | `MuLTiAcidi/claudeos` | `agents/drupal-hunter/CLAUDE.md:533:42` | `path/missing` | `sites/all/modules/custom/` | **pending** | — | calibration, round 31 |
| 297 | `MuLTiAcidi/claudeos` | `agents/electron-unpacker/CLAUDE.md:412:60` | `path/missing` | `resources/app/` | **pending** | — | calibration, round 31 |
| 298 | `MuLTiAcidi/claudeos` | `agents/exploit-validator/CLAUDE.md:821:47` | `path/missing` | `reports/exploit-validation/` | **pending** | — | calibration, round 31 |
| 299 | `MuLTiAcidi/claudeos` | `agents/git-deploy/CLAUDE.md:114:36` | `path/missing` | `config/deploy/` | **pending** | — | calibration, round 31 |
| 300 | `MuLTiAcidi/claudeos` | `agents/github-recon/CLAUDE.md:12:79` | `path/missing` | `redteam/loot/github-recon/` | **pending** | — | calibration, round 31 |
| 301 | `MuLTiAcidi/claudeos` | `agents/lfi-hunter/CLAUDE.md:98:36` | `path/missing` | `././././etc/passwd` | **pending** | — | calibration, round 31 |
| 302 | `MuLTiAcidi/claudeos` | `agents/lfi-hunter/CLAUDE.md:430:51` | `path/missing` | `....//` | **pending** | — | calibration, round 31 |
| 303 | `MuLTiAcidi/claudeos` | `agents/magento-hunter/CLAUDE.md:594:66` | `path/missing` | `app/etc/env.php` | **pending** | — | calibration, round 31 |
| 304 | `MuLTiAcidi/claudeos` | `agents/notifications/CLAUDE.md:687:24` | `path/missing` | `scripts/daily-digest.sh` | **pending** | — | calibration, round 31 |
| 305 | `MuLTiAcidi/claudeos` | `agents/pentest-scanner/CLAUDE.md:774:47` | `path/missing` | `reports/pentest-report-DATE.txt` | **pending** | — | calibration, round 31 |
| 306 | `MuLTiAcidi/claudeos` | `agents/program-monitor/CLAUDE.md:121:22` | `path/missing` | `scrapers/bugcrowd.py` | **pending** | — | calibration, round 31 |
| 307 | `MuLTiAcidi/claudeos` | `agents/proof-collector/CLAUDE.md:695:17` | `path/missing` | `evidence/` | **pending** | — | calibration, round 31 |
| 308 | `MuLTiAcidi/claudeos` | `agents/proof-collector/CLAUDE.md:696:18` | `path/missing` | `evidence/` | **pending** | — | calibration, round 31 |
| 309 | `MuLTiAcidi/claudeos` | `agents/proof-collector/CLAUDE.md:697:20` | `path/missing` | `evidence/` | **pending** | — | calibration, round 31 |
| 310 | `MuLTiAcidi/claudeos` | `agents/proof-collector/CLAUDE.md:698:22` | `path/missing` | `evidence/` | **pending** | — | calibration, round 31 |
| 311 | `MuLTiAcidi/claudeos` | `agents/proof-collector/CLAUDE.md:699:19` | `path/missing` | `evidence/` | **pending** | — | calibration, round 31 |
| 312 | `MuLTiAcidi/claudeos` | `agents/sqli-hunter/CLAUDE.md:247:42` | `path/missing` | `sqlmap/tamper/` | **pending** | — | calibration, round 31 |
| 314 | `MuLTiAcidi/claudeos` | `agents/test-runner/CLAUDE.md:1209:21` | `path/missing` | `scripts/seed.sh` | **pending** | — | calibration, round 31 |
| 315 | `MuLTiAcidi/claudeos` | `agents/test-runner/CLAUDE.md:1210:23` | `path/missing` | `scripts/regression-check.sh` | **pending** | — | calibration, round 31 |
| 316 | `MuLTiAcidi/claudeos` | `agents/waf-fingerprinter/CLAUDE.md:334:2` | `path/missing` | `bypass-notes/target.example.com.md` | **pending** | — | calibration, round 31 |
| 317 | `MuLTiAcidi/claudeos` | `agents/wordpress-hunter/CLAUDE.md:577:65` | `path/missing` | `wp-includes/version.php` | **pending** | — | calibration, round 31 |
| 318 | `TommyLike/KnowledgeBase` | `.claude/commands/kg-refresh.md:100:6` | `path/missing` | `repo/README.md` | **pending** | — | calibration, round 31 |
| 319 | `TommyLike/KnowledgeBase` | `.claude/commands/kg-refresh.md:101:6` | `path/missing` | `repo/docs/` | **pending** | — | calibration, round 31 |
| 320 | `TommyLike/KnowledgeBase` | `.claude/commands/kg-refresh.md:102:6` | `path/missing` | `repo/CHANGELOG.md` | **false** | readers-project | calibration, round 31 |
| 321 | `bmad-labs/skills` | `CLAUDE.md:24:4` | `path/missing` | `.claude/commands/` | **true** | — | calibration, round 31 |
| 322 | `eggjs/egg` | `.github/copilot-instructions.md:46:6` | `path/missing` | `packages/mock/` | **pending** | — | calibration, round 31 |
| 323 | `eggjs/egg` | `AGENTS.md:95:76` | `path/missing` | `src/global.d.ts` | **false** | readers-project | calibration, round 31 |
| 324 | `eggjs/egg` | `AGENTS.md:154:4` | `path/missing` | `wiki/decisions/` | **pending** | — | calibration, round 31 |
| 325 | `eggjs/egg` | `AGENTS.md:155:4` | `path/missing` | `wiki/sources/` | **pending** | — | calibration, round 31 |
| 326 | `eggjs/egg` | `tegg/CLAUDE.md:58:73` | `path/missing` | `../egg` | **pending** | — | calibration, round 31 |
| 327 | `eggjs/egg` | `tegg/CLAUDE.md:96:55` | `path/missing` | `../egg` | **pending** | — | calibration, round 31 |
| 328 | `factory-level/no-one-left-behind` | `.claude/agents/accessible-ai-course-writer.md:3:1` | `frontmatter/invalid` | `description: Use this agent when you need to create educatio` | **true** | — | calibration, round 31 |
| 329 | `factory-level/no-one-left-behind` | `.claude/agents/course-module-scaffolder.md:3:1` | `frontmatter/invalid` | `description: Use this agent when you need to create or updat` | **true** | — | calibration, round 31 |
| 330 | `factory-level/no-one-left-behind` | `.claude/agents/mkdocs-optimizer.md:3:1` | `frontmatter/invalid` | `description: Use this agent when working with MkDocs documen` | **true** | — | calibration, round 31 |
| 331 | `hecateq/hecateq-openagent` | `AGENTS.md:290:360` | `path/missing` | `.github/instructions/` | **false** | another-tools-layout | calibration, round 31 |
| 332 | `hecateq/hecateq-openagent` | `AGENTS.md:290:390` | `path/missing` | `.github/copilot-instructions.md` | **pending** | — | calibration, round 31 |
| 333 | `hecateq/hecateq-openagent` | `src/mcp/AGENTS.md:16:135` | `path/missing` | `LSP_TOOLS_MCP_PROJECT_CONFIG=.opencode/lsp.json` | **pending** | — | calibration, round 31 |
| 334 | `hecateq/hecateq-openagent` | `src/tools/look-at/AGENTS.md:47:87` | `path/missing` | `src/agents/builtin-agents/multimodal-looker.ts` | **true** | — | calibration, round 31 |
| 335 | `imarshallwidjaja/data-etl-dagster` | `services/dagster/etl_pipelines/AGENTS.md:13:87` | `path/missing` | `data-lake/blobs/` | **false** | foreign-project | calibration, round 31 |
| 336 | `imarshallwidjaja/data-etl-dagster` | `services/minio/AGENTS.md:8:25` | `path/missing` | `landing-zone/manifests/` | **pending** | — | calibration, round 31 |
| 337 | `imarshallwidjaja/data-etl-dagster` | `services/minio/AGENTS.md:9:43` | `path/missing` | `landing-zone/archive/` | **pending** | — | calibration, round 31 |
| 338 | `imarshallwidjaja/data-etl-dagster` | `services/minio/AGENTS.md:10:61` | `path/missing` | `data-lake/blobs/` | **pending** | — | calibration, round 31 |

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

**The second autofix the tool can produce is not in this corpus, and it was audited anyway.** `skill/frontmatter` offers to rewrite a `name` that disagrees with its directory, and the rule has never fired on these 66 repositories — so condition 2 has never had anything to say about it. Ticket `10` settled it outside the corpus, and the verdict is recorded here because condition 2 is what it bears on:

- **`skills-ref validate`**, the reference implementation <https://agentskills.io/specification.md> names, rejects the unfixed skill on exactly this rule — *"Directory name 'bankr-dev-portfolio' must match skill name 'Bankr Dev - Portfolio'"* — and calls the fixed one **valid**.
- **The other resolution does not work.** Renaming the directory to match the name leaves the skill invalid, because the name is not lowercase. When the directory is already kebab-case, rewriting the name is the *only* repair — which is the gate the code has had since it shipped.
- **Nothing invokes a skill by that field.** Claude Code's command name is the directory; `npx skills` installs to the source directory and matches its lockfile on either form. Across 141 skills installed on this machine, **0** have a `name` that disagrees with their directory.

Not a corpus measurement and not counted as one: no repository here produces the finding, and the numbers above are properties of the tools rather than of a sample. The autofix stays.

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

The comment on the `holdout` field in `scripts/corpus/repos.ts` says the opposite about half of it: "Classifying its findings **is** the measurement and does not contaminate; opening the repo to see what the tool discarded does."

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

Rounds nine, ten and eleven cite the validation group as **19 of 19**, and the criterion table above said the same. The group has held **18** repos — `holdout: true` appears 18 times in `scripts/corpus/repos.ts`, and the header of this document has said 18 throughout, which is the figure `corpus-bookkeeping.test.ts` pins.

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
4. ~~The two replacement validation repos owed since M2 are still owed.~~ Wrong when written: they were paid in round thirteen. This round burned nothing either — every finding it produced landed in calibration.

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
3. ~~The two replacement validation repos owed since M2.~~ Not owed: paid in round thirteen. See the correction in §"What happened, and why the caveat was right".

---

## Twentieth round, 2026-09-19: the package-name prefix, and what knowing the manifests buys

The largest class round eighteen left open, and the only one that could not be answered from the string alone.

### The class

Sixteen findings, all in one skill in `remix-run/react-router`:

```
react-router/docs/start/modes.md
react-router/docs/how-to/spa.md
react-router/docs/upgrading/future.md
…
```

`docs/start/modes.md` exists. `react-router/docs/start/modes.md` does not, and there is no `react-router/` directory in the repository. The skill explains why, in a sentence that is itself one of the sixteen:

> When this skill references `react-router/docs/...`, read the matching file under `node_modules/react-router/docs/`. If the installed version does not include local docs, use the repo `docs/` directory

The prefix is a **package specifier** — the published package's copy of a file the repo keeps at the root. It is the same kind of thing as `link:../..` or `#lib/`, which `discard.ts` already discards, with one difference that decides the rule's shape: **those are recognisable from syntax and this one is not.** `react-router/docs/start/modes.md` is an ordinary-looking relative path. The only thing that says otherwise is knowing the name of the package.

### Which this tool knows

`buildRepoIndex` parses every `package.json` it walks past, so the set of names the repo publishes is already in hand before any check runs. The rule reads it:

> A path whose first segment names a package in this repo, **and is not a directory in this repo**, is a package specifier.

**Gated on absence**, exactly like `belongsToAbsentTool`, and the gate is what keeps it narrow. A monorepo publishing a package called `docs` while also keeping a real `docs/` directory is talking about the directory, and a file missing from it is drift like any other — the rule does not fire. It only fires when the first segment resolves to nothing in the tree, which is when a package is the remaining explanation.

### The bill

| | round 19 | round 20 |
|---|---|---|
| findings | 52 | **36** |
| calibration / validation | 40 / 12 | **24 / 12** |
| snapshots changed | — | 1 |

Sixteen findings, one repository, one snapshot. Nothing else in the corpus moved — no other repo publishes a package whose name is not also a directory and is written as a path prefix.

`react-router` goes from 19 findings to 3, and the three are from three different classes, which is the shape you want left over:

```
docs/upgrading/future-flags.md   ← true: renamed to future.md
app/entry.server.tsx             ← class E, a path in the reader's project
+types/                          ← class D, generated by typegen
```

**It is a calibration repo**, so nothing moved groups and no replacement is owed.

### What it costs

A repository that publishes a package named after a directory it has deleted. The claim would then be about the deleted directory and would go unreported. That is narrow, and it fails as a false negative rather than a false positive, which is the trade `AGENTS.md` § "The rule that orders every decision" makes every time.

### What is left from round eighteen

One class: **an absolute path that is a documentation-site URL** — `/docs/app/glossary` in `vercel/next.js`, 3 findings. It stays open on purpose. Whether `/docs/app/glossary` is drift depends on whether that site's routes are supposed to track the repository's files, which is a judgement about next.js and not about the string, and no rule here can make it without knowing the answer.

---

## Twenty-first round, 2026-09-19: a leading slash is not a path in this repo

The last class round eighteen left open, and the one that looked like it needed a judgement about `vercel/next.js`. It did not. It needed a count.

### The class

Three findings, all in `vercel/next.js`:

```
/docs/app/glossary#static-shell   inline-code
/docs/app/glossary                link
/docs/app/                        inline-code
```

Round twenty said this stays open because "whether `/docs/app/glossary` is drift depends on whether that site's routes are supposed to track the repository's files, which is a judgement about next.js". That framing was the mistake. The question is not what next.js means by it — it is what a leading slash means at all, and the corpus can answer that.

### The count

Across the 66 repos, **306 claims are written as an absolute path. Five resolve to anything in the repo.** The other 301 fall into three kinds and none of them is a file here:

| kind | examples | repo |
|---|---|---|
| HTTP routes | `/v1/responses`, `/embeddings`, `/batches`, `/model/new` | `BerriAI/litellm` |
| site URLs | `/docs/app/glossary`, `/docs/app/` | `vercel/next.js` |
| real absolute paths | `/etc/`, `/tmp/../etc/` | `1amageek/SwiftAgent` |

And of the 36 findings the corpus held before this round, **exactly three came from an absolute path — the three above, all false.** The reading `resolve.ts` had encoded since the beginning, that a leading slash means "from the repo root", has sustained **no true finding in 66 repositories** and produced three false ones.

### The rule

A leading slash is discarded, the way `~/` is, and for the same reason rather than a similar one: it is the extractor being told about a syntax it was misreading. In Markdown `](/x)` is a root-relative **URL** — that is what it means in every renderer — and in prose `/x` is an absolute path on somebody's disk. Neither is checkable against a repo index.

`//host/x` stays rule 1's protocol-relative URL. The reason a text was discarded is what the tests pin and what the report shows.

### What it reverses, and what that costs

`fix-range.test.ts` asserted the opposite and has been rewritten rather than deleted: *"accepts a root-relative path in a nested source, which is unambiguous"* — `/src/util/date.ts` in `packages/api/AGENTS.md`, reported and autofixed to `/src/helpers/date.ts`.

That case is real and is now unreported. It is also **synthetic**: the corpus has never produced it in 66 repositories, while the reading it defends produced three false positives in one. `AGENTS.md` § "The rule that orders every decision" settles which way that trade goes, and the test now documents the cost instead of asserting the benefit.

### The bill

| | round 20 | round 21 |
|---|---|---|
| findings | 36 | **33** |
| false | 14 | **11** |
| snapshots changed | 1 | 1 |

`vercel/next.js` goes from 6 findings to 3. It is a **calibration** repo, so nothing moved groups and no replacement is owed.

### Round eighteen is closed

Every class it opened has a verdict and a rule or a reason:

| class | n | outcome |
|---|---|---|
| B, gitignored paths behind a symlink | 18 | a bug, fixed in round 18 |
| A, package-name prefix | 16 | rule, round 20 |
| C, absolute paths | 3 | rule, round 21 |
| D, placeholders | 4 | `path/to` rule in round 19; `+types/` and the two anchors stay |
| F1, a file the document tells you to create | 3 | rule, round 19 |
| E, a path in the reader's project | 1 | open |
| F2, a runtime log | 1 | open |
| F3/F4 | 2 | **true**, reported and correct |

What is left open is three findings in three unrelated shapes, which is the tail this document has always had rather than a class anyone can close.

## Twenty-second round, 2026-09-19: two more skills roots, and the one that counts repositories

Ticket `11` took the four skills roots round eighteen left on the table. Two were added, two
were not, and the useful part is not which — it is what the numbers turned out to mean.

### Order by repositories, not by files

The ticket says to take them "in corpus-volume order", counting `SKILL.md` files. Counted that
way the order is `.flue` (11), `.codex` (11), `.github` (7), `.opencode` (3). Counted by
**repositories** it inverts almost exactly:

| root | files | repos in the corpus | repos, discovery † |
|---|---|---|---|
| `.github` | 7 | 3 | **13** |
| `.codex` | 11 | 1 | 6 |
| `.opencode` | 3 | 2 | 5 |
| `.flue` | 11 | **1** | **1** |

† A reading of the ecosystem over the discovery corpus, which is disposable and unsnapshotted.
It is not a measurement of driftwatch and moves no condition of ADR-0006; it is here because
telling a convention from a project is a question about the population, not about this tool.

`.flue`'s eleven files are one project, `emdash-cms/emdash` — the same repository in the
certification corpus and the only one of 700 discovery repositories that uses it. A root one
project uses is that project's convention, and a file count cannot tell the two apart.

**That is where the line fell**, which is what step 3 of the ticket asked to record.

### What was added, and what it cost

| root | sources | findings | verdict |
|---|---|---|---|
| `.codex` | +11, all in `openai/codex` | 2 | both true |
| `.opencode` | +3, in `sst/opencode` and `cloudflare/workers-sdk` | **0** | — |

`.opencode` is a free widening: three sources more, nothing to rule on.

The two `.codex` findings are in one file, `.codex/skills/code-review-breaking-changes/SKILL.md`:

| finding | verdict |
|---|---|
| `name: code-breaking-changes` in `code-review-breaking-changes/` | **true**, and fixable |
| `description: Breaking changes`, 16 characters | **true** by the rule as it ships |

The first is the class round eighteen opened and ticket `10` settled: the directory is
kebab-case, so rewriting `name` to match it is the only repair `skills-ref` accepts. The name
has simply lost a word. `pnpm corpus --fixes` prints the edit and it is right:

```
- name: code-breaking-changes
+ name: code-review-breaking-changes
```

The second is a `description` under the 20-character minimum — true by the shipped rule, and
one more instance of the question ticket `14` is about, since nothing in the repository changed
underneath it.

### Condition 2 holds

The corpus goes from one fixable finding to two, and both are true. `openai/codex` is a
**calibration** repo, so nothing moves groups and no replacement is owed.

| | round 21 | round 22 |
|---|---|---|
| sources | 320 | **334** |
| findings | 33 | **35** |
| fixable | 1 | **2** |
| false | 11 | 11 |

### `.github/skills/` is held out, and not because of the root

It is the most widely used of the four — 13 of 700 discovery repositories, more than `.cursor`,
which already ships. Adding it produces **84 findings**, and 80 of them come from a single file:
`remix-run/react-router`'s `.github/skills/agentic-workflows/SKILL.md`, which lists forty paths
under `.github/aw/` and says, one line above the list:

> Load these files from `github/gh-aw` (**they are not available locally**).

The document could not be clearer and no gate reads it. The sentence is a heading for a bullet
list, so the two-line window never reaches it — each bullet opens its own item — and
`namesAnotherRepo` wants a `github.com` URL where this writes a bare slug. The first path is
hedged too, as ``If `.github/aw/instructions.md` exists``, which `HEDGED`'s `if exists` misses
because the path sits between the two words.

**None of that is a fact about `.github/`.** The same file under `.agents/skills/` produces the
same 80 findings; the root only made it visible. So the root is held behind ticket `18`, which
is about the gate, and the other four findings it would add — `securego/gosec`, four
title-cased `name` fields against kebab-case directories, all true and all fixable — are held
with it.

That is the honest version of "stop when a root's diff is more review than its findings are
worth": the diff was not more review, it was a defect.

## Twenty-third round, 2026-09-19: the section that says its files are elsewhere

Ticket `18`. A document can name forty paths and say, in the sentence above them, that none is
in this repository — and until now no gate could read that sentence. Three near-misses, each
of which taught something:

| gate | why it missed |
|---|---|
| `HEDGED` | window-scoped, and every bullet `opensItsOwnItem`, so the window never reached the lead-in |
| `namesAnotherRepo` | wants a `github.com` URL; the document writes the bare slug `` `github/gh-aw` `` |
| `if exists` | a literal string, and the document writes ``If `x` exists`` with the path between the words |

Three changes, each priced separately.

### The hedge whose two halves a path stands between

`HEDGED` holds literal strings and a document writes ``If `x` exists``: the marker split by the
very thing it is hedging about. It is now one **pattern**, `if … exists`, read against the line
with each code span masked to a single character.

Both halves of that came from getting it wrong, and a reviewer found the first while a
measurement found the second:

| attempt | what broke |
|---|---|
| strip every span before matching | "Pick a name such `foo` as the slug" becomes the marker "such as" |
| leave the spans in place | `` `CREATE TABLE IF NOT EXISTS` `` reads as a hedge about `src/schema.sql` on the same line (edmundmiller/dotfiles) |

A mask is not whitespace, so it cannot join two phrases; and it hides what is inside a span,
which is something being named rather than something being said.

### A line that introduces a list speaks for the list

`lineAround` opened the previous line only for a continuation. A bullet is not a continuation,
so a list under a disclaiming lead-in was forty independent claims. The walk is bounded, and
**every bound came from a repository that broke an earlier version of it**:

| bound | what it prevents | found by |
|---|---|---|
| lead-in + item, nothing in between | a sibling bullet's `e.g.` silencing this one | `openai/codex` |
| lead-in indent ≤ the item's | a sibling's wrapped second line read as a lead-in | `saubakirov/KZ-IT-telegram-list` |
| only siblings at the same indent | an outer list's lead-in reaching a nested item | — |
| one blank line, never past a heading | a different paragraph, a different subject | — |

Both repositories lost a finding to an early version and both got it back, and **that is only
good news for one of them.** `openai/codex`'s `app-server-protocol/src/protocol/v2.rs` is
**true**, adjudicated in round one — there is no `v2.rs` — so restoring it is the bound working.
`saubakirov/KZ-IT-telegram-list`'s `.tfw/adapters/antigravity/rules/` is a **known false
positive**, round thirteen, and round eighteen's class B left it open deliberately. The early
version silenced it by accident and the bound reports it again.

So the bound's ledger is one true finding recovered and one known false positive restored, and
it is kept for the first. An earlier version of this round said both were true, which was wrong:
the verdict was fourteen hundred lines away in a document with no per-finding index. Ticket `01`
is about exactly that.

### `ELSEWHERE`, and why it is its own class

`HEDGED` is a document being uncertain. "not in this repo" is a document being certain in the
other direction, so it reports under its own name rather than blurring the table `07` produces.

The phrasings were counted over 700 repositories rather than invented: `not in this repo` in
**15 repositories**, `not available locally` in 4, `not part of this repo` in 2. (Those were
first written here as 19, 5 and 3, which were **files**. Round twenty-two is the round that
says to count repositories and not files; the mistake it is about was made again two rounds
later, in the sentence justifying a suppression rule.) Every entry carries its own
**negation** on purpose — `available locally` alone is 28 repositories saying a thing *is*
there.

It is section-scoped, like `externalRootSections` and for the same reason: the document
disclaims once and writes two lists under one heading.

### The bill, measured twice

The certification corpus **does not move**: 66 repos · 334 sources · 35 findings, calibration
23 · validation 12, fixable 2.

That is uninformative on its own — the shape is not in the 66 — so the 700 discovery
repositories were audited before and after and the findings diffed, the way ticket `16`
established:

```
before 1442 · after 1430
ADDED 0 · REMOVED 12
```

**Nothing was added**, which is structural: these changes only widen suppression. Ten of the
twelve are correct, and every one is the ``if … exists`` shape a document wrote explicitly —
`cenconq25/claude-code-app-studio` (three), `christopher-buss/bedrock` (three),
`vmDeshpande/ai-agent-automation` (two), `crafts69guy/.dotfiles`, `meain/dotfiles`,
`avatune/avatune`, `caltechads/deployfish`. Two are over-suppression and are the cost:

| repository | what was lost | why |
|---|---|---|
| `DocRoms/Kronn` | `docs/linked-repos.md` | the row says to read it when the *task* references something not in this repo; the marker read that as being about the file |
| `TheAndrewStaker/mcp-midi-control` | `src/protocol/locations.ts` | the lead-in links to another repository about a different file, and the rule carried it to the bullet below |

**Two false negatives in 700 repositories against a class of eighty false positives in one
file**, and ten real hedges heard that were not being heard before. `AGENTS.md` § "The rule that orders every decision" settles that direction, and it is
worth noting the direction is the *only* reason it settles: two real claims went quiet.

Adding the section rule on top removed **nothing further** in 700 repositories. It is kept for
the document it was written for, where it takes the count from 13 to 0 — and a measured cost
of zero is not no cost, only a rule that rarely fires.

### What it unblocks

`remix-run/react-router`'s `.github/skills/agentic-workflows/SKILL.md`, audited on its own,
goes from **80 findings to none**, the fixable one among them. That is ticket `11`'s
`.github/skills/`, which was held back by this and by nothing else.

## Twenty-fourth round, 2026-09-19: `.github/skills/`, once it could be read

Ticket `11` held this root back and ticket `18` is why. With the gate in place the document
that blocked it — `remix-run/react-router`'s `agentic-workflows` skill — contributes **one
source and no findings**, where before it contributed eighty.

| repository | sources | findings |
|---|---|---|
| `remix-run/react-router` | +1 | **0** |
| `github/spec-kit` | +2 | 0 |
| `securego/gosec` [validation] | +4 | **4**, all fixable |

It also adds two findings in `iTwin/itwinjs-core`, which are not in the certification corpus
and so move nothing here. One of them, `docs/changehistory/X.X.0.md`, is a version template
`PLACEHOLDER_TEMPLATE` does not match — it looks for `X.Y.Z`. Recorded because it was found,
not because this round acts on it.

### The four, adjudicated

`securego/gosec` writes its skill names as titles against kebab-case directories:

| `name` | directory | verdict |
|---|---|---|
| `Fix Gosec Bug From Issue` | `gosec-fix-issue` | **true** |
| `Create New Gosec Rule` | `gosec-new-rule` | **true** |
| `Update Gosec Action Version` | `gosec-update-action-version` | **true** |
| `Update Supported Go Versions` | `gosec-update-go-versions` | **true** |

This is the class round eighteen opened and ticket `10` settled by running the tools rather
than re-reading the specification: `skills-ref validate` rejects every one of them three times
over — not lowercase, invalid characters, directory does not match name — and accepts the
rewritten form. The directories are all kebab-case, so rewriting `name` is the **only** repair
that produces a valid skill; renaming the directory to match leaves it invalid.

`pnpm corpus --fixes` prints all four and each is right.

### Condition 2

| | round 22 | round 24 |
|---|---|---|
| sources | 334 | **341** |
| findings | 35 | **39** |
| fixable | 2 | **6** |
| false fixable | 0 | **0** |

`securego/gosec` is a **validation** repo, which is what makes these four worth more than
their count: they were produced by a rule nobody tuned against them, on a repository nobody
opened to tune it. Nothing moved groups — no validation finding was used to change a rule
here; a root was added and this is the measurement.

## Twenty-fifth round, 2026-09-19: `skill/frontmatter` stops linting

Ticket `14`, raised by Angel while reviewing ticket `10` and settled by him here. The check
shipped in M2 with five rules and only one of them was ever drift.

### The argument is in `BRIEF.md`, not anywhere new

> **Non-goals.** It is not a Markdown linter (it does not check style, formatting or spelling).
> It does not judge whether the content is *good*, only whether it is *true*.

A `description` under twenty characters is not false. `allowed_tools` where the format says
`allowed-tools` is not false. A `name` in snake_case is not false. They are format and they are
quality, and that line names both as things this tool does not do.

The argument the other way, as ticket `14` recorded it, was `BRIEF.md` § "Why it actually
hurts": *"unlike code, these files have no compiler, no tests, no linter."* Read in place that
is the **reason drift hurts** — lying about the repository has no mechanical consequence — and
not a mandate to validate a format. The ticket cited it as the latter, which was a misreading
by the person who wrote the ticket.

### What the rules were worth, measured before removing them

Over 700 discovery repositories, `skill/frontmatter` with all five rules:

| rule | findings | repos | kind |
|---|---|---|---|
| `name` does not match the directory | 23, all fixable | 5 | **drift** |
| frontmatter missing / no required field | 19 | 7 | precondition |
| unknown key | 18 | **2** | lint |
| `description` shorter than 20 | 4 | 2 | lint |
| `name` not kebab-case | 1 | 1 | lint |

The drift rule fires most, and the lint rules yield far less than their count suggests. The
eighteen unknown keys are **two mistakes**: `meain/dotfiles` writes `user_invocable` in
fourteen skills and `aegntic/cldcde` writes `allowed_tools` in four, each the same snake_case
slip copied across a repository. Three of the four short descriptions are inside
`LF-Decentralized-Trust-labs/gitmesh`'s **test fixtures**, which are deliberately malformed
skills used as input data.

So: 23 lint findings from five distinct mistakes, against 23 drift findings from 23.

### What stays, and why it is not a fifth rule

`frontmatter is missing`, `frontmatter has no name or description`, and an empty required
value. Those are not judgements about a format — they are the **precondition** for the rule
that remains. With no frontmatter, or no `name` in it, there is nothing to compare a directory
against. They say "could not look", which is the same thing `13`'s skipped sources say.

`KEBAB` and `MAX_NAME` survive as the **autofix gate**, which is where ticket `10` had already
put `MAX_NAME`: the fix rewrites a `name` into its directory, so the directory has to be usable
as one. The gate is now strictly stricter than anything the check reports, which is the right
way round.

### The bill

| | round 24 | round 25 |
|---|---|---|
| findings | 39 | **38** |
| true | 28 | **27** |
| false | 11 | 11 |
| fixable | 6 | 6 |

**One finding**, `openai/codex`'s 16-character description, and it was **true** — a real
instance of a rule this project has decided not to have. Calibration goes 23 → 22; validation
is untouched, so nothing condition 5 or 6 rests on moved.

### What is knowingly given up

`allowed_tools` and `user_invocable` are real mistakes that stop a key from doing anything, and
no other tool in the ecosystem is widely run — `skills-ref validate` exists and ticket `08`
found 1 of 23 sampled skills invalid, which is the measure of how little it is used. Reporting
them was useful. It was not this tool's job, and a tool that does a neighbouring job because
nobody else will is how a scope stops meaning anything.

## Twenty-sixth round, 2026-09-19: one class closed, one measured away

Ticket `21`, written so that the placeholder class could be weighed **without** condition 6 in
the frame — closing it is one of the two moves that would restore the bar, and a rule derived
to move a number is the mistake the criterion exists to prevent.

It turned out to be two questions with two different answers, which is what the ticket
predicted.

### `+types/` is generated, and that is the whole finding

React Router's typegen writes `+types/` beside every route module. The skill names it in the
plainest way — *"imports from `./+types/...`"* — and nothing tracks it: not in
`remix-run/react-router` itself, and not in any of the three discovery repositories that
mention it.

That is `GENERATED`'s category and the list already carries its neighbours — `.react-router`,
`.next`, `.nuxt`, `.svelte-kit`, `.astro`. A framework's codegen output, named in context files
because that is where the types come from.

| | before | after |
|---|---|---|
| corpus | 38 findings | **37** |
| false positives | 11 | **10** |
| 700 discovery repositories | 1407 findings | **1407** |

One finding, and it was false. Nothing else moved anywhere.

### The anchors are not a class, and the measurement is the answer

`#anchor-a` and `#anchor-b` in `vercel/next.js` sit inside a **specimen of output** the skill
is instructing an agent to write: `Choose [Sibling fix A](#anchor-a) or [Sibling fix B](#anchor-b)
when either is feasible.` They are obviously stand-ins to a reader — and quoted as code here
rather than as prose, because a specimen of a link is not a link. That is the same distinction
`test/docs-links.test.ts` makes about `SPEC.md`, and until this line was written that way the
tool reported its own document twice.

Two rules were considered and the discovery corpus refused both.

**An anchor beginning with `anchor`.** Eight repositories write one, and seven of them mean it:
`#anchor-versions`, `#anchor-system`, `#anchormanager`, `#anchorbasedwriter`, `#anchor`. Real
headings in documents about anchoring.

**An anchor of the form `word-<single character>`.** Fifty-seven distinct such links across
fifteen repositories, and they are ordinary: `#layer-1`, `#layer-2`, `#item-5`, `#state-1`,
`#quote-s`, `#marketdatarequestreject-y`. Numbered and lettered headings are how documents
number and letter their headings.

Either rule would suppress dozens of real, checkable anchors to catch two in one repository.
**The class stays open**, and this is the useful half of the ticket: the rule that looked easy
is the one the ecosystem says not to write.

### Condition 6 is unmoved, which is the point

`remix-run/react-router` keeps `app/entry.server.tsx` — class E, a path in the reader's project
— so it is still unquiet. `vercel/next.js` keeps both anchors. **58 of 66 = 87.9%**, exactly as
round twenty-five recorded it.

The justified change did not move the bar and the change that would move the bar is not
justified. Ticket `20` is unchanged and stays recorded.

## Twenty-seventh round, 2026-09-21: `skill/frontmatter` is withdrawn

Angel's decision, and it is the third time he has asked the same question. Round twenty-five
quoted him — *"¿por qué hacemos lint de skills?"* — took three lint rules out and kept the
fourth on the grounds that it was drift. This round takes the fourth.

> no debemos cambiar el nombre a ninguna skill, no somos un validador de skills
>
> yo lo único que quiero es validar que las rutas que mencionan sean las correctas

That is a **scope** decision, not a precision one, and it costs true positives rather than
false ones. What follows is what it cost, so that nobody reads the drop from 37 to 32 as an
improvement.

### The five findings, and they were ruled true

| repository | `name` | directory | round 24's ruling |
|---|---|---|---|
| `securego/gosec` | `Fix Gosec Bug From Issue` | `gosec-fix-issue` | **true** |
| `securego/gosec` | `Create New Gosec Rule` | `gosec-new-rule` | **true** |
| `securego/gosec` | `Update Gosec Action Version` | `gosec-update-action-version` | **true** |
| `securego/gosec` | `Update Supported Go Versions` | `gosec-update-go-versions` | **true** |
| `openai/codex` | a `name` that had lost a word | `code-review-breaking-changes` | **true**, round 22 |

They are removed from the per-finding table because that table is held to the snapshots by
`corpus-bookkeeping.test.ts` and the snapshots no longer carry them. They are recorded here
instead, with their rulings intact. **Nothing about round 24's reading was wrong**; what
changed is that the question it answered is no longer one this tool asks.

Round 24's own justification is the tell, and it is worth quoting against itself:

> `skills-ref validate` rejects every one of them three times over — not lowercase, invalid
> characters, directory does not match name — and accepts the rewritten form.

That is a validation argument. It is the same argument round twenty-five rejected for the
other three rules, one round later, and it was left standing here because this rule's right
hand side happens to live on disk. Being repo-dependent made it look like drift. It is not:
a `SKILL.md` that says `name: "AgentDB Advanced Features"` in a directory called
`agentdb-advanced` asserts nothing false about the repository.

### What the discovery corpus said, and it is not a measurement

Recorded because it is why the question was asked again rather than as evidence: over 2533
discovery repositories the check produced **1884 findings, 670 of them fixable rewrites in 58
repositories**. Ticket `32` has the classes. Four per cent of them are "the directory was
renamed and the frontmatter did not follow", which is the sentence the check's own docstring
gave as its reason to exist. No number there is a precision and none of it moves a condition.

### The counts

| | round 26 | round 27 |
|---|---|---|
| findings | 37 | **32** |
| true | 27 | **22** |
| false | 10 | **10** |
| fixable | 6 | **1** |
| false fixable | 0 | **0** |
| validation findings | 16 | **12** |

**No condition moves.** Every withdrawn finding was true, so no repository's false-positive
count changes: condition 6 stays at 58 of 66 and validation at 29 of 32, and condition 2 stays
met on a smaller base — one fixable finding rather than six, and it is true. `securego/gosec` is a
validation repository that now produces nothing, which is a loss of evidence and not of
precision.

### What went with it

`src/verify/checks/skill-frontmatter.ts`, `src/extract/skill.ts` and the `SkillFact` it
carried; the `frontmatter` branch of `fix/range.ts`, which had no other caller; and
`suggestKey`, which had had none since round twenty-five. `CONTRACT.md` loses one check id —
free, because `1.0.0` is not tagged.

A `SKILL.md` is still a source. Every path it names is still `path/missing`'s business, and
that is the whole of what the tool now claims about a skill.

## Twenty-eighth round, 2026-09-21: `frontmatter/invalid` keeps the half that is a fact

The other half of round twenty-seven's decision, and it moved **nothing at all**.

`frontmatter/invalid` shipped as two checks under one id, and its own header said so: the
block either parses or it does not, which a parser we did not write decides; and a table of
keys whose *type* the format fixes, which is a schema somebody maintains by hand. The second
is format validation by the definition round twenty-five used, so it went.

### The type table had never fired

Measured before it was removed and again after, over **2533 discovery repositories**:

| | before | after |
|---|---|---|
| `frontmatter/invalid` | 315 | **315** |
| everything else | unchanged | unchanged |

**All 315 are parse failures.** The schema half produced zero findings in the wild and one in
the corpus — and that one, `colinhacks/zod`'s `description:`, is a parse failure too, so it
survives. Certification is unchanged at 66 · 341 · 32.

That is the cheapest removal this project has made: a table of four source kinds and eleven
keys, plus `BOOLEAN_WORDS` and the YAML 1.1 argument around it, all carried since M2 and never
once used. It was not wrong, it was unexercised, and nothing had ever asked.

### Why the parse half stays

Angel's line is that driftwatch checks whether the paths a document names are still there, and
a YAML parse error is not a path. What keeps it is the second half of the same sentence —
*"que no esté roto donde se menciona"*. A frontmatter block that does not parse **is** broken,
and unlike `name` against a directory there is no reading in which it is fine: whatever the
block declares is not what a reader gets. The case it earns its keep on is a duplicate key,
where YAML drops one of the two values and nothing tells the author.

### What was considered and rejected

Turning the parse failure into a **skipped source** instead of a finding. It does not fit: a
skip means the file could not be read, and here the file reads fine — only its frontmatter
does not parse, and the body is still audited for every path it names. Skipping the source
would throw away real `path/missing` findings to avoid reporting one YAML error.

### The counts

None move. 66 · 341 · 32, calibration 20 · validation 12, one fixable and it is true.

## Twenty-ninth round, 2026-09-21: a rule the certification corpus never saw

The first rule this project has derived **entirely** from the discovery corpus, which is what
the two-corpus split in [`spec.md`](../../.scratch/corpus-adjudication-at-scale/spec.md)
§ "Two corpora, not one" was built to make possible. Nothing here was tuned against a
certification repository, no repository is burnt, condition 9 does not fire, and the
certification corpus is **unchanged: 66 · 341 · 32, calibration 20 · validation 12**.

### What was found

A frequency scan over the 32 209 `path/missing` findings of 2533 repositories, asking which
first segments appear constantly and resolve nowhere. `@` is the largest class by both
measures that matter: **128 distinct texts in 69 repositories**, and one repository in 2599
has a top-level entry beginning with one.

Two shapes, and they are the same thing:

| shape | example | what it is |
|---|---|---|
| npm scope | `@n8n/typeorm/`, `@rails/request.js` | a package, resolved by a package manager |
| path alias | `@/engine/`, `@/components/ui/`, `@/api/` | a `tsconfig` `paths` or Vite `resolve.alias` entry onto `src/` |

Both are names a resolver turns into a location, which is exactly what `isSpecifier` already
covered for `#lib/…` and `npm:`. It gains a third clause rather than a new rule.

### What it moved

| | |
|---|---|
| certification | **unchanged** |
| discovery | 33 248 → 32 988, **−260 findings, 0 added** |

All 129 distinct removed texts begin with `@`; nothing collateral. 132 were scoped packages,
123 were aliases.

### The cost, measured and written into the rule

Three candidates in 17 607 beginning with `@` resolve to anything.

And the one worth knowing: **Claude Code's `@./file` import is a path claim wearing a sigil.**
`@../AGENTS.md` means read that file and a missing one is drift, and this rule cannot see it.
The honest count is **5 candidates in 1 352 382 discards**, none of which resolves even with
the `@` stripped — and all five sit in `willhama/md-file-study` and `modem-dev/ossrules`,
which serve other projects' files, or say `@../other-project/file.js` in as many words.
Narrowing the rule to strip the sigil is a code path for five strings, so the cost is written
into `discard.ts` and pinned by a test instead. If that syntax becomes common, that comment
is where to start.


## Thirtieth round, 2026-09-21: three conditions withdrawn, and none of them was measuring

No finding moved and no snapshot changed. What changed is the table above.

[ADR-0015](../../docs/adr/0015-the-tail-conditions-are-two-tautologies-and-one-impossibility.md)
withdraws conditions 3, 4 and 5. Two of them had stopped being conditions the day
[ADR-0009](../../docs/adr/0009-precision-is-counted-in-quiet-repos.md) rewrote condition 6,
and nobody checked:

- **3, median false positives per repo = 0.** If 90% of repositories have zero, more than half
  do, so the median is zero. It cannot fail while 6 holds.
- **4, 90th percentile ≤ 1.** The 90th percentile of a distribution with 90% zeroes is zero.
  Same.

Both have been reported **met** at every round since, which is the tell: a condition that has
never failed deserves the question *could it have?*

- **5, no repo above 2.** The only one of the three that added anything, and the one ticket
  `35` broke against. `BuilderIO/agent-native` produces 244 findings; showing it is not above
  two means ruling on all 244, because a ceiling is only provable by exhaustion. It held here
  because `scripts/corpus/repos.ts` keeps the list short and picks new repositories small, for
  disk. That is a property of the corpus, not of the tool.

Three replacement denominators were measured before withdrawing it, and all three are worse —
per 100 sources gives `edgecrab` **200**, per finding reintroduces the defect ADR-0009 killed,
and "the first finding is true" scores 63% while duplicating condition 6. The numbers are in
the ADR.

**What is lost:** nothing now bounds how bad a single repository may get. That is accepted
because condition 2 — zero false positives among the fixable, with no rate modulating it — is
untouched, and it is the one that guards against damage rather than annoyance.

**What is unblocked:** a repository can now join the corpus by answering condition 6 alone —
*does it produce a false positive at all* — which is one ruling when it does. Ticket `35`'s
thirty repositories go from 306 readings to roughly sixteen.

**What has not changed:** condition 6 is still not met, at 58 of 66 = 87.9%. Withdrawing three
conditions moves it by nothing, which is the point of withdrawing them.

## Thirty-first round, 2026-09-21: the corpus stops being a sample of small repositories

Thirty repositories added, chosen **blind**. The selection was pre-registered in ticket `35`
before anything was looked at: even stride through `test/discovery/repos.txt`, whose order
cycles the twelve acquisition facets; no exclusion on findings, cleanliness or size; each
pinned to the sha its discovery clone sits on. All thirty are **calibration**, because round
twenty-nine's `@` rule was derived from a frequency over the discovery corpus they came from,
and condition 9 is about not having looked.

| | round 30 | round 31 |
|---|---|---|
| repositories | 66 | **96** |
| sources | 341 | **1901** |
| findings | 32 | **338** |
| ruled true | 22 | **32** |
| ruled false | 10 | **17** |
| unread | 0 | **289** |
| fixable | 1 | **6**, all true |
| condition 6, whole corpus | 58 of 66 = 87.9% | **81 of 96 = 84.4%** |
| condition 6, validation | 29 of 32 = 90.6% | **29 of 32 = 90.6%** — unchanged |

**Condition 6 moved further from its bar, and that is the honest direction.** The corpus was
built out of small repositories on purpose — `scripts/corpus/repos.ts` said so — and the rate
it produced was partly a statement about that choice. Nothing regressed in the code: the
thirty new repositories were audited by the same rules that audited the sixty-six.

### Why 289 findings are unread, and why the figure is still a measurement

[ADR-0015](../../docs/adr/0015-the-tail-conditions-are-two-tautologies-and-one-impossibility.md)
withdrew conditions 3, 4 and 5, so nothing now needs a count of false positives per
repository — only whether there is one. A repository is settled by its **first** false
positive, and `corpus-bookkeeping.test.ts` was taught to enforce exactly that, and only that:

- every finding still has a row;
- **no `fixable` finding may be `pending`**, because condition 2 admits none unread;
- **every repository is settled** — a `false`, or every one of its findings ruled.

That last guard is what keeps 81 of 96 a measurement rather than an upper bound. Checked
after the fact: the **7** repositories carrying a pending ruling all carry a false one too, so
they are known-dirty; and the **14** with findings and no false have every finding read. No
repository is counted clean on unread evidence.

### The eleven rulings

Nine settled a repository each, read in the order `pnpm discovery queue` proposed:

| repository | finding | ruling |
|---|---|---|
| `hecateq/hecateq-openagent` | `.github/instructions/` | false — another tool's layout |
| `eggjs/egg` | `src/global.d.ts` | false — no `src/` at the root of a `packages/` monorepo |
| `CamilleScholtz/swmpc` | `metadata/version/` | false — the real tree is `Store/ios/version/` |
| `MuLTiAcidi/claudeos` | `herokucdn.com/error-pages/no-such-app.html` | false — a host in a takeover table |
| `BuilderIO/agent-native` | `feat/` | false — a branch prefix |
| `TommyLike/KnowledgeBase` | `repo/CHANGELOG.md` | false — line 81: "if the repo is not cloned, `git clone --depth 1` first" |
| `imarshallwidjaja/data-etl-dagster` | `data-lake/blobs/` | false — a MinIO bucket |
| `bmad-labs/skills` | `.claude/commands/` | **true** — `.claude/` is there, `commands/` is not |
| `factory-level/no-one-left-behind` ×3 | frontmatter | **true** — eleven parse errors from unquoted `: ` inside a `description` |

And two more because a `fixable` finding may never be left unread. All three are the same
shape — a file that changed directory — and all three fixes point at a file that exists:

| repository | claim | `--fix` writes | ruling |
|---|---|---|---|
| `hecateq/hecateq-openagent` | `src/agents/builtin-agents/multimodal-looker.ts` | `src/agents/multimodal-looker.ts` | **true** |
| `BetterSEQTA/DesQTA` | `src/lib/utils/netUtil.ts` | `src/utils/netUtil.ts` | **true** |
| `BuilderIO/agent-native` ×3 | `packages/core/src/tools/fetch-tool.ts` | `packages/core/src/extensions/fetch-tool.ts` | **true** |

`BetterSEQTA/DesQTA` is the one repository whose two findings are both true: an off-by-one
relative link in a `.cursor` skill, and the `netUtil.ts` move.

### What Jev did and did not do

`pnpm discovery queue` ordered 301 `path/missing` findings into a reading order and proposed a
class for each. It was **wrong on two of nine**, and in the same way both times:
`repo/CHANGELOG.md` and `data-lake/blobs/` read as genuine because the evidence against them
is 58 lines above in one file and in a sibling document in the other — outside the two-line
window the question is asked over. The limit is not the model, it is how much document it is
given.

No answer of its is recorded above. Every ruling in this round is Angel's.

### Two bookkeeping defects this round exposed

Both were caught by the guards rather than by reading, which is the point of having them.

**`site-data.ts` keyed a finding by `file:line`** and dropped the column, with a comment saying
the one repository holding two findings on a line gave them the same ruling. Round thirty-one
made that false: `hecateq/hecateq-openagent` has a **false** and a **pending** on line 290,
the later one won the key, and the page reported the repository clean — 82 of 96 where the
rows say 81. It now keys by the full location.

**`rowsIn` did not know `pending`** and silently dropped 289 rows, which is how the first
regeneration claimed 91.7%.

## Thirty-second round, 2026-09-24: a host without a scheme

The first rule this project has derived from a **model's tabulation**, and the derivation is
worth stating because the model never decided anything.

Ticket `37` put `classify.ts`'s Choice — the question that scores 94% against these rulings —
to 1262 wild findings, two per repository, and counted where the named classes sit. The same
shape came back under three different names: `nextjs.org/docs/messages/` as `foreign-project`,
`teams.microsoft.com/l/message/` as `placeholder`, `claude.ai/code/` as `third-party-convention`.
A person read that, and from there the rule was derived and measured the ordinary way, with no
model in the loop.

`discard.ts` rule 1 has always discarded a text with a protocol. Prose drops the protocol half
the time, and `linkedin.com/in/` reached `path/missing` as a file this repository was missing.

Measured, all of it deterministic:

| | |
|---|---|
| in the wild | 33 findings, 21 repositories, 23 distinct texts, every one a host |
| directories really named like a host | **1** in 12 439 distinct first segments across 2599 repos |
| discarded candidates of this shape | 284, of which **0** resolve to anything |
| discovery | 32 988 to 32 955, **33 removed, none added** |
| certification | 338 to 337, one snapshot moved, `MuLTiAcidi/claudeos` |

The TLD list holds no file extension — `md`, `sh`, `py`, `rs`, `go` are out so that the rule is
never the thing deciding whether `docs.md/` is a directory — and `io`, `dev`, `app`, `ai` and
`co` are out too: real TLDs that are also ordinary directory names, and nothing measured
justified the risk.

**The match is case-sensitive, and the measurement is why.** Case-insensitively it matches two
of those 12 439 first segments and one is `GameOfLife3D.NET`, a .NET project. Lowercase-only
matches one: `my.sheerid.com/`, a scrape whose filenames still carry `%3Flocale=en-US`.

### The treadmill, on schedule

Removing the finding cost the repository that revealed it. `MuLTiAcidi/claudeos`'s
`herokucdn.com/error-pages/no-such-app.html` was its only ruled false positive, so with the
rule in place the repository had 26 unread findings and nothing settling it — which
`corpus-bookkeeping.test.ts` caught, as it is there to.

Angel settled it in one reading: `AAEAAAD/////`, at `agents/deserialization-hunter/CLAUDE.md:64`,
in a table of deserialization signatures beside `0x00 0x01 0x00 0x00 0x00 FF FF FF FF`. **A
binary signature, not a path.** New class, `binary-signature`, and it is the first class named
since round twenty-nine.

  findings 338 -> 337, true 32, false 17 -> 17, pending 289 -> 288

**Condition 6 does not move: 81 of 96 = 84.4%.** claudeos was dirty before the rule and is dirty
after it, for a different finding. Ticket `38` pre-registered that the condition could not be
used as an argument for the rule, and the rule turns out not to touch it — which is the
cleanest possible version of that separation.

Validation is untouched at 29 of 32 = 90.6%, and condition 9 is silent: nothing here looked at
a validation repository's discards.

## Thirty-third round, 2026-09-24: the class gets its definition, and nothing moves

No repository was re-read and no ruling changed. What changed is the document finding #23 rests
on.

`remix-run/react-router` `.agents/skills/react-router/SKILL.md:22` — `app/entry.server.tsx` —
has been `false`, class `readers-project`, since round eighteen. The reasoning cited
[ADR-0008](../../docs/adr/0008-a-specification-is-not-an-agent-context-file.md), and ADR-0008
did not quite say it: its line was **instructs versus argues**, and a skill react-router
publishes for its consumers does not argue. It instructs, about somebody else's repository —
a third case the ADR had not met.

ADR-0008 is amended rather than the ruling moved. Its premise was always the right one and is
one sentence above the dichotomy: *an agent context file makes assertions about the repo it
sits in.* A document instructing about another project breaks that premise while passing every
test the old wording proposed.

**Every number is unchanged**: 337 findings, 32 true, 17 false, 288 pending, condition 6 at 81
of 96 = 84.4%, validation at 29 of 32 = 90.6%.

That direction is what makes the amendment safe to accept. One that *improved* the percentage
would deserve the suspicion § "When a condition fails" step 4 reserves for it.

### What produced the amendment

Ticket `36` asked whether the distinction could be drawn mechanically, pre-registered its
threshold before looking, and came back negative twice — a model at **-31 points** against a
person, and eleven comparable pairs in which every deterministic axis appears on both sides.
The react-router document was that ticket's pre-registered control: Jev read it
`another-project` at 0.29, agreeing with the ADR, and Angel read it `this-repo`. The
disagreement is what this round settles, and it is settled by widening the ADR to what it
always meant.

The remedy for a user carrying somebody else's skill is `ignore`, which landed the same day.
It is not a discard rule and it could not be one: ticket `36` is the measurement that says
inference is unavailable here.
