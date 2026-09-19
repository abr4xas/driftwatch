# 09: The acquisition runner

**What to build:** the thing that turns `02`'s answer and `06`'s clone into a discovery
corpus on disk.

**Type:** task

**Blocked by:** nothing — `02` and `06` are both resolved

**Status:** open

## Why this exists

`02` established that repositories can be enumerated — one facet of GitHub code search
yields ~780 unique repos per minute of rate limit, so 2000 is five to ten minutes. `06` built
the clone that fits them on a laptop: 2.8 MB per repo against 52.7, byte-identical
conclusions on all 66 corpus repos.

**Nobody wrote the part in between.** Until it exists, the discovery corpus is two solved
problems with nothing joining them, and `07` — the ticket with the highest ceiling in this
directory — cannot start.

## What it does

1. **Enumerate.** `filename:` facetted by `size:` ranges, which `02` measured as disjoint by
   construction and each far above the 1000-result cap. Not `path:` — that is the website's
   syntax and the API answers it with a plausible wrong number.
2. **Subtract the certification corpus.** `1amageek/SwiftAgent` came back in the first
   thousand results. A discovery corpus that quietly contains validation repos is the
   contamination the two-corpus split exists to prevent, so `scripts/corpus-repos.ts` is
   subtracted from whatever is collected.
3. **Clone**, through `sparseClone` from `discovery-clone.ts`.
4. **Run driftwatch with `--no-config`**, for the reason ticket `06` records: a repo's own
   config can declare `sources` outside the sparse cone, and — the deciding argument —
   honouring 2000 different configs means measuring 2000 different tools.
5. **Record what failed and carry on.** A repo whose config points outside the cone dies with
   `ENOENT`. That is the loud failure the seam was designed to have, and the runner's job is
   to write it down and move to the next one rather than stop.

## What it must not do

**Nothing it writes is a measurement.** No snapshots, no verdicts, no numbers that leave the
directory. The rule from §"The hard limit" of the [spec](../spec.md) applies to every line of
its output: no figure computed over the discovery corpus is a precision, and none of it is
reported.

It also does not touch `scripts/corpus.ts`. The certification corpus keeps its full shallow
clones and its pinned shas.

## Open questions inside the task

- **Where the repo list lives.** The certification corpus pins shas in a committed file
  because its snapshots must not move. A discovery corpus is disposable, so its list may be
  disposable too — but then a run is not reproducible, and a rule mined from a run nobody can
  reproduce is a rule with no provenance. Probably: commit the list, do not pin the shas.
- **How much disk to assume.** 2000 repos is ~5.4 GB measured. The runner should refuse to
  start rather than fill a laptop, and the threshold is a decision.
- **Rate limit handling.** 10 requests/minute is the documented code search limit and the
  measured one. Sleeping is fine; what matters is that a partial run is resumable.
