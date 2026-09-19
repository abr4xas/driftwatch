# 13: A source git lists but cannot be read is reported as a driftwatch bug

**What to decide:** whether a context file that is in the index and absent from the working
tree is an internal failure, and what the user should be told instead.

**Type:** bug

**Blocked by:** nothing

**Status:** open

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
