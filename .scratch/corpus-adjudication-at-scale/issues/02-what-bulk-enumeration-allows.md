# 02: What do skills.sh and the GitHub API allow for bulk enumeration?

**What to find out:** whether a discovery corpus of 1000-2000 repos can be assembled at all,
and under whose terms.

**Type:** research

**Blocked by:** nothing — **unblocked 2026-09-18**, it used to wait on `01`

**Status:** open, **widened** from "what does the skills.sh index expose" to cover the
GitHub API, which is the larger half

## Why this got bigger and less speculative

The original ticket treated skills.sh as one candidate stratum of a 300-repo certification
corpus, and waited on `01` because there was no point sourcing repos for a design that might
not survive calibration. Neither condition holds now. The [spec](../spec.md) needs
1000-2000 repos for a corpus that measures nothing, the registry is at best a fraction of
that, and **cloning 2000 repos is a different conversation with an API than cloning 66**.

## The GitHub half

1. **What do the terms and the rate limits actually permit for bulk enumeration?** Code
   search caps at 1000 results per query at ~10 requests per minute, which is why the
   universe has to be assembled by facetting (`path:` × language × stars × date). That is a
   documented cap; what is not established is whether assembling a few thousand repos this
   way is within acceptable use, and whether it needs an authenticated token, an app, or
   something else. Find out **before**, not after.
2. **Is the search API the right instrument at all?** Alternatives worth pricing: GH Archive
   / BigQuery for repos whose event stream touched a `CLAUDE.md` or `.claude/` path, which
   sidesteps the search cap entirely and is a documented public dataset.
3. **What does a clone of 2000 repos look like from the other side?** `06` cuts the bytes by
   an order of magnitude, which also cuts whatever load this represents. Worth confirming
   the two tickets' answers are consistent.

## The skills.sh half

1. **Full index or paginated leaderboard?** The spec's §"How the two-corpus split changes
   this" argues the value is in the tail — few installs, no recent commits, skills that are
   an accessory to a product rather than the product. If the API only serves the ranked
   head, the registry supplies precisely the repos least likely to drift.
2. **Does it expose a commit, or only a repo URL?** This matters **much less than it used
   to**. Pinning exists so a certification snapshot does not change when upstream moves; the
   discovery corpus takes no snapshots and is disposable by design, so a URL is enough. Note
   the answer, but do not let it block anything.
3. **Terms of service for bulk use.** Pulling a whole index is not browsing. Same rule as
   the GitHub half.

## What to bring back

A note in this directory answering each, plus — if the index turns out to be fully
enumerable — the actual size of the tail: how many entries have few installs, and how many
of those live in repos where the skill is not the product.

## The bias that survives the split, and gets worse

Round eleven read 30 real skills and produced 0 findings, and the spec explains why more of
the same kind will produce 0 too. Under the two-corpus split that is no longer a threat to a
measurement — but the **template** problem sharpens: a thousand near-identical `SKILL.md`
files are one observation with a thousand members, and mining a rule shape is an operation
on the *diversity* of instances. Deduplication by template family stops being hygiene and
becomes the thing that decides whether jobs 1 and 3 work at all.

So when reporting the size of the tail, report an estimate of how many distinct template
families it contains. That number matters more than the count.
