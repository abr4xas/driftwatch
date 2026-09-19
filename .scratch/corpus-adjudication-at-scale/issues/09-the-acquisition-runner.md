# 09: The acquisition runner

**What to build:** the thing that turns `02`'s answer and `06`'s clone into a discovery
corpus on disk.

**Type:** task

**Blocked by:** nothing — `02` and `06` are both resolved

**Status: resolved 2026-09-19.** Built as `scripts/discovery.ts`, run end to end. See
§"Answer".

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

## Answer

Resolved 2026-09-19. `scripts/discovery.ts`, four subcommands — `enumerate`, `clone`, `run`,
`status` — each resumable on its own, because they fail for unrelated reasons. `pnpm
discovery`. The decidable parts are in `test/discovery.test.ts`, which touches neither the
network nor a disk.

### What it does, measured rather than projected

**Enumeration: 2486 repositories from 26 pages of code search**, a few minutes of rate limit.
The list lands in `test/discovery/repos.txt`, with the clones and the cursor, and is not
committed.

The facets turned out to overlap by almost nothing: every page of 100 hits contributed
between 77 and 100 repositories the list did not already have. `02`'s 784-unique-per-1000
figure was one facet exhausted over **ten pages**, where the repetition is *within* a facet —
the same repository holding several matching files. Across facets the `size:` bands are as
disjoint at the repository level as they are at the file level, so twelve facets × one page
is a better-spent twelve requests than one facet × ten.

**A clone and an audit of the first 135**: 655 sources, 3119 claims, 192 findings, **one
repository failed**, and cloning cost 1.74 MB per repository on average — median ~0.6 MB, one
at 11.6 MB.

The findings are 179 `path/missing`, **10 `skill/frontmatter`** and 3 `frontmatter/invalid`.
The `skill/frontmatter` column is the one worth noticing, because that check is mute across
all 66 certification repositories. Five of the 192 sit inside somebody else's **test
fixtures** — `gitmesh` carries deliberately malformed skills at
`lib/workspace-core/fixtures/risk/gm004-pinned-skills/input-repo/.agents/skills/` and several
like it — which is a candidate discard class visible at 135 repositories.

Whether it is one is `07`'s question. The rule that would come out of it gets written by hand
in `src/` and measured against the 66 repositories that carry human verdicts. **None of the
numbers in this section is a precision**, and they live here, in `.scratch/`, rather than in
the source file that produces them.

**The one failure is a product defect, and it is the best thing this run produced.**
`Rspoon3/Shotbot`'s `CLAUDE.md` is a symlink into an uninitialised git submodule: listed by
`git ls-files`, absent from the working tree, so the read raises `ENOENT` and driftwatch
answers *"internal failure … this is a driftwatch bug; report it"*. Nothing is broken in
driftwatch, and a plain `git clone` without `--recurse-submodules` reproduces it — this is
not the sparse cone. Ticket `13`.

**Disk: lighter than `06` projected**, and the budget ignores that. The measured mean is
1.74 MB against `06`'s 2.8, but the budget keeps 2.8 — the larger figure, taken over more
repositories. Budgeting from a sample of a skewed distribution would be the cheaper number
arrived at the worse way.

### The three open questions, decided

**Where the repo list lives — in `test/discovery/`, uncommitted, with no shas.**

The first answer to this was "committed, with no shas", and it was **wrong**, corrected the
same day on Angel's objection. The ticket frames the choice as provenance versus disposability
and that framing hides the actual option: the list is not the only record of where a
repository came from. **`FACETS` is.** Twelve lines of committed code, the enumeration is
deterministic given them, and "the repositories `filename:SKILL.md size:>10000` returns" is a
reproducible description. Committing the generated list bought nothing that the queries do
not already give, and cost a 2500-line artifact under review that changes by hundreds of
lines every time somebody raises `--target`.

What is lost is the exact membership on a given day. That is the same thing the
no-shas decision already gave up, for the same reason: nothing here is compared against a
stored result. A corpus that is disposable in every other respect does not get one file that
is not.

The header of the file still names **the queries that were actually spent**, not the twelve
facets, and that matters more now rather than less — it is the part a reader would quote. A
run that reached its target after one facet has searched one facet, and a header claiming all
twelve would attribute a repository to a search that never ran.

**Disk — a ratio, not a threshold.** Refuse when free space is under twice the expected
weight. A fixed number of gigabytes ages badly against a list whose length is an argument,
and the headroom is deliberate: half the population is above the mean, and a run that dies at
repo 1900 with a full disk has spent the whole rate-limit budget for a corpus nobody can use.

**Rate limit — read from the response, and `retry-after` wins.** Secondary rate limits are
not the primary one: GitHub answers them with `retry-after` while `x-ratelimit-remaining`
still looks healthy, so a client that only reads its own budget retries immediately and earns
a longer ban. Resumability is a cursor of spent `query#page` pairs in `test/discovery/`, so a
resumed enumeration buys nothing twice — disposable, like the clones, while the list it fills
is not.

### What a review caught that the first version got wrong

Two reviewers read this against the ticket and against `AGENTS.md`, and between them found
nine things. Six were defects and all six are fixed; the three worth recording here are the
ones that were wrong about *the design* rather than about the code.

**The module docstring was a measurement leaving the directory.** The first version pinned
"238 sources, 975 claims, 39 findings" into `scripts/discovery.ts` — a permanent source file
that states §"What it must not do" four lines earlier. A count of findings over the discovery
corpus, sitting in `src`-adjacent code, is the first step towards being quoted as one. The
numbers now live in this ticket, and what stays in the file is what the **runner** costs,
which is a fact about that code.

**A rate limit abandoned the page instead of waiting for it.** The loop slept and then
`continue`d to the next *facet*; since the outer loop visits each (facet, page) once, the
page was dropped for the whole run — under a comment that said "wait and come back to it".
The ticket asks for a partial run to be resumable and this was the one thing that was not.

**An exhausted facet was re-bought forever.** Nothing marked a facet done when its page came
back empty, so pages 2 through 10 of a short facet were re-queried on every run, out of the
budget this ticket calls the scarce one. Two separate comments asserted the stop existed.

### Two things the ticket got slightly wrong

**Point 5 overstates what survives.** The ticket has the runner surviving a repo whose config
points outside the cone and dies with `ENOENT`. Running with `--no-config` does not survive
that class, it **removes** it: with no config there are no `configured` sources, and every
other source driftwatch discovers is inside the cone by construction. The recording-and-
carrying-on is still there and still required — a repository can be many things 66 hand-read
ones were not — but the named case is gone rather than handled.

**`SKILL.md` and `AGENTS.md` are facets, and the ticket named neither.** `02` facetted
`CLAUDE.md` only, and this runner facets three filenames. `AGENTS.md` needs no defence —
`discover.ts` finds it by exact basename, so a repository holding one is a repository
driftwatch has something to say about, and leaving it out would have made the population
narrower than the tool. `SKILL.md` is the one that is an argument.
After `08` widened `classifySource` to three install roots, the population that decides
whether that was enough is the one where skills actually live, and a `SKILL.md` facet is the
only way to reach the layouts nobody in the certification corpus happens to use.

Not that it was needed for the six: all thirty audited repositories came from the
`filename:CLAUDE.md size:<1000` page, and the skills turned up in them anyway. That is an
argument *for* the facet rather than against it — the check is reachable even from the
facet least likely to find it — but the six are not evidence that the facet works, because
the facet has not been cloned yet.

### What it deliberately does not do

The [spec](../spec.md) §"Acquisition: the GitHub API, filtered" wants acquisition to carry a
filter: ADR-0008's "is this a context file about *this* repository", fork-or-vendored
detection, and — the one it calls most important — **template family**, so near-duplicates
collapse to one observation. None of that is here, and the ticket did not ask for it.

That is the right split and it is worth stating rather than leaving as an omission. The
filter is the part of the design where a model does the work, and it operates on *material
that has already been acquired*: a template family is a judgement over the documents, not
over the search results. Acquisition had to exist before anything could be filtered, and
conflating the two would have put a model inside the one stage that is pure deterministic
code. The filter belongs with the work that consumes the corpus — `07` and what follows it.

### What this unblocks

`07` — the discard rates — which needs a discovery corpus to exist and now has a list, a
clone and a per-repo result file to extend. `results.jsonl` is JSONL rather than a JSON array
for exactly that: a run over two thousand repositories is interrupted sooner or later, and a
half-written array is not readable while a half-written JSONL file is.
