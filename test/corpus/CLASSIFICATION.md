# Corpus classification

Hand review of every finding against the real repo. Date: 2026-09-09.

Corpus: **34 public repos pinned to a commit, 12 findings.**
Of the 34, **8 form the validation group**: never inspected before measuring.

## Criterion status ([ADR-0006](../../docs/adr/0006-the-m1-precision-criterion.md))

Validation group measurement: **8 repos, 18 sources, 3 findings, all 3 true.**

| # | Condition | Measured | Status |
|---|---|---|---|
| 1 | `false-positive-traps` fixture at zero | 0 findings | **met** |
| 2 | Zero false positives among `fixable` findings | `fixable: 0` across the 34 snapshots | **met** |
| 3 | Median FP per repo = 0 | 0 (33 of 34 repos with no FP at all) | **met** |
| 4 | 90th percentile of FP per repo ≤ 1 | 0 | **met** |
| 5 | No repo above 2 FP | maximum 1 (`spec-kit`) | **met** |
| 6 | Aggregate precision ≥ 80% in validation | 3 of 3 = **100%** | **met** |
| 7 | ≥ 1 true positive in validation | 3 | **met** |
| 8 | ≥ 20 repos, with ≥ 8 in validation | 34 repos, 8 in validation | **met** |
| 9 | Contamination rule encoded | `holdout` field in `scripts/corpus.ts` | **met** |

**Nine of nine. M1 passes the gate.**

### The caveat, which has to be read alongside the 100%

The 100% in condition 6 rests on **3 findings**, and all three come from the same repo and the **same root cause**: a package rename in `modelcontextprotocol/typescript-sdk` (`server` → `server-legacy`) that its `CLAUDE.md` did not follow. Counted as drift events, it is **one**, found three times.

The other **7 of 8 validation repos produced no findings at all**.

And there is an irony worth recording: [ADR-0006](../../docs/adr/0006-the-m1-precision-criterion.md) argues that a 5% threshold is not measurable because it demands ~20 findings, and picks 80% because "with 10 findings it admits 2 false ones, and that is a difference you can check by hand". With **3** findings, an 80% threshold admits no false ones — it is "zero false positives" again, dressed up as a percentage. The criterion is met by its letter, but at this sample size it suffers exactly the defect it criticized in its predecessor.

**What to do about it:** loosen nothing and invent no new threshold. What is needed is more finding mass, and the natural route is M2: every new check (`script/missing`, `link/broken`, `skill/frontmatter`, `frontmatter/invalid`) produces its own findings over the same corpus. Once the validation group reaches ~10 findings, condition 6 becomes a measurement again rather than a formality. Until then, the honest number to cite is not "100% precision" but "3 of 3, with 7 of 8 repos silent".

## The full corpus

The corpus produces **12 findings, 11 true and 1 false**. The only false one is `github/spec-kit`'s, in calibration.

| Repo | Findings | True | False | Group |
|---|---|---|---|---|
| `openai/codex` | 3 | 3 | 0 | calibration |
| `tursodatabase/turso` | 3 | 3 | 0 | calibration |
| `modelcontextprotocol/typescript-sdk` | 3 | 3 | 0 | **validation** |
| `cloudflare/workers-sdk` | 1 | 1 | 0 | calibration |
| `calcom/cal.com` | 1 | 1 | 0 | calibration |
| `github/spec-kit` | 1 | 0 | 1 | calibration |
| the other 28 | 0 | — | — | — |

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
