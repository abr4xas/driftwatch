# 02: What does the skills.sh index actually expose?

**What to find out:** whether <https://www.skills.sh/> can supply a stratum of the corpus,
and under what terms.

**Type:** research

**Blocked by:** `01`

**Status:** open

The registry reports 1,441,658 installations and a leaderboard of at least 282 entries,
browsable by topic and by agent, with each entry linking to a GitHub repo and a documented
API. What it exposes *programmatically* is unverified.

## Three questions, in order of how much they matter

1. **Full index or paginated leaderboard?** The
   [spec](../spec.md) argues the value is in the tail — few installs, no recent commits,
   skills that are an accessory to a product rather than the product. If the API only
   serves the ranked head, the registry supplies precisely the repos least likely to drift
   and the ticket ends here.
2. **Does it expose a commit, or only a repo URL?** The corpus pins every repo to a `sha`
   ([`test/corpus/README.md`](../../../test/corpus/README.md)), because without it the
   snapshot changes when upstream moves and the diff stops meaning "driftwatch changed". If
   the registry gives a URL only, resolving a pin is per-repo work and the saving is smaller
   than it looks.
3. **What do the terms of service say about bulk use?** Pulling a whole index is not
   browsing. Find out before, not after.

## What to bring back

A note in this directory with the answer to each, and — if question 1 comes back "full
index" — the actual size of the tail: how many entries have few installs, and how many of
those live in repos where the skill is not the product.

## Why this is not urgent

Round eleven read 30 real skills and found nothing, with a 50-character margin on the only
rule that is an opinion. More skills of the same kind will find nothing either. This ticket
is worth doing only if `04` finds a way to reach the *other* kind, or if the index turns out
to expose the tail cleanly enough to sample it.
