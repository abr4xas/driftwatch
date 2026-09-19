# 06: Blobless + sparse clone seam

**What to build:** a corpus clone that fetches file *names* and four kinds of file content,
instead of whole repositories.

**Type:** task

**Blocked by:** nothing

**Status: resolved 2026-09-18.** Built as `scripts/discovery-clone.ts`, verified over 36
corpus repos. See §"Answer".

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

*(Both figures above were the estimate. The measured numbers are in §"Answer", and the
second sentence turned out to be false.)*

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

## Answer

Built as [`scripts/discovery-clone.ts`](../../../scripts/discovery-clone.ts), with
[`test/discovery-clone.test.ts`](../../../test/discovery-clone.test.ts) covering the cone
without a network.

### The three verifications

1. **`git ls-files` is complete under a blobless sparse clone. Yes.** Identical index on
   every repo tried, 36 of 36 — `unjs/nitro` 977 = 977, `emdash-cms/emdash` 4166 = 4166.
   The index is not the working tree: `--cached` reads it whole regardless of what is
   checked out, and `--others` adds nothing because a fresh clone has no untracked files.
   The feared failure — the listing narrowing and turning every path outside the cone into
   a false `path/missing` — does not happen, and the `ls-tree` fallback was not needed.
2. **`git check-ignore` still works. Yes.** The cone carries `/**/.gitignore`, so the
   nested ones are all present: 7 of 7 in `nitro`, 23 of 23 in `react-router`, byte-identical.
   Probed with 168 and 227 generated paths respectively, and the output matches down to the
   file and line number of the matching pattern, including matches from `.gitignore`s four
   directories deep.
3. **A later run does not reach the network.** Structurally, not just empirically:
   driftwatch opens files with node's `readFile`, so a blob outside the cone is absent from
   disk and the read raises `ENOENT` — there is no path by which reading triggers a lazy
   fetch. The only git subprocesses are `check-ignore` and `remote get-url`, both local.
   `--verify` sets `GIT_ALLOW_PROTOCOL=none` after cloning to keep that true.

### The measurement

**All 66 corpus repos**, at their pinned commits:

| | Full | Sparse |
|---|---|---|
| Total | 3479 MB | **182 MB** |
| Per repo | 52.7 MB | **2.8 MB** |
| 2000 repos, projected | ~103 GB | **~5.4 GB** |

**All 66 produce byte-identical conclusions** — same sources, same claim count, same
findings with the same messages — against a full clone of the same pinned commit.

The estimate in the body of this ticket was ~1-3 MB per repo and said 2000 discovery repos
would cost less than the 66 certification repos. The per-repo figure was right and **the
comparison was wrong**: 5.4 GB is more than the 3.4 GB the certification corpus occupies.
19.1x is the real ratio. Recorded here rather than quietly corrected, because a projection
cited as a measurement is the failure mode this directory exists to avoid.

### Six defects found, all fixed

The cone was derived by reading the source, and reading it was not enough. Three came out
of running it, three more out of review:

- **`.cursorrules` was missing.** No extension, so no wildcard reached it; `classifySource`
  matches it by exact basename. Found by `colinhacks/zod`, which crashed with `ENOENT` —
  the safe direction, but still a repo lost.
- **`Makefile` was missing**, along with the other names in `RUNNERS`. Found by
  `tursodatabase/turso`, and this is the dangerous direction: the target list came back
  empty and a real `script/missing` finding **silently disappeared**. Nothing crashed.
- **Removing the remote broke `namesAnotherRepo`.** The first version deleted `origin` after
  cloning so a lazy fetch would fail loudly. But `originSlug` reads `remote.origin.url` to
  learn which repo this is, and `context-prose.ts` needs it to tell another project's paths
  from this one's. `saubakirov/KZ-IT-telegram-list` showed it as 262 claims against 260,
  same sources byte for byte. The remote stays; the network is refused with
  `GIT_ALLOW_PROTOCOL` after the clone instead.
- **`core.sparseCheckoutCone` was left unset.** It is inheritable from a user's global
  config, and under cone mode these patterns mean something else — the cone cannot express
  "every `.md` at any depth". Now `false` explicitly.
- **`--verify` did not check the full clone was at the pinned sha**, so a clone left behind
  by an older pin would have been diffed against the current commit and every difference
  misread as a defect in the cone.
- **The cone carried `.mdx`, `.html` and `.htm` for no reason**, which is the inverse
  mistake and is the subject of the section below.

The lesson is in the test. It derives the cone's obligations from `RUNNERS`, from
`classifySource`, from `links.ts`'s `MARKDOWN` pattern, and from a
`Record<SourceKind, ...>` that fails the **typecheck** when a source kind is added — rather
than from a list written by hand, which is what produced the first two defects. It also asks
**git** whether the cone admits a path, by writing the cone into a throwaway repo's
`.gitignore` and running `check-ignore --no-index`; the first version re-implemented git's
matcher as a regex, which made every assertion a statement about the regex.

### What is explicitly not covered

**One case, not two.** An earlier version of this Answer claimed two, and the second was
wrong — recorded here because the reasoning that produced it is the kind worth not
repeating.

**The real one: a config that declares its own sources.** `sources` can be arbitrary globs
and a `configured` source is whatever they match, so no pattern list covers it. It fails
**loudly** with `ENOENT`, so the runner drops the repo and says so. Correct behaviour: the
alternative is a finding that is an artifact of the checkout.

**The one that was wrong: a link anchored at a file that is not a document.** The claim was
that `[x](src/app.ts#L10)` makes `buildAnchorIndex` open `src/app.ts`, which the cone does
not carry, and that `link/broken` reading an unreadable target as silence makes it a *quiet*
divergence. Every step of that is true of `buildAnchorIndex` and false of the pipeline: the
claims it iterates are `kind === 'link'`, and
[`links.ts`](../../../src/extract/links.ts) only emits those for its `MARKDOWN` pattern,
`.md` and `.markdown`. Everything else stays a `path` claim, answered from the index and
never opened.

Checked rather than argued. A document anchoring into `.ts`, `.mdx`, `.mdc`, `.html`, `.md`
and `.markdown` produces exactly two link claims: the `.md` and the `.markdown`.

**What this cost, and what it bought.** The follow-on this ticket recorded — "detect
anchored links whose target the cone does not carry and drop the repo" — was started and
then deleted, because it would have been code checking an impossibility. Chasing it is what
turned up the actual defect: the cone had been widened to `.mdx` to close the imaginary hole,
and `.html`/`.htm` had been considered and rejected on a cost argument that was beside the
point. Removing them took the checkout from 204 MB to **182 MB** with no change in
conclusions across all 66 repos.

What replaced the detector is a test that derives the anchor obligation from `MARKDOWN`
itself, so that widening it — dropping the deliberate `.mdx` exclusion, say — fails until
the cone follows.

### Not for the certification corpus

`scripts/corpus.ts` is untouched: full shallow clones, pinned shas, ADR-0007. A partial
clone can in principle reach the network later, and that property has no business near a
measurement. The two share `corpus-repos.ts` and nothing else.
