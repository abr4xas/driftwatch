# 38: A host without a scheme is still not a location

**What to decide:** whether `linkedin.com/in/` and `nextjs.org/docs/messages/` should be
discarded, and at what cost.

**Type:** prototype

**Blocked by:** nothing. Ticket `37` is resolved and this is the pattern it surfaced.

**Status: resolved 2026-09-24.** Pre-registered, measured, and the rule ships. Condition 6 does not move. See §"Answer".

## Where this came from

Ticket `37` tabulated the named classes over the wild and the same shape showed up under three
different names:

```
foreign-project          nextjs.org/docs/messages/
placeholder              teams.microsoft.com/l/message/
third-party-convention   claude.ai/code/
```

A frequency scan over all 32 209 `path/missing` findings, no model involved: a first segment
that is a host with a TLD is **48 findings in 29 repositories, 38 distinct texts**.

In the certification corpus it is `MuLTiAcidi/claudeos`'s
`herokucdn.com/error-pages/no-such-app.html`, one of the fifteen repositories keeping
condition 6 at 84.4%.

## It is not a new rule

`discard.ts` rule 1 already discards a text with a protocol: `isUrl` matches `https://…` and
`//…`. What it does not match is the same URL with the scheme left off, which is how people
write hosts in prose half the time. So this is a clause on rule 1, the way `@` was a clause on
`isSpecifier` rather than a rule of its own — the extractor being told about a syntax it did
not know, not a heuristic about likelihood.

## The shape, written before it is measured

A first segment that is a **host**: one or more dot-separated labels ending in a TLD from a
fixed list, followed by `/`.

The TLD list is the whole risk and it is deliberately short. Excluded on purpose, before
seeing any number:

- **`.md`, `.sh`, `.py`, `.rs`, `.go`** and anything else that is a common file extension. A
  directory named `docs.md/` is implausible but the rule must not be the thing that decides
  that.
- **`.io`, `.dev`, `.app`, `.ai`, `.co`** in the first pass. They are real TLDs and also
  ordinary words people name directories after, and the cost measurement below is what decides
  whether they can be added, not intuition.

Starting list: `com`, `org`, `net`, `gov`, `edu`, `xyz`, `cloud`, `tech`, `info`, `biz`.

## The cost, measured twice, as the `@` rule measured it

[ADR-0006](../../../docs/adr/0006-the-m1-precision-criterion.md)'s rule orders this: one false
positive costs more than ten false negatives, so what has to be bounded is what the rule
**silences** that was real.

1. **A directory really named like a host.** How many repositories in the 2599 discovery clones
   have a tracked path whose first segment matches the shape, and how many of the matching
   candidates in `discards.jsonl` resolve to anything.
2. **A legitimate claim wearing the syntax.** The `@` rule found one — Claude Code's `@./file`
   import — counted it at 5 candidates in 1 352 382, and wrote the cost into the module rather
   than building a code path for five strings. This ticket must look for the equivalent and
   report it whether or not it is comfortable.

## The acceptance criterion, fixed before the numbers

The rule ships only if **all four** hold:

1. **All 38 distinct texts read by hand are hosts.** Not most. One that is a real relative path
   ends this ticket.
2. **The cost is of the order the `@` rule accepted** — three resolving candidates in 17 607.
   A materially worse ratio means the TLD list is too wide, and the answer is to narrow it, not
   to accept it.
3. **`pnpm discovery diff` adds nothing.** Every removed finding is read, and every one of them
   is a host. A single added finding is a bug in the rule.
4. **`pnpm corpus --check` moves no snapshot except `MuLTiAcidi/claudeos`'s**, and that one
   only by removing the host finding.

If any fails, the rule is not written and the measurement is recorded here. Two of the last
three scope experiments ended that way and that is the normal outcome, not a failure of the
ticket.

## What this is not allowed to be

Condition 6 sits at 84.4% and `claudeos` is one of the fifteen dirty repositories, so this rule
would move it. That is **not an argument for the rule** and must not appear as one:
`CLASSIFICATION.md` § "When a condition fails" step 3 — a rule may only be derived from
evidence independent of the condition, and if the only argument for it is that it restores a
bar, it is not an argument. The evidence here is 48 findings in 29 discovery repositories,
which is independent of the certification corpus by construction.

Condition 9 is silent: nothing in this ticket looks at a validation repository's discards.

## Answer

**The rule ships.** All four criteria hold, and the numbers are below in the order the ticket
fixed them.

### 1. The texts

23 distinct texts, read one by one, **every one a host**: `linkedin.com/in/`,
`airflow.apache.org/registry/`, `ctbk.s3.amazonaws.com/index.html`,
`developers.openai.com/codex/`, `www.spdrgoldshares.com/usa/historical-data-gldm/`,
`domain.com/locations/city-name/`. Not one is a relative path.

### 2. The cost

| | |
|---|---|
| discarded candidates of this shape | **284**, of which **0** resolve to anything |
| directories really named like a host | **1** in 12 439 distinct first segments across 2599 repositories |

The `@` clause shipped at three resolving in 17 607. The one directory is `my.sheerid.com/` in
`wujiaxuans/Atlas`, a scrape whose filenames still carry `%3Flocale=en-US`.

**The case-sensitivity is not fussiness and the measurement found it, not intuition.**
Case-insensitively the rule matches two of those 12 439 segments, and one is `GameOfLife3D.NET`
— a .NET project, which the rule would have silenced. Lowercase-only matches one. The
lowercase form loses none of the 23 texts.

### 3. The diff

```
32 988 findings before, 32 955 after (-33)
added: none
removed: 33
```

All 33 read, all 33 hosts. No added finding, so nothing to check for fixability.

### 4. The corpus

`338 -> 337`, one snapshot moved, and it is the one predicted: `MuLTiAcidi/claudeos` loses
`herokucdn.com/error-pages/no-such-app.html` and nothing else.

## What it cost, which the ticket did not predict

That finding was claudeos's **only ruled false positive**, so removing it left the repository
with 26 unread findings and nothing settling it. `corpus-bookkeeping.test.ts` went red, which
is what it exists for. This is the treadmill `CLASSIFICATION.md` named in round three: closing a
class costs the repository that revealed it.

Angel settled it in one reading — `AAEAAAD/////`, a .NET BinaryFormatter signature in a table
of deserialization magic numbers. New class, **`binary-signature`**.

**Condition 6 does not move: 81 of 96 = 84.4%.** The repository was dirty before and is dirty
after, for a different finding. The ticket pre-registered that the condition could not be an
argument for the rule; it turns out the rule does not touch it, which is the cleanest form that
separation can take.

## The method note

This is the first rule derived from a **model's tabulation** rather than from a person reading
or a frequency scan. What the model did was narrow: it grouped 1262 findings by classes a
person had named, and the same shape appeared under three of them. Everything after that — the
frequency scan, the cost, the TLD list, the case-sensitivity, the diff, the corpus — is
deterministic and a person read every finding the rule removed.

That is the division ticket `36` argued for and this ticket is the first instance of it: **a
Choice over a person's vocabulary to find where to look, and nothing whatsoever to decide.**

## Loose end, not fixed here

`queue.ts`'s error message tells the reader to run `pnpm corpus --json` when
`test/corpus/results.jsonl` is stale. That flag does not exist, and the file is stale — 66 rows
from the 66-repo corpus, with no trace of the thirty repositories round thirty-one added. So
`pnpm discovery queue --certification` silently orders nothing. It is its own ticket.
