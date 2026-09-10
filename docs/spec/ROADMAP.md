# driftwatch — Roadmap

Every milestone has verifiable acceptance criteria. We do not move to the next one without closing them.

---

## M0 — Executable skeleton
**Goal:** `npx driftwatch` runs and does nothing useful, but it runs.

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

**All nine conditions are met.** Corpus 47 of 49 = 95.9%, validation 19 of 19 = 100%, maximum 1 false positive in any repo, zero autofixable. That sentence was also true on 2026-09-09 and did not survive fifteen more repositories, so what matters is what changed: the corpus went from 34 repos to 49 and the validation group from 8 to 19, and the conditions now rest on those rather than on three findings from a single root cause.

An eighth round then fixed the last recorded defect: `emdash`'s drift was reported twice through a symlinked `.claude/CLAUDE.md`. Findings 16 to 15, with no detection lost — those 16 covered 15 distinct drift events and now 15 findings cover the same 15.

Two replacement validation repos are owed, for `course-video-manager` and `emdash`. Unlike the moves in round five both leave **clean**, fixed rather than removed, so no figure depends on their departure. `CLASSIFICATION.md` has all eight rounds, including the two where a fix regressed something and the corpus caught it.

This is the milestone that decides whether the project is worth it. Everything else is incremental.

---

## M2 — The other tier 1 checks
- `script/missing` resolving the nearest `package.json` (monorepo)
- `skill/frontmatter` complete
- `link/broken` including anchors
- `frontmatter/invalid`
- Inline ignore directives
- Config file + `--only` / `--skip` / `--no-tier2`

**Acceptance:** the `monorepo` fixture passes. All four checks have their own fixture with positive and negative cases.

---

## M3 — Autofix
- `fix/apply.ts` editing by offset ranges, preserving formatting
- `--fix`, `--fix --dry-run` with a diff
- Only applies on confidence > 0.8 and a single candidate

**Acceptance:** applying `--fix` to a broken fixture leaves it byte-for-byte identical to its correct version. Running `--fix` twice is idempotent.

---

## M4 — Presentable
What turns a tool that works into a project someone adopts.

- README with a ≤15 s GIF at the very top, before any text
- `--json`, `--github`, `--sarif` formats
- Published GitHub Action (`driftwatch/action@v1`)
- One-page static site with the demo and the GIF
- Published to npm with provenance (`npm publish --provenance`)
- MIT license (done: `LICENSE`)

**Acceptance:** someone who has never seen the project understands what it does in under 15 seconds, looking only at the README.

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

1. Publish to npm when **M2** closes — it is already useful.
2. Launch post with the GIF when **M4** closes.
3. Sustain commits over months, not a one-week sprint.
