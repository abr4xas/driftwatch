# 13: A source git lists but cannot be read is reported as a driftwatch bug

**What to decide:** whether a context file that is in the index and absent from the working
tree is an internal failure, and what the user should be told instead.

**Type:** bug

**Blocked by:** nothing

**Status: resolved 2026-09-19.** See §"Answer".

## The repository that found it

`Rspoon3/Shotbot`, the 135th repository the discovery corpus acquired. Its `CLAUDE.md` is a
symlink into a git **submodule** that has not been initialised:

```
120000 26d1ada0 0  CLAUDE.md          -> personal-swift-claude/CLAUDE.md
160000 0169b157 0  personal-swift-claude
```

Both entries are in the index, so `git ls-files` lists `CLAUDE.md`, `discoverSources` finds
it, and `readFile` raises `ENOENT`. Run in that directory, driftwatch says:

```
driftwatch: internal failure: ENOENT: no such file or directory, open '.../CLAUDE.md'
  this is a driftwatch bug; report it with the command that produced it
```

Exit 2, which is right. The message is not: nothing is broken in driftwatch, and the user is
asked to file a bug report about their own checkout. A plain `git clone` of that repository
without `--recurse-submodules` reproduces it exactly — this is not an artifact of the sparse
cone, which is why it is a product ticket and not a note in `06`.

## Why it is not simply "handle ENOENT"

There are two situations behind the same error code and they deserve different answers:

- **The file is listed and missing**, as here. That is a fact about the checkout —
  an uninitialised submodule, a broken symlink, a `git rm --cached`. The user can act on it,
  and saying which file and that it is listed-but-absent is the whole fix.
- **The file was there and vanished mid-run.** A race, and genuinely ours to survive.

Whether either should be *skipped and reported* or should stop the run is the decision. The
project's usual instinct — one false positive costs more than ten false negatives — argues
for skipping it with a warning: a repository with one unreadable source still has real
answers to give about the others, and today it gives none.

## What to check before deciding

- How often it happens. One repository in the 135 audited so far, and the discovery corpus
  is the instrument for the rate.
- Whether `--json` should carry the skipped source. A source that was neither audited nor
  reported clean is the shape of thing the `summary.claims` figure exists to make visible.

## Answer

Resolved 2026-09-19. **Skip it, name it, and leave the exit code to the findings.**

### The rate, which the ticket asked for first

**1 unreadable source in 1070, across 201 repositories** — and it cost that one repository
100% of its output. Rare and total, which is the shape that argues for skipping rather than
stopping: the cost of tolerating it is a line of output in one repository per two hundred,
and the cost of not tolerating it is every answer that repository had.

### What it does now

`discoverSources` returns two things instead of one: the documents it read and the ones it
could not. The read is tolerated for `ENOENT` **only** — a permission error, a directory
where a file was expected, an I/O fault still throw, because none of those is a fact about a
checkout anybody can act on and admitting them would turn every future read bug into silence.

Two reasons, split by what was **observed** rather than by what is suspected. `lstat` is the
only part of the cause that can be checked: it succeeds exactly when the entry is there and
its target is not, which is `dangling-symlink`. Everything else is `absent-from-worktree` —
an uninitialised submodule, a `git rm --cached`, or a file deleted while the run was in
flight, and nothing here can tell those apart. The first draft had one reason and a pretty
line that guessed "an uninitialised submodule?", which asserted a cause it had not checked.

**The exit code does not move.** Nothing in the document went stale, so it is not drift;
the tool did not fail, so it is not a tool failure. What stops that being a vacuous green is
that every output a person or a pipeline reads says so.

### Where it is said, and the one place it is not

| Format | |
|---|---|
| `pretty` | a dim line above the summary, and **it survives `--quiet`** — SPEC.md § 5 exempts the *summary*, and this is the one line that changes how the findings above should be read |
| `json` | `summary.skipped`, always present even at zero, plus a top-level `skipped[]` |
| `sarif` | `invocations[0].toolExecutionNotifications`, SARIF's own notion of "something the run could not do" |
| `github` | **nothing**, deliberately |

The `github` asymmetry is the considered one. That format emits annotations "and nothing
else" (SPEC.md § 5) because the job log is its transport. SARIF carries it instead, and SARIF
is the format that feeds Code Scanning — which is the one place an incomplete checkout would
otherwise be an entirely silent green, with no annotation, no alert and nobody reading stdout.

### What the ticket left open and this did not settle

Nothing. Both open questions are answered: the rate is measured, and `--json` carries the
skipped source because Angel decided the contract could take an additive field.

### One thing worth recording for later

`anchor-index.ts:60` and `manifest.ts:206` already tolerate an unreadable file, and they do it
with a bare `catch {}` over *every* error and no reporting — the opposite policy from the one
this ticket just wrote into SPEC.md. Both are reads of a claim's **target** rather than of a
source, and both document what the silence means to the check, so neither is a bug. But the
project now has two policies for the same shape of failure, and if a third read site ever
appears, that is the thing to resolve rather than copy.