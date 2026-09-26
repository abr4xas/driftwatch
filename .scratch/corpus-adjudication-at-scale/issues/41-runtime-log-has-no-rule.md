# 41: `runtime-log` has no rule, and the measurement says why

**What to decide:** what rule comes out of `runtime-log`, ticket `37`'s third-largest class.

**Type:** prototype

**Blocked by:** nothing.

**Status: resolved 2026-09-24.** The class is refused. One structural rule fell out of reading
it and ships separately.

## The class has no shape and the reason is an irony

42 findings in 36 repositories, 41 still live. Read end to end they are ordinary paths:
`storage/log.txt`, `report/eslint-report.json`, `output/console-errors.txt`,
`memory/heartbeat-state.json`, `_workspace/current/run.json`, `results/batch-N.raw.txt`.

What joins them is not syntax. It is that the runtime **produces** the file rather than the
repository containing it — which a reader sees in one glance and a regex cannot see at all.

The only candidate was a vocabulary: treat `logs`, `output`, `state`, `reports` and their
neighbours the way `GENERATED` treats `dist` and `node_modules`. It was measured before it was
argued about, by counting how many of the 2599 clones have each as a **real, tracked**
directory:

| word | real directory in |
|---|---|
| `memory` | **194** repos |
| `state` | **146** |
| `reports` | **131** |
| `logs` | **107** |
| `results` | **105** |
| `output` | **95** |
| `log` | **57** |
| `outputs` | **29** |
| `tmp` | **28** |
| `temp` | **10** |

Against a class of **41 findings in 35 repositories** in total.

Adding `memory` alone would silence real paths in 194 repositories to quiet perhaps five
findings. The ratio is not close, and it runs in the forbidden direction: `AGENTS.md` prices a
false positive above ten false negatives, but this trades a handful of false positives for
hundreds of silenced real claims, which is the trade nothing in this project permits.

**The irony is the finding.** What makes a directory *sound* like runtime output — `output`,
`logs`, `state`, `memory` — is exactly what makes it a common name for a real directory. The
words that identify the class are the words that make the class unrulable.

`GENERATED` holds `dist`, `build`, `out`, `target`, `coverage` and the framework caches.
Those survive because they are names a build tool imposes, not names a person chooses. Nothing
here is in that category.

## The one structural shape in the class

`.git/index.lock`, `.git/stack/state.json`, `.git/PR_BODY.md`, `.git/hooks/`,
`.git/branches/main/`. **16 findings in 9 repositories, 8 distinct texts.**

This is not a vocabulary and not a guess. **Git never versions its own directory**, so a path
under `.git/` cannot be in the index of any repository, ever. Confirmed rather than assumed:
**0** of 1 858 219 distinct path segments across 2599 repositories is `.git`.

Its cost is not low, it is structurally zero — the same kind of fact as `~/` being the reader's
home and a scheme meaning a URL, which is the category `discard.ts` exists for.

Small, and worth having precisely because it cannot go wrong.

## What is recorded for the next reader of the table

Three classes attacked in order of mass now — `foreign-project`, `placeholder`, `runtime-log`.
The scores: 53 findings, 261 findings, 16 findings. The ranking by mass has predicted the yield
exactly once out of three, and this one yielded 2% of the class it came from.

A table ranked by how many findings a class holds is not a table ranked by what is fixable, and
after three rounds that is measured rather than suspected.

## Answer

The class is refused. The `.git/` rule ships.

```
discovery   32 641 -> 32 625   -16, added: none
corpus      337 findings, no snapshot moved
```

All 16 read: `.git/hooks/` five times, `.git/stack/state.json`, `.git/PR_BODY.md`,
`.git/branches/`, `.git/index.lock`. Nothing else, and nothing added.

**Condition 6 does not move: 81 of 96 = 84.4%.** Fourth in a row derived from the discovery
corpus with certification silent, condition 9 untouched.

### The class stays open and that is the result

41 findings in 35 repositories go on being reported, and the ticket's contribution is the
measurement that says why nobody should try again with a vocabulary: `memory/` is a real
directory in 194 of 2599 repositories, `state/` in 146, `reports/` in 131. Those numbers are
the answer to anyone who reaches for this class next, including me.

### A correction to how the earlier numbers were read

`/tmp/all-segments.txt` is `sort -u`, so `grep -c` over it answers "does any repository have
this segment", not "how many do". The first pass at the vocabulary read 1 for every word and
briefly looked like zero cost for all of them. Counting repositories instead gave the table
above, which says the opposite.

The conclusions that used that file did not move — `0 of 1 858 219` for the ellipsis and for
`.git` is a count of **distinct** segments, and zero distinct means zero occurrences. But a
non-zero reading off that file means only "at least one", and two rounds of tickets quote it.
Worth knowing before the third does.
