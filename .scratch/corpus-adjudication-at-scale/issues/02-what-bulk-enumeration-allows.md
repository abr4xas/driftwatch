# 02: What do skills.sh and the GitHub API allow for bulk enumeration?

**What to find out:** whether a discovery corpus of 1000-2000 repos can be assembled at all,
and under whose terms.

**Type:** research

**Blocked by:** nothing — **unblocked 2026-09-18**, it used to wait on `01`

**Status: resolved 2026-09-18.** Both halves answered, the GitHub half by measurement. See
§"Answer".

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

## Answer

Answered 2026-09-18. The GitHub half was **measured** with an authenticated token rather
than read off the documentation; the skills.sh half is read from its API reference, because
the endpoint that matters refuses anonymous requests.

**Short version: yes, and GitHub alone is enough.** Assembling 2000 repositories costs about
ten minutes of rate limit. skills.sh turns out to be the blocked one.

### The GitHub half

**1. The plan's query syntax does not work.** The spec says to facet by `path:` × language ×
stars × date. `path:` is the *website's* search syntax; the REST API implements the older
one, and the two disagree silently rather than erroring:

| Query | `total_count` |
|---|---|
| `path:CLAUDE.md` | 99 |
| `filename:CLAUDE.md` | **833,536** |
| `path:.claude/skills/ path:SKILL.md` | 1,320,960 |
| `filename:SKILL.md` | **6,160,384** |

The 99 is the dangerous one: a plausible-looking number that is wrong by four orders of
magnitude, returned with a 200. Anyone building the acquisition from the spec's text would
have concluded the population does not exist.

**2. The 1000-result cap is not the constraint.** Measured, not estimated — one query
exhausted to its cap:

- `filename:CLAUDE.md`, 10 pages × 100 results = 1000 files, 10 requests, ~1 minute at the
  documented 10 requests/minute.
- Those 1000 files are **784 unique repositories**.

So a facet yields ~780 repos per minute of rate limit. **2000 repositories is three to six
facets, five to ten minutes.** The acquisition is not where the difficulty lives.

**3. Facetting works, and `size:` gives disjoint sets for free.** Ranges cannot overlap by
construction, and each one is still far above the cap:

| Facet | `total_count` |
|---|---|
| `filename:CLAUDE.md size:<1000` | 130,048 |
| `filename:CLAUDE.md size:1000..3000` | 183,808 |
| `filename:CLAUDE.md size:3000..10000` | 342,528 |
| `filename:CLAUDE.md size:>10000` | 161,280 |

Four facets, ~3100 unique repos, and each is subdividable further. `size:` also stratifies on
something the corpus cares about: document length correlates with how much a context file
claims.

**4. Code search requires authentication** — confirmed by a 401 on an anonymous request —
at **10 requests/minute**, against 30/minute for every other search endpoint. A personal
token is enough; no app or special access is involved.

**5. The terms permit it, with one condition that is worth naming.** GitHub's acceptable use
policies draw the line at the API rather than at automation: *"Scraping does not refer to the
collection of information through our API."* And there is an explicit research clause:

> Researchers may use public, non-personal information for research purposes, only if any
> publications resulting from that research are open access.

That is satisfied here and it is worth stating **because it is a condition, not a
permission**: the discovery corpus exists to produce rules and findings recorded in
`CLASSIFICATION.md` and the ADRs, which are public in this repository. A future version of
this work that produced a private result would be outside the clause it is relying on.

**6. GH Archive does not answer this question**, and the ticket's suggestion to price it can
be closed. Its `PushEvent` payload carries commits — sha, message, author — and **not file
paths**, so "which repos contain a `CLAUDE.md`" is not expressible. The BigQuery
`github_repos` dataset does carry a `files` table with paths, but it is a licensed-repo
snapshot from 2016-2017, which predates every file type this corpus is about. The code search
API is the instrument.

**7. One operational detail the ticket did not anticipate.** The corpus's own repositories
come back in these results — `1amageek/SwiftAgent` appeared in the first 1000 — so the
acquisition has to subtract `scripts/corpus/repos.ts` from whatever it collects. A discovery
corpus that quietly contains validation repos is the contamination the two-corpus split
exists to prevent.

### The skills.sh half

**Measured 2026-09-18** with a project OIDC token, after the first write-up had to stop at
the 401. Everything below is from the live index rather than from the API reference.

**1. The API is real and the whole index comes out in 20 calls.** `/api/v1/skills`, `page`
+ `per_page` up to 500, `view=all-time`. Enumerating everything took 20 requests against a
600/minute limit.

**2. The index is 9,827 skills — and only 1,203 source repositories.** The spec's "at least
282 entries" was low by a factor of 35, and the repo count is the number that matters:

| | |
|---|---|
| Skills in the index | 9,827 |
| Unique source repos | **1,203** |
| Of those, `sourceType: github` | 9,085 skills / **742 are `well-known`**, with no repo |
| Repos contributing exactly one skill | **658** |
| Skills in the top 8 repos | 1,659 (17% of the index, from 0.7% of the repos) |

So **skills.sh supplies at most ~1,200 repositories**, and the "skill is an accessory rather
than the product" stratum the spec wants is the 658 singles. Set against a single GitHub code
search facet yielding 784 unique repos per minute, the registry is **not a source of scale**.
It is a source of a particular *kind* of repo, and a small one.

**3. `isDuplicate` is present in the schema and set on nothing.** Zero of 9,827. The ticket
hoped it would attack the template problem; it is empty, so the deduplication the spec calls
decisive has no help from the registry and stays ours to do.

**4. The tail is not where the spec assumed.** Median installs is 2,900 and the minimum is 7,
but only **167 entries (1.7%) are under 1,000 installs**. "Few installs" barely partitions
this population. And with no timestamp in the schema, "no recent commits" needs a GitHub call
per repo. The tail has to be defined structurally — one skill, in a repo that is not a skills
repo — rather than by the two signals the spec named.

### The finding that outranks the ticket: driftwatch does not look where skills live

The detail endpoint returns each `SKILL.md`'s full text, so 249 real skills were pulled,
244 materialised into `.claude/skills/<slug>/SKILL.md` in a scratch repo, and
`skill/frontmatter` **actually run** over them. Three findings came out — and all three are
artefacts of that materialisation, not of the skills:

- `microsoft/azure-skills`: frontmatter `name: finetuning`, but skills.sh's slug is
  `microsoft-foundry`, so the directory was named from the slug and the mismatch is ours.
- `nozomio-labs/nia-skill`: its `SKILL.md` is at the **repo root**.
- `hamen/material-3-skill`: the `user-invokable` unknown key is genuine, but the file lives
  at `skills/material-3/SKILL.md`.

Chasing why led to the real result. Across **70 sampled publisher repos**, where does a
`SKILL.md` actually live?

| Location | Repos | |
|---|---|---|
| somewhere else (`skill/`, nested plugins, …) | 31 | 44.3% |
| `skills/` at the repo root | 27 | 38.6% |
| repo root | 8 | 11.4% |
| **`.claude/skills/`** | **4** | **5.7%** |

`classifySource` requires the `.claude` + `skills` pair, so **driftwatch does not classify
the overwhelming majority of published skills as skills at all.** They are never audited, by
any check.

**Corrected in `08`:** a larger and registry-independent sample — 780 repos from code
search, 771 of them not in this index — puts the visible share at **11.4%, not 5.7%**. This
sample was per-publisher over a registry and biased low. The direction holds; the magnitude
did not.

This changes the spec's explanation of the silence. §"what it quietly does not solve" says
`skill/frontmatter` is mute because published skills are well formed. That is *also* true —
244 correctly-placed real skills produced **zero** genuine findings, which is round eleven's
result at eight times the mass. But it is the second reason, not the first. The first is that
the check almost never runs.

Both hold at once, and together they are stronger than either: adding skills.sh mass cannot
wake this check, for two independent reasons.

**What this does not settle** is whether `classifySource` should widen. `skills/` at the root
is `npx skills`'s convention, not Claude Code's, and matching any `skills/` directory in any
repository is exactly the shape of rule this project refuses without evidence — `docs/` was
rejected for the same reason in ADR-0008. It is a decision with a false-positive cost, so it
belongs in a ticket of its own rather than at the end of this one.

### What this changes### What this changes

- The spec's §"Stage 1 — acquisition" and §"Acquisition: the GitHub API, filtered" both
  describe facetting by `path:`. Corrected to `filename:` in the spec, with the measured
  numbers.
- `04` is unblocked and half-answered. It wanted the difference between code search and the
  registry; code search works and is cheap, and the registry side is now enumerated — 1,203
  repos, 658 of them singles. What `04` has to reckon with is the layout finding: the
  unpublished-skill population it is after is defined by `.claude/skills/`, which is where
  only 5.7% of the *published* ones are.
- A new ticket is owed for the layout question. Whether `classifySource` widens beyond
  `.claude/skills/` is a product decision with a false-positive cost, and it is now the
  single largest known gap in what driftwatch audits.
- Nothing here needs `01` or `05`.
