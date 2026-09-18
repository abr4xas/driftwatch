# 04: Where do unpublished-skill repos come from?

**What to find out:** how to source repos carrying `.claude/skills/` that were never
published to any registry — the only population where `skill/frontmatter` can plausibly fire.

**Type:** research

**Blocked by:** nothing

**Status:** open

## Why this stratum and not the registry's

Round eleven of [`CLASSIFICATION.md`](../../../test/corpus/CLASSIFICATION.md) measured the
quiet rather than reporting the zero, and the table is the argument for this ticket:

| | |
|---|---|
| `skill` sources discovered | 31 |
| Blocks claimed by the check | 30 |
| `name` fields matching their directory | **30 of 30** |
| Shortest `description` | **70 characters**, against a floor of 20 |
| Non-required keys, all on the known list | 14, in 8 distinct names |
| Findings | **0** |

Four of the five rules are arithmetic over two strings. The fifth is the only opinion, and
it has a 50-character margin. A published skill is written to be installed, so its `name`
matches its directory by necessity. **The rule that fires is the one that catches a folder
renamed after the fact**, and that happens in a repo where the skill is incidental and
nobody reinstalls it.

Those repos are absent from a registry by definition, which is why `02` cannot replace this
ticket.

## What to try

GitHub code search for `path:.claude/skills/*/SKILL.md`, facetted to get under the
1000-result cap, filtered *against* the skills.sh index once `02` has it — the interesting
set is the difference between the two. Bias towards repos whose primary language is not
Markdown and whose last commit to the skill directory is old relative to the repo.

Worth checking whether the rename is even detectable from the outside: if a repo renamed a
skill directory, `git log --follow` on the clone shows it, and that is a way to find
instances directly rather than hoping to stumble on them.

## The honest outcome to be prepared for

It is entirely possible that this population also produces zero, and that the correct
conclusion is the one [`docs/spec/ROADMAP.md`](../../../docs/spec/ROADMAP.md) already
provides for: accept that the check does not get there, and say so. A check that has been
measured against 200 real skills and found nothing is in a completely different position
from one that has never been measured — that is worth the work even if the number stays at
zero. What is not acceptable is 40 more leaderboard repos and a zero that looks like
evidence.
