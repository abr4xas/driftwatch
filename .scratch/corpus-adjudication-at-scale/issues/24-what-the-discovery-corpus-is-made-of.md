# 24: What the discovery corpus is actually made of

**What to find out:** whether the 2533 repositories the acquisition runner clones are the
population the discard tables say they are, and how much of what they contain is about them.

**Type:** research

**Blocked by:** nothing; it reads clones `09` already produced

**Status: resolved 2026-09-20.** See §"Answer".

## Why ask at all

Every table in `07` and every count in `17` is computed over "the discovery corpus" as though
that named one thing. It names whatever `02`'s facets returned. Nothing has ever checked
whether those repositories are products that happen to carry skills, collections of somebody
else's skills, template clones, or dotfiles — and the four are not the same population to
measure a rule over.

The specific worry: `07`'s tables would be measured over a noisier corpus than stated if a
large share of it is clones and vendored copies, and the rules that look expensive would be
expensive against material nobody wrote.

## The shape

Two questions per document, asked together so they evaluate in one request:

- **`aboutThisRepo`**, a Noul — does this document describe the repository it sits in, or
  something else (a template, a fixture, a vendored copy, another project)?
- **`repoKind`**, a Choice over `skills-repo`, `product-with-skills`, `template-clone`,
  `fork-or-vendored`, `dotfiles`.

At most four documents per repository, shallowest first. `scripts/jev/filter.ts`.

## Answer

Resolved 2026-09-20. **5952 documents in 2464 repositories, 0 failures.** The corpus is
cleaner than feared in one respect and dirtier in another, and the interesting number is a
contrast rather than a total.

### It is not mostly clones

| class | repositories |
|---|---|
| `product-with-skills` | 1879 |
| `skills-repo` | 476 |
| `dotfiles` | 65 |
| `template-clone` | 36 |
| `fork-or-vendored` | 8 |

109 of 2464 — **4.4%** — are clones, forks or dotfiles. The worry in §"Why ask at all" was
misplaced: `07`'s tables are not measured over a pile of vendored copies.

### One document in five is not about the repository holding it

1130 of 5952, 19%. And where they sit is the finding:

| class | documents | not about their repository |
|---|---|---|
| `product-with-skills` | 4428 | 12% |
| `skills-repo` | 1206 | **39%** |
| `fork-or-vendored` | 24 | 33% |
| `dotfiles` | 201 | 26% |
| `template-clone` | 93 | 22% |

A repository **whose product is its skills** is three times more likely to hold documents
describing something else. In **165 repositories** no sampled document is about the repository
at all.

That is the same class ticket `07` found by hand one repository at a time, ticket `09` found as
a `SKILL.md` facet and ticket `14` argued about — templates, fixtures, generated trees — and it
is not a tail. It is the ordinary condition of a repository that exists to hold skills.

### Uncertainty is reported as uncertainty

| P(about this repo) | documents |
|---|---|
| 0.8–1.0 | 3422 (57%) |
| 0.6–0.8 | 999 (16%) |
| **0.4–0.6** | **746 (12%)** |
| 0.2–0.4 | 613 (10%) |
| 0.0–0.2 | 172 (2%) |

The 746 in the middle band are not "medium" — a Noul near 0.5 is the model saying it has
similar probability either way, which the [Noul guidance](https://docs.typesafe.ai/primitives/noul.md)
is explicit about. Spot-reading them, they are the cases a person would also have to stop and
think about: a `CLAUDE.md` in a monorepo package that describes the package and the repository
at once.

### What this does not license

Nothing here is a driftwatch measurement. No number above is a precision, none enters
`CLASSIFICATION.md`, and none moves a condition of ADR-0006 — the split in
[spec.md](../spec.md) § "Two corpora, not one" applies to this pass exactly as to the others.

Two limits of the measurement itself, worth stating before somebody quotes the percentages:

- The filter takes **at most four documents per repository, shallowest first**. Its
  per-document percentages are over 5952 documents biased towards the root, not over the
  191 936 the family pass sees.
- `repoKind` is a model's judgement with no ground truth behind it. Nobody has labelled the
  2464 repositories by hand, and the class counts are not validated the way ticket `01`
  validated grouping against the 66.

### What it is good for

Deciding **where to read**, which is all the discovery corpus is ever for. The 165 repositories
whose documents are all about something else, and the 476 `skills-repo` with their 39%, are the
population ticket `07`'s sampler should draw from when the next rule needs arguing about.
