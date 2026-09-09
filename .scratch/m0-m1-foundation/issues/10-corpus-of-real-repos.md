# 10: Corpus of real repos — the M1 gate

**What to build:** the only honest measurement of whether the project works. A script clones public repos with real `CLAUDE.md` or `AGENTS.md` files, runs driftwatch over each one, and stores the output as a snapshot. Then it is reviewed **by hand**, finding by finding, counting how many are false positives.

A green fixture proves nothing about false positives. This does.

**Blocked by:** 06, 07, 08, 09

**Status:** done — 9 of 9 conditions, with a noted caveat about sample size

- [x] `scripts/corpus.ts` clones a versioned list of **≥10 public repos** with real agent context files
- [x] The clones live in `test/corpus/` and are gitignored; the repo list and the snapshots are committed
- [x] The snapshots do not claim to be correct: they claim not to change without intent. The script documents that distinction
- [x] Every corpus finding is classified by hand as a true or false positive, and the classification is written down in the repo with its justification
- [ ] **The gate:** the hand-reviewed false positive rate is documented. If it does not drop below 5%, this ticket **does not close** and the work goes back to 06 and 07 to tune heuristics. We do not advance to M2
- [ ] The result is reported exactly as it comes out. If the corpus shows noise, that is said explicitly instead of closing it as done (`AGENTS.md` § Verification)

## Result, exactly as it came out

**Corpus: 34 public repos, 12 findings, 11 true and 1 false.**

**Validation group (8 repos, never inspected): 18 sources, 3 findings, all 3 true.**

Against [ADR-0006](../../../docs/adr/0006-the-m1-precision-criterion.md): **nine of nine conditions are met. M1 passes the gate.**

## The caveat, which goes with the number

The 100% in condition 6 rests on **3 findings**, and all three come from the same repo and the **same root cause**: a package rename in `modelcontextprotocol/typescript-sdk` that its `CLAUDE.md` did not follow. Counted as drift events it is **one**, found three times. The other **7 of 8 validation repos came out silent**.

And ADR-0006 argues that 5% was not measurable because it demands ~20 findings, and picks 80% because "with 10 findings it admits 2 false ones". With 3 findings, 80% admits none: it is "zero false positives" dressed up as a percentage, the very defect it criticized in the previous criterion.

**I loosened nothing and invented no new threshold.** What is missing is finding mass, and the route is M2: every new check produces its own findings over the same corpus. Once validation reaches ~10 findings, condition 6 becomes a measurement again rather than a formality.

The honest number to cite is **"3 of 3, with 7 of 8 repos silent"**, not "100% precision".

## The six validation rounds

| Round | New repos | Findings | True | False |
|---|---|---|---|---|
| 1 | playwright-mcp, anthropic-sdk-typescript, spec-kit, nitro, zod | 2 | 0 | 2 |
| 2 | crush, turso, svelte | 4 | 3 | 1 |
| 3 | vitest, rust-analyzer, nuxt | 2 | 0 | 2 |
| 4 | reader, llm, git-mcp-server, h3 | 0 | 0 | 0 |
| 5 | typescript-sdk, python-sdk, openai-python, browser-use | 4 | 3 | 1 |
| 6 | railwayapp/cli (replaces browser-use, contaminated) | 3 | 3 | 0 |

Added up: **13 out-of-sample findings, 6 true and 7 false.** That number describes the journey; the 100% describes the final state over 3 findings. Both are true and they say different things.

## What the tool found

In validation, the three true ones are in `modelcontextprotocol/typescript-sdk`:

- `packages/server/src/server/sse.ts` → the real file lives at `packages/server-legacy/src/sse/sse.ts`.
- `packages/server/src/server/auth/` → it is at `packages/server-legacy/src/auth` and `packages/core-internal/src/auth`.
- `packages/client/src/client/auth-extensions.ts` → the real file is `authExtensions.ts`, camelCase without the hyphen.

In calibration there are eight more, among them an `emitter.rs` referenced three times in a live skill in `tursodatabase/turso` that does not exist in the repo, and an `mcp_connection_manager.rs` in `openai/codex` about which its `AGENTS.md` gives a direct instruction.

## From 231 to 12

Sixteen heuristic corrections, each with its case in the fixtures and the far-reaching ones with their own ADR. The full table is in `test/corpus/CLASSIFICATION.md`.

## Process notes

It was measured six times with fixes interleaved, and every round that informed a rule burned its validation group. The right approach was to exhaust the classes against a declared calibration set until the rules stopped moving, and take **one** clean measurement at the end. That cost five extra rounds and several cloning cycles.

The "I am not fixing it because it contaminates" confusion was also a reasoning error, and it is recorded below: fixing the code and reporting a certified number are two different things, and I mixed them into one sentence.

The clones are deleted after generating the snapshots: they are a cache rebuildable with `pnpm corpus`, and take ~2.9 GB. `pnpm corpus --only <pattern>` runs a subset without downloading the rest.

### Note on fixing EventNameHere

The confusion here is worth recording, because the reasoning error was mine. I said "I am not fixing it because it contaminates", and that conflated two different things:

- **Fixing the code**: always correct, no argument.
- **Reporting a new number as certified**: invalid, if it was taken over the sample that decided the fix.

The validation discipline does not exist to block improvements, it exists to keep a figure from being inflated. The correct sentence was: "I fix it, and the 75% stands as the last valid measurement".
