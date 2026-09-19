# 11: The skills roots not yet read

**What to decide:** whether `.flue/`, `.codex/`, `.github/` and `.opencode/` join the three
roots discovery already reads, and in what order.

**Type:** task

**Blocked by:** `08` step 3 — the conditions are in suspense until round eighteen closes, and
adding roots while they are would stack two unadjudicated diffs

**Status:** open

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
