# 06: Blobless + sparse clone seam

**What to build:** a corpus clone that fetches file *names* and four kinds of file content,
instead of whole repositories.

**Type:** task

**Blocked by:** nothing

**Status:** open — and it is the only ticket here that depends on no decision about any
model, no API terms, and no reopening of the deferred plan

## Why this is first

Every other ticket in this directory is arithmetic about a corpus nobody can hold on disk.
At today's ~52 MB per repo, the discovery corpus the [spec](../spec.md) describes costs
~104 GB at 2000 repos, and that alone ends the idea. This ticket is the one that decides
whether the number is 104 GB or 4 GB, and it is ordinary deterministic code.

The deferred plan said do **not** build this at 300 repos, and that advice was right for
300 full clones of a corpus that certifies. It does not survive the two-corpus split.

## The observation it rests on

driftwatch does not need the repositories. It needs:

- **File names**, for the index. [`repo-index.ts`](../../../src/verify/repo-index.ts) builds
  `files`, `dirs` and the basename maps from `git ls-files --others --exclude-standard` —
  names only, never contents.
- **The context files themselves**, which is what is being analysed.
- **`package.json`**, for the script manifests
  ([`manifest.ts`](../../../src/verify/manifest.ts)).
- **`.gitignore`**, because [`git.ts`](../../../src/verify/git.ts) shells out to
  `git check-ignore` and that is the general answer to a whole class of false positive.

Nothing else in a repository is read. A `--filter=blob:none` clone with a sparse checkout of
`*.md`, `package.json`, `.gitignore` and `.claude/**` carries all four and nothing else.

| | Full clone | Blobless + sparse |
|---|---|---|
| Per repo | ~52 MB | ~1-3 MB |
| 2000 repos | ~104 GB | **~4 GB** |

Two thousand discovery repos would cost less on disk than the 66 certification repos do
today.

## What has to be verified rather than assumed

Three things, all cheap to check against a single repo before writing anything:

1. **Is `git ls-files` complete under a blobless clone with a sparse checkout?** The index
   should carry every tracked path regardless of what is checked out, but `--others` reads
   the working tree, and under a sparse checkout the working tree is a subset. If the
   listing silently narrows, the index narrows with it and **every path outside the sparse
   cone becomes a false `path/missing`** — the worst possible failure mode for this project.
   Check by diffing `ls-files` output against a full clone of the same sha.
2. **Does `git check-ignore` still work?** It needs the `.gitignore` files themselves, and
   nested ones in directories outside the sparse cone would not be present. Nested
   `.gitignore` files are explicitly part of why the rule works — `wrangler-dist/` in
   workers-sdk, `.agents/skills/` in prisma. The sparse pattern may need every `.gitignore`
   at every depth, which is cheap but has to be stated.
3. **Does a blobless clone still resolve a pinned sha without network on later runs?**
   Blobless clones fetch missing blobs lazily on access, which means a second run can make
   network calls that the first one did not. For the discovery corpus that is tolerable; it
   would not be for the certification corpus, and the two must not share a code path that
   quietly acquired this property.

## Scope, and what stays out

This is for the **discovery corpus only**. `scripts/corpus.ts` clones the certification
corpus and is covered by [ADR-0007](../../../docs/adr/0007-the-corpus-does-not-run-in-ci.md);
it keeps its full shallow clones and its pinned shas, and nothing about it changes. The
certification corpus is 66 repos and 3.4 GB, which is not a problem anyone has.

If the verification in the section above comes back clean, the natural shape is a separate
script that shares `corpus-repos.ts`'s types and nothing else.

## The honest outcome to be prepared for

If check 1 fails and `ls-files` does narrow, the fallback is to build the index from
`git ls-tree -r <sha> --name-only`, which reads the commit's tree directly and never
consults the working tree. That would mean the discovery corpus builds its index by a
different route than `repo-index.ts` does, and **a second way of producing the same
structure is a real cost** — the two can drift, and the discovery corpus would then be
measuring a slightly different tool. Worth writing down which route was taken and why.
