# 04: Where do unpublished-skill repos come from?

**What to find out:** how to source repos carrying `.claude/skills/` that were never
published to any registry — the only population where `skill/frontmatter` can plausibly fire.

**Type:** research

**Blocked by:** nothing

**Status:** open — substantively unchanged by the 2026-09-18 revision, but see
§"Which corpus this feeds, and the trap in the answer"

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

## Which corpus this feeds, and the trap in the answer

This ticket sits across the two-corpus split in a way the others do not, and the seam is
worth naming because it is the one place where material can cross from discovery into
certification.

Discovery can find these repos; discovery cannot wake the check. A `skill/frontmatter`
finding only counts once a person has ruled on it against the real repository, and that
only happens in the certification corpus. So the natural move is: **search at discovery
scale, then promote the interesting repos into `test/corpus/` and review them by hand.**
That is a good use of the discovery corpus and is probably the right answer.

The trap is the word "interesting". If repos are promoted **because the tool already fires
on them**, the certification corpus stops being a sample of repositories and becomes a
sample of repositories where driftwatch finds something. ADR-0006's conditions 3 through 6
all count *repos with zero false positives* as a proportion — and that proportion is
meaningless over a population selected for producing findings.

The distinction that keeps it honest:

- **Selecting on a property of the repo** — it has `.claude/skills/`, the skill directory
  was renamed at some point, the skill is an accessory rather than the product — is
  stratification, which the corpus already does openly and which ADR-0006 tolerates.
- **Selecting on the tool's output** — this repo produces a finding — is not. It is
  choosing the exam questions after seeing the answers.

`git log --follow` on a skill directory, suggested below, is on the right side of that line:
a rename is a fact about the repository's history, visible without running driftwatch at
all. Whatever selection rule this ticket lands on should be checkable against that test, and
should be written down in the corpus README rather than left implicit — the corpus already
documents its strata, and this would be a new one with an unusual provenance.

## The honest outcome to be prepared for

It is entirely possible that this population also produces zero, and that the correct
conclusion is the one [`docs/spec/ROADMAP.md`](../../../docs/spec/ROADMAP.md) already
provides for: accept that the check does not get there, and say so. A check that has been
measured against 200 real skills and found nothing is in a completely different position
from one that has never been measured — that is worth the work even if the number stays at
zero. What is not acceptable is 40 more leaderboard repos and a zero that looks like
evidence.
