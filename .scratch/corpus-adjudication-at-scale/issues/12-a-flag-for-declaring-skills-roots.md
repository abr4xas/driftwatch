# 12: Let a repository say where its skills are

**What to decide:** whether driftwatch takes a configured list of skills roots, instead of
carrying somebody else's list of install targets.

**Type:** research

**Blocked by:** nothing, but it is worth doing after `11` has tried the hard-coded route far
enough to have a number

**Status:** open — deferred by agreement 2026-09-19, to be picked up once round eighteen and
`11` are closed

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
