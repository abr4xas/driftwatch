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
acquisition has to subtract `scripts/corpus-repos.ts` from whatever it collects. A discovery
corpus that quietly contains validation repos is the contamination the two-corpus split
exists to prevent.

### The skills.sh half

**1. There is a real API and it is fully enumerable — `/api/v1/skills`**, paginated with
`page` and `per_page` up to 500, and a `view` parameter of `all-time` / `trending` / `hot`.
`all-time` with pagination is the whole index, not a ranked head, so the ticket's first
question comes back the good way: **the tail is reachable in principle**.

Sibling endpoints: `/api/v1/skills/search`, `/api/v1/skills/curated`,
`/api/v1/skills/{source}/{skill}`, `/api/v1/skills/audit/{source}/{skill}`.

**2. It is gated on a Vercel OIDC token**, which is the finding that matters. The endpoint
returns:

```
401 {"error":"authentication_required","message":"This endpoint requires authentication.
Pass a Vercel OIDC token (Authorization: Bearer <VERCEL_OIDC_TOKEN>)"}
```

Not an API key you request — the documented route is an app *deployed on Vercel*, whose
project OIDC token is exposed as `VERCEL_OIDC_TOKEN`. The rate limit is then 600
requests/minute per team and project, which at `per_page=500` enumerates any plausible index
in seconds. **Neither the size of the tail nor the number of template families could be
measured here**, and both were what the ticket asked for; they stay open behind that token.

This repository does deploy its site on Vercel, so the token is probably obtainable via
`vercel env pull`. Probably, not verified — it was not worth pulling credentials into the
working tree to find out, and nothing downstream is blocked on it.

**3. No commit sha, and — more importantly — no timestamp.** A listing entry carries `id`,
`slug`, `name`, `source` (`owner/repo`), `installs`, `sourceType`, `installUrl`, `url` and an
optional `isDuplicate`. The ticket said the missing sha no longer matters, and that holds.
The missing **timestamp** does matter and the ticket did not foresee it: the spec defines the
interesting tail as *"few installs, no recent commits"*, and only the first half is
expressible from this API. "No recent commits" needs a GitHub call per repo.

**4. `isDuplicate` exists**, flagging forks and copies. That is aimed at the template problem
this ticket calls decisive — but it is **their** heuristic answering **our** question, and
the spec's worry is families of near-identical skills generated from a shared template, not
forks. Useful as a first filter, not as the answer.

**5. A free result nobody asked for.** The detail endpoint returns `files` — relative paths
**and full text contents**. So `skill/frontmatter` can be measured over thousands of real
skills **without cloning anything at all**: the check reads only the frontmatter of the
`SKILL.md` it is given. That does not make the check less silent — round eleven and the
spec's §"what it quietly does not solve" explain why published skills are well formed — but
it makes the measurement nearly free, if the token appears.

### What this changes

- The spec's §"Stage 1 — acquisition" and §"Acquisition: the GitHub API, filtered" both
  describe facetting by `path:`. Corrected to `filename:` in the spec, with the measured
  numbers.
- `04` is unblocked in the sense that mattered: it wanted the difference between code search
  and the registry, and code search is now known to work and known to be cheap. The registry
  side of that subtraction is still behind the token.
- Nothing here needs `01` or `05`.
