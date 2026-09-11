# 05: The dirty working tree warning

**What to build:** the last rule of `SPEC.md` § 8 — "If the working tree has uncommitted changes in a file to be modified, it warns but proceeds (this is not a git tool)."

**Blocked by:** `03`

**Status:** ready-for-agent

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
