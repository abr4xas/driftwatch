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
- **Usefulness:** aggregate precision ≥ 80% out of sample, and ≥ 1 true positive in the validation group, so that silence is not enough to pass.
- **Methodology:** a corpus of ≥20 repos with ≥8 in a validation group that was not inspected. Classifying its findings is the measurement; opening the repo to see what it discarded contaminates it.

If it does not hold, we do not advance — we tune the heuristics, or we accept that the check does not get there and say so.

**Certified on 2026-09-09**: nine of nine conditions, over a corpus of 34 repos with 8 in validation. The record and the classification of every finding are in `test/corpus/CLASSIFICATION.md`.

**Re-measured on 2026-09-10, and condition 6 no longer holds.** Adding one repo to the validation group (`spatie/bloom`, Swift/macOS, 7 sources) produced a fourth validation finding, and it is false: aggregate precision went from 3 of 3 to **3 of 4 = 75%**, under the 80% bar. Nothing regressed in the code; the measurement stopped being thin, which is exactly what the original caveat said would decide it.

The corpus is now 36 repos with 10 in validation, 13 findings, 11 true and 2 false. **Eight of nine conditions.** The rule above applies to us as written — tune the heuristics, or accept that the check does not get there and say so — and the three routes, with their contamination cost under ADR-0006 condition 9, are set out at the end of `CLASSIFICATION.md`. It is not resolved yet.

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
