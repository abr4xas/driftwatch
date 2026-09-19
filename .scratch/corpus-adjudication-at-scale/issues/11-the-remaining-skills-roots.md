# 11: The skills roots not yet read

**What to decide:** whether `.flue/`, `.codex/`, `.github/` and `.opencode/` join the three
roots discovery already reads, and in what order.

**Type:** task

**Blocked by:** `08` step 3 — the conditions are in suspense until round eighteen closes, and
adding roots while they are would stack two unadjudicated diffs

**Status: resolved 2026-09-19.** Two roots in, two out, and the ordering was the finding.
See §"Answer".

## What is left on the table

Round eighteen took `.claude`, `.agents` and `.cursor`. The corpus holds four more:

| root | `SKILL.md` in the corpus |
|---|---|
| `.flue/skills/` | 11 |
| `.codex/skills/` | 11 |
| `.github/skills/` | 7 |
| `.opencode/skills/` | 3 |

32 files, against the 116 the three current roots reach. And beyond the corpus the installer
offers around fifty-six targets in total — `.aider-desk/skills`, `.augment/skills`,
`.bob/skills`, `data/skills`, a bare `skills/` for OpenClaw.

## Why they were not taken together

Deliberate, and the reason is the cost model this directory keeps rediscovering: **each root
audits more files in every repository that has one**, which moves corpus snapshots and costs
hand review under ADR-0007. Three roots produced 48 findings to rule on. Taking seven would
have produced more, in one undifferentiated pile, and the classes would have been harder to
attribute.

So they go one at a time, or in small groups, each with its own diff.

## What makes this different from the first three

The first three were justified by volume — `.agents/` alone is 83 files. These four are 32
between them, so the case is weaker per root and the review cost per finding is the same.
There is a real chance the honest answer for some of them is "not worth the snapshots".

`.github/skills/` deserves separate thought: `.github/` is not an agent's directory, it is
GitHub's, and driftwatch already reads `.github/copilot-instructions.md` from it. Adding
`.github/skills/` is consistent, but the root means something different from the others.

## Where the general answer lives

Not here. A list of fifty-six roots maintained by hand is the shape `ADR-0011` argues against
— somebody else's vocabulary, falling behind by construction. Ticket `12` is the escape
hatch: let the repository say where its skills are, and stop guessing. This ticket is the
stopgap for the roots common enough to be worth hard-coding while that is decided.

## What to do

1. Wait for `08` step 3.
2. Take them in corpus-volume order, measuring the diff each time.
3. Stop when a root's diff is more review than its findings are worth, and record where that
   line fell — that number is more useful than the roots themselves.

## Answer

Resolved 2026-09-19. `.codex/`, `.opencode/` and — after ticket `18` landed — `.github/` are
read; `.flue/` is not. Adjudicated as rounds twenty-two and twenty-four of
`CLASSIFICATION.md`.

### The ticket's own ordering was wrong, and that is the useful part

Step 2 says to take them "in corpus-volume order", which the table at the top of this ticket
gives in files. Counted by **repositories** the order inverts almost exactly:

| root | files | repos in the corpus | repos, discovery † |
|---|---|---|---|
| `.github` | 7 | 3 | **13** |
| `.codex` | 11 | 1 | 6 |
| `.opencode` | 3 | 2 | 5 |
| `.flue` | **11** | **1** | **1** |

† The last column is over the discovery corpus, which is disposable and unsnapshotted: it is
a reading of the ecosystem taken once, not a figure anybody can re-derive from this repository.
It is used here to tell a convention from a project, which is a question about the population
and the one thing that corpus is for. The `.codex` cell also undercounts slightly — two more
repositories have a `.codex/skills/` directory holding no `SKILL.md`.

`.flue`'s eleven files are one project — `emdash-cms/emdash`, the same repository in the
certification corpus and the only one of 700 discovery repositories that uses it. **A file
count cannot tell a convention from a project**, and this ticket's premise was a file count.

That answers step 3: the line falls at `.flue`, and the reason is not review cost. Eleven
files was the largest number on the table and it was the weakest case on it.

### What each root cost

| root | sources | findings | verdict |
|---|---|---|---|
| `.codex` | +11, all `openai/codex` | 2 | both true, 1 fixable and correct |
| `.opencode` | +3, `sst/opencode` and `cloudflare/workers-sdk` | **0** | — |

`.opencode` is a free widening: three sources more and nothing to rule on. The two `.codex`
findings are in one file — a `name` that lost a word against its directory, and a 16-character
`description`. Both true; the fix is the class ticket `10` settled, and `pnpm corpus --fixes`
prints it correctly.

Corpus: **66 repos · 334 sources · 35 findings**, fixable 1 → 2, false unchanged at 11.
`openai/codex` is calibration, so nothing moved groups.

### `.github/skills/` is the one this ticket got most wrong

This ticket's §"What makes this different" worried that `.github/` "means something different
from the others". That is true and it is not why it is held out.

It is the **most widely used** of the four — 13 of 700 discovery repositories, more than
`.cursor/`, which already ships. Adding it produces 84 findings, and 80 come from one file:
`remix-run/react-router`'s `.github/skills/agentic-workflows/SKILL.md` lists forty paths under
`.github/aw/` and says, one line above the list, *"Load these files from `github/gh-aw` (they
are not available locally)"*.

**That is not a fact about the root.** The same file under `.agents/skills/` produces the same
80 findings today, so this is a live defect that widening happened to expose. Ticket `18` has
the three near-misses that let it through. The four true fixable findings `.github/` would
also bring — `securego/gosec`, title-cased names against kebab-case directories — are held
with it.

The general shape of the mistake is worth naming: **a root's cost is not a property of the
root.** Three of the four measurements here were about documents that happened to live under
it.

### `.github/` landed, once `18` did

Ticket `18` built the gate and the document that blocked this root now contributes **one source
and no findings** where it contributed eighty. `.github/skills/` was added in round twenty-four:
`github/spec-kit` +2 sources and nothing to rule on, `remix-run/react-router` +1 and nothing,
and `securego/gosec` +4 sources with **4 findings, all fixable and all true** — title-cased
`name` fields against kebab-case directories, the class ticket `10` settled.

`gosec` is a **validation** repo, which is what makes those four worth more than their count:
produced by a rule nobody tuned against them, on a repository nobody opened to tune it.

Corpus: **66 repos · 341 sources · 39 findings**, fixable 2 → 6 and none false.

### What is still open

`12`, the escape hatch, is unchanged by this and is still the general answer: six hard-coded
roots is better than three and it is not a design.
