# 05: The dirty working tree warning

**What to build:** the last rule of `SPEC.md` § 8 — "If the working tree has uncommitted changes in a file to be modified, it warns but proceeds (this is not a git tool)."

**Blocked by:** `03`

**Status:** done

The rule is two sentences and the parenthesis is the important one. The tool does not stage, does not commit, does not refuse, and does not offer to stash. It says the file has uncommitted changes and then it edits it, because the user asked it to.

## What it does

- [ ] One `git status --porcelain` for the paths about to be written — the paths, not the repo. `src/verify/git.ts` already owns every git invocation and already batches its queries (`gitIgnoredPaths` takes a set); this is a third function there and not a new place that shells out.
- [ ] A repo with no `.git`, or no `git` on `PATH`, produces **no warning and no error**. Discovery already falls back to a glob walk for that case; a warning that git failed is noise about a tool the user may not be using.
- [ ] The warning is printed **before** the edits, naming the files. After the fact it is a fact about the past.
- [ ] It is a warning in the English sense, not a `Finding` with `severity: 'warning'`. It never touches the counts or the exit code.

## Why it is worth having at all

The one real safety net a user has after a bad `--fix` is `git checkout -- .`, and it is only there if the file was clean. Telling them the net is missing, before the fall, is the whole value — and it is also why this ticket does not grow into refusing: a user with uncommitted changes who wants the fix anyway is making an ordinary choice, and a tool that blocks it gets `--force` bolted on within a week.

## Tests

- [ ] A temp repo with a dirty source: the warning appears and the edit still lands.
- [ ] A temp repo with a clean source: no warning.
- [ ] A directory with no `.git`: no warning, no crash, edit lands.
- [ ] `--dry-run` also warns, because the point is to tell the user what state they are in before they decide.

## Out of scope

- Anything that writes to git.
- A `--force`, a `--no-warn`, or a config key for this. Nothing has asked for one.

## Comments

Closed. 490 tests, four of them new. `gitDirtyPaths` is a third function in `src/verify/git.ts`, batched the same way `gitIgnoredPaths` is, and nothing else in the codebase shells out to git.

### It warns and proceeds, and both halves have a test

The dirty case asserts the warning **and** that the file was edited anyway. The clean case asserts silence, which is what proves the warning is conditional rather than unconditional. A repo with no `.git` neither warns nor crashes and the fix still lands — discovery already falls back to a glob walk for that case, and a warning that git failed would be noise about a tool the user may not be using.

A dry run warns too. The point is to tell somebody what state they are in before they decide, and the decision is the one they are about to make.

### Where it goes, and what it is not

Stderr, as `driftwatch: uncommitted changes in AGENTS.md`, which is where everything that is not the report already goes. It is a warning in the English sense: not a `Finding`, not a `severity: 'warning'`, and it touches neither the counts nor the exit code.

`applyFixes` takes a `warn` callback rather than the whole `Io`. The one warning this module has is about the user's git state and not about the audit, and handing it the output surface would invite more.

### The order is load-bearing

Before the edits. Afterwards it is a fact about the past, and the value of the warning is entirely in the sentence "you have no way back if this goes wrong" arriving while that is still actionable.

### It stays two sentences

No `--force`, no `--no-warn`, no config key, and no refusing. A user with uncommitted changes who wants the fix anyway is making an ordinary choice; a tool that blocks it gets a flag bolted on within a week to unblock it.
