# 39: `foreign-project` is the largest class and it is not a shape

**What to decide:** what rule, if any, comes out of the largest named class in ticket `37`'s
table.

**Type:** prototype

**Blocked by:** nothing. Ticket `37` ranked the classes and this is the top row.

**Status: resolved 2026-09-24.** Two rules ship and they are small. The class does not shrink.

## The answer first, because it is the useful part

**Mass in a class is not mass in a rule.** `foreign-project` is 92 findings in 74 repositories,
the largest named class by a factor of two, and it produces **one rule covering 39 findings in
9 repositories** plus a TLD widening covering 14 more. The rest of the class has no syntax:
`mem0/memory.py`, `inspect_ai/_util/constants.py`, `packages/worker/src/` — real paths in real
projects that this repository is not. A person can see it and a regex cannot.

Ticket `37` said "a row is a place to look, mass is not cost" and pre-registered that the table
was not a ranking of what to fix first. This is that sentence arriving with a demonstration.

## Reading the 92

Four shapes, measured over the current `results.jsonl` (31 916 `path/missing` findings) rather
than counted off the table:

| shape | findings | repos | outcome |
|---|---|---|---|
| `../` leaving the repository root | **0** | 0 | already handled, see below |
| a Windows drive letter — `D:/`, `G:/` | 39 | 9 | **rule** |
| a host in a TLD ticket `38` excluded | 14 | 9 | **widening** |
| no shape at all | the rest | — | nothing to write |

### `../` was the big one and it does not exist

2194 findings begin with `../`, across 105 repositories, which looked like the largest single
shape in the check. **None of them leaves the repository.** `.claude/skills/foo/SKILL.md`
naming `../bar/` means `.claude/skills/bar/`, which is inside; the count of `..` segments never
exceeds the document's own depth.

And the ones that would escape are not reported at all: `resolve.ts` has returned `undefined`
for a path above the root since it was written — *"that is not a claim about this repository"* —
verified on a throwaway repo whose `CLAUDE.md` names `../outside/file.ts` and which reports no
drift. A whole afternoon's candidate, closed by a measurement that took a minute, with nothing
to change.

The first count said 0 for the wrong reason and was rechecked before it was believed: a
`/(^|\/)\.\.(\/|$)/g` counts `../../` once, because the match consumes the separator the next
one needs. Splitting on `/` gives the right number, and the right number is also 0.

## The rule: a drive letter is the reader's machine

`D:/Projects/pjmagee/multi-stream-viewer/.claude/gsd-core/references/ai-evals.md`,
`G:/Claude/`, `F:/Git-Repositories/Dalamud/VoicePack/`. Exactly what `isHomePath` covers for
`~/`: a location on the machine of whoever wrote the document, unverifiable against any
repository, and nothing in a repository is named `C:`.

Half of it is already covered by accident and that is worth knowing. `SCHEME` in `isSpecifier`
is `/^[a-z][a-z\d+.-]*:/u`, lowercase-only, so `d:/projects` is discarded as a module specifier
and `D:/Projects` is not — 41 of the 276 drive-shaped discards arrive by that door. The rule
makes the coverage deliberate instead of a side effect of a character class.

**Cost, measured both ways:**

- **276** discarded candidates carry a drive letter and **0** resolve to anything.
- **0** of 12 439 distinct first path segments across 2599 repositories look like one. Not one.
  A colon is not legal in a Windows path component and is vanishingly rare in a POSIX one.

That is a cleaner cost than the `@` clause (3 resolving in 17 607) or the host clause (1
directory in 12 439).

## The widening: the TLDs ticket `38` refused

`38` left `io`, `dev`, `ai`, `app` and `co` out of the host list, on the argument that they are
real TLDs and also ordinary words people name directories after — and said explicitly that **the
cost measurement decides whether they can be added, not intuition.** So it is measured:

- **222** discarded candidates match with those five TLDs and **0** resolve.
- **1** of 12 439 first segments looks like one: `forecast.io`.

One directory in 12 439, against 14 findings in 9 repositories — `mise.jdx.dev/tasks/`,
`nvcr.io/`, `peonping.github.io/registry/index.json`, `us-docker.pkg.dev/...`. `AGENTS.md` §
"The rule that orders every decision" settles the direction: one false positive costs more than
ten false negatives, so a rule that silences fourteen misreadings at the risk of one missed
claim is the trade this project takes every time.

The refusal of file extensions stands unchanged. `md`, `sh`, `py`, `rs` and `go` stay out, and
the case-sensitivity stays, because that is what keeps `GameOfLife3D.NET` reported.

## What is deliberately not attempted

A rule for the rest of the class. `mem0/memory.py` is a path in Mem0, `../netbox` is NetBox,
`inspect_ai/_util/constants.py` is Inspect — they are ordinary paths, correctly shaped,
resolving nowhere here because the document is comparing itself to another project. The only
signal is the sentence around them, and ticket `36` measured what asking a model about that
sentence is worth: `aboutThisRepo` at -31 points and `CLAIMS_A_PATH` losing to arbitrary order.

**This class does not close.** It gets 53 findings smaller and stays the largest.

## What shipped

Two clauses, both in `discard.ts`, neither a new rule.

`isDrivePath`, beside `isHomePath` and reported under the same `home-path` cause, because they
are the same fact arriving from two operating systems. And five TLDs added to `HOST`.

```
discovery   32 955 -> 32 902   -53, added: none
corpus      337 findings, no snapshot moved
```

All 53 removed findings read by hand. Every one is a Windows machine path —
`D:/Projects/pjmagee/...`, `C:/Users/domes/Desktop/...`, `G:/Claude/`, `F:/GITHUB/` — or a
host: `mise.jdx.dev/tasks/`, `nvcr.io/`, `docs.expo.dev/versions/`, `secutils.dev/llms.txt`,
`play.manabrew.app/sidestore/`, `peonping.github.io/registry/index.json`. None is ambiguous
and none was added.

**Condition 6 does not move, again: 81 of 96 = 84.4%.** Neither shape occurs in the
certification corpus at all, so this is a rule derived entirely from the discovery corpus with
the certification corpus silent on it — the second time, after the `@` rule, and condition 9 is
untouched because nothing here looked at a validation repository.

### A superseded test, replaced rather than deleted

`38` shipped a test asserting `packages.io/x` and `my.app/config.json` are **not** discarded,
which was the right assertion for a decision that had not been measured. It now asserts the
opposite with the measurement in the comment. The refusals that did not move keep their tests
unchanged: file extensions stay out, and `GameOfLife3D.NET/src/main.cs` is still reported.

### The honest summary

The largest class in ticket `37`'s table yielded 53 findings across about 18 repositories. The
class had 92 findings in 74. **What was large about it was not what was fixable**, and a table
ranked by mass will point at that class again next time unless somebody reads it first.
