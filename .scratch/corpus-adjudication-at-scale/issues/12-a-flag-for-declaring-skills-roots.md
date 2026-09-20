# 12: Let a repository say where its skills are

**What to decide:** whether driftwatch takes a configured list of skills roots, instead of
carrying somebody else's list of install targets.

**Type:** research

**Blocked by:** nothing, but it is worth doing after `11` has tried the hard-coded route far
enough to have a number

**Status: resolved 2026-09-19.** `skillRoots`, a list of **containers**, additive. See
§"Answer".

## The problem it solves

`npx skills add` offers around **fifty-six** install targets. Discovery reads three. Ticket
`11` proposes taking four more, and even then the list is a snapshot of one installer's menu
on one day.

This is precisely the shape [ADR-0011](../../../docs/adr/0011-an-unknown-key-is-only-reported-as-a-near-miss.md)
argues a tool should not hold: somebody else's vocabulary, maintained by hand, falling behind
by construction. `foreign-tools.ts` gets away with its list because falling behind there is
**free** — a root it has never heard of simply keeps producing findings. Here falling behind
is the opposite: a root we have never heard of is a repository we audit **nothing** in, and
it fails silently, with a green run that means nothing. That is the failure `abr4xas/skills`
hit and had to write a config and a bash validator to work around.

## The shape

Something like `skillRoots` in the config, next to `sources`. The repository knows where its
skills are; it does not need us to guess.

Open questions that decide whether it is worth it:

- **Does it replace the built-in list or add to it?** Replacing makes a typo silence the
  whole check. Adding keeps the default useful and makes the config purely additive, which is
  how `sources` already behaves.
- **Is it a config key or a flag?** `--config` already exists and a repo's skills roots are a
  property of the repo, not of the invocation, which argues for the key. A flag is for the
  one-off run.
- **What does it do for a repo that has no config?** Most repos. The default list still has
  to be good, so this does not remove `11` — it caps how long that list has to keep growing.
- **Does `sources` already almost do this?** `abr4xas/skills` declares `sources: ['**/*.md']`
  and gets `path/missing`, `link/broken` and `frontmatter/invalid` over its skills. What it
  cannot get is `skill/frontmatter`, because a `configured` source is not classified as a
  skill. **The cheapest version of this ticket may be to let a configured source carry a
  kind**, rather than to add a second mechanism beside `sources`.

That last point is worth settling first: it might make this ticket a five-line change to
something that already exists.

## What is not in question

The built-in roots stay. This is about the tail, not about replacing the default with
configuration nobody writes.

## Answer

Resolved 2026-09-19. **`skillRoots` in the config: a list of directories whose children are
skill directories, added to the built-in ones.**

### The shape came from a measurement, and it is not the one this ticket proposed

§"The shape" says "something like `skillRoots`, next to `sources`", implicitly a list of roots
like `.flue` — the same thing the built-in list holds, just configurable. The discovery corpus
refused that:

| | |
|---|---|
| `SKILL.md` in 700 repositories | 2793 |
| under one of the six built-in roots | 1103 |
| **outside** | **1690** |
| repositories whose skills driftwatch sees **none** of | **76** |

And the tail's shape is what decides the design:

| container | files | repositories |
|---|---|---|
| **`skills`**, bare, in the repository root | 688 | **74** |
| `skill` | 252 | 4 |
| everything else | scattered | 1 each |

`indexOfPair` looks for the pair `<root>/skills`. A bare `skills/` has **no root above it**, so
seventy-four of the hundred-and-six repositories in the tail cannot be expressed by a root at
all. The unit had to be the container, and the built-ins are now expressed as containers too —
`SKILL_CONTAINERS` — so there is one rule rather than two.

### Additive, and the reason is the failure mode

A replacing list would let one misspelling silence the check across a repository. Silence is
precisely what this key exists to fix: an install root nobody has heard of is a repository
audited to a **green run that means nothing**, which is what `abr4xas/skills` hit and worked
around with a config and a bash validator.

So a typo costs the entry and nothing else, which is how `sources` already behaves. There is a
test that says so.

### The last question, settled first as the ticket asked

§"Does `sources` already almost do this?" proposed letting a configured source carry a kind,
and guessed it might be a five-line change. It would work, and it was not taken: it changes the
**type** of an existing key from `string[]` to `(string | { path, kind })[]`, which is more
public surface and a migration, for a generality nothing measured is asking for. `skillRoots`
is one new key with one type.

### What it does not do, and the ticket already knew

The 76 repositories stay invisible. None of them will write a config. This is for the tail of
people who know where their skills are and are willing to say so — §"What is not in question"
says exactly that, and it is worth repeating because the measurement above makes the gap look
like something this key closes. It does not.

### What was rejected on the way

**Classifying a `SKILL.md` by its content instead of its location** — ticket `08`'s
§"The middle, and probably the answer", which proposed gating on frontmatter carrying `name`
and `description`. Measured over the 1690 outsiders: 1043 have no such frontmatter and would
each produce a finding, and of the 647 that do, **165 would report `name` ≠ directory across 25
repositories** — namespaced names like `klayoutclaw:e2e-judge` in `e2e_judge/`, and templates
under `templates/ts-skill/`. Noise in 25 repositories to reach 76. The location list stays.

### The bill

None. The corpus is unchanged at 66 repos · 341 sources · 37 findings: no corpus repository
declares the key, which is the whole point of an additive default.
