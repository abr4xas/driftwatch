# 05: `link/broken` — the anchor half

**What to build:** the check that resolves `#section` against the target document's headings. The file half of `link/broken` already exists inside `path/missing`; the broken anchor is reported by nothing.

**Blocked by:** `03` (`--only`, for the second invocation over `docs/`), `04` (ignores)

**Status:** done

`docs/spec/SPEC.md` § 3 defines the check as "a relative Markdown link to a file that does not exist, **or to an anchor (`#section`) that does not exist in the target file**". `.scratch/m2-other-tier-1-checks/spec.md` § "`link/broken` is narrower than it looks" verified the first half is already covered, and settled the division: **this check never claims a target that does not exist.** It leaves it to `path/missing`, which already suggests a candidate for it, and one link produces one finding.

## What it reports

- [x] A link whose url carries a `#`, whose path half resolves to a **Markdown file that exists**, and whose fragment matches no anchor in that file.
- [x] A same-file anchor (`#section`, no path) is the same case with the source as its own target.
- [x] Message: `anchor does not exist`. The quoted text is the url as written, anchor included, because that is what the reader searches the line for.

## What it never reports

Each of these is a false positive class, and the fixture has a case for every one.

- [x] **A target that does not exist.** `path/missing` owns it. Requiring the target to be in the index is also what keeps the two checks from double-reporting the same link.
- [x] **A non-Markdown target.** `src/cli.ts#L40` is a line reference to a file whose headings we cannot parse. No parse, no claim.
- [x] **An external url.** `parseMarkdown` already knows which ones those are.
- [x] **An empty fragment** (`./guide.md#`), which is a link to the top of the file.
- [x] **`#top` and `#readme`**, which GitHub synthesizes and no heading produces.
- [x] **`#L12` and `#L12-L20`**, line references, even on a Markdown target.
- [x] The prose rules that already gate path claims — `proseDisclaims` and `inExternalRootSection` — gate these too. A link inside a section documenting *another* repo's layout is not a claim about ours.

## Matching is deliberately looser than GitHub

The obvious implementation is GitHub's slug algorithm, `github-slugger`, character class for character class. **Do not.** A slug that diverges from GitHub's by one character class reports an anchor that resolves fine in the browser, and `AGENTS.md` § "The rule that orders every decision" prices that at ten missed detections.

Match on a **canonical key** instead: lowercase, then drop every character that is not a letter or a number (`/[^\p{L}\p{N}]+/gu`). It is strictly more permissive than GitHub's slug — every anchor GitHub resolves, this resolves — so the divergence can only ever cost a detection, never produce a report. It is five lines, it needs no dependency, and it cannot drift from a generated regex we do not own.

- [x] The key is computed the same way on both sides: on the link's fragment and on each heading's text.
- [x] **Duplicate headings still need their suffixes.** GitHub renders a second `## Setup` as `setup-1`. The nth occurrence of a key contributes `key` when n is 0 and `keyN` otherwise, so `#setup-1` keys to `setup1` and matches.
- [x] Heading text is the concatenation of the node's descendants, so a heading holding `` `code` `` or a link contributes its visible text.
- [x] **Explicit html ids count.** `<a name="x">`, `<a id="x">` and an `id` on any html node in the target all add their key. Real documents anchor things that are not headings.
- [x] `{#custom-id}` at the end of a heading contributes **both** keys: the literal one GitHub produces and the custom id other renderers produce. Accepting both is the permissive direction.

## Where the pieces go

- `src/parse/anchors.ts` — pure: `content -> Set<key>`. It parses its own markdown rather than growing `ParsedDoc`, because most of its inputs are **target files, not sources**, and `ParsedDoc` is the source pipeline's type.
- `src/extract/links.ts` — the `link` claims. `ClaimKind` already has `'link'`; do not add it.
- `src/verify/anchor-index.ts` — the I/O. Reads the target files once per run.
- `src/verify/checks/link-broken.ts` plus its entry in `CHECKS`.

- [x] **`CheckContext` grows an `anchors` map**, `path -> Set<key>`, built before verification the way `ignoredByGit` already is. `Check.run` is synchronous and stays that way: a check that reads from disk on the hot path is how the 500 ms budget dies.
- [x] Only files that some claim actually targets are read. The map is not the repo.
- [x] Links resolve **against `source.baseDir` only**. The dual baseDir/root resolution in `path/missing` exists because prose is ambiguous about where it is speaking from; a Markdown link is not — GitHub renders it relative to its own directory. And since the check only proceeds when the target exists, the stricter rule costs nothing.

## Suggestions

- [x] When the fragment matches nothing, suggest the single closest anchor at edit distance ≤ 2 over the keys. Several candidates, or none, means no suggestion.
- [x] **Never `fixable`.** ADR-0006's hard floor is zero false positives among the fixable findings, and every case where the fix is obvious — wrong case, wrong punctuation — is already *accepted* by the canonical key and never reported. What is left to report is a real typo, and its correction is a guess. `SPEC.md` § 8 lists `link/broken` as autofixable "with a single candidate target"; that is the file half, which this check does not claim. Revisit in M3 with the corpus in hand, not here.

## Tests

- [x] Fixture `anchors`: same-file hit and miss, cross-file hit and miss, duplicate headings, a heading with inline code, an html `id`, and each of the seven never-report classes.
- [x] `test/fixtures/links-and-frontmatter.ts` **changes**: its line 16 links to `./guides/deploy.md#steps` and that target has one heading, `# guide`. It has been a broken anchor since it was written and nothing reported it. Add the finding rather than editing the fixture to be quiet.
- [x] Unit tests for `anchorKey` and `collectAnchors`: accents, emoji, CJK, punctuation, duplicates, `{#custom-id}`, html ids.
- [x] The `false-positive-traps` fixture stays at zero.

## Corpus

A run is owed, before and after, and unlike ticket `04` this one **will** move snapshots: it is new finding surface over 49 repos full of cross-referencing documentation. Every new finding is classified by hand into `CLASSIFICATION.md` and the nine conditions of ADR-0006 are re-checked **aggregate**, not inherited — `spec.md` § "The obligation nobody should skip".

If a class of false positive shows up that the canonical key cannot absorb, the honest outcome is to narrow what the check claims and write down what it gave up.

## The second invocation over `docs/`

- [x] Add `driftwatch.docs.config.ts` with `sources: ['docs/**/*.md', 'README.md']`, and run `driftwatch --config driftwatch.docs.config.ts --only link/broken`. Shipped wider than specified — `AGENTS.md` and `test/corpus/*.md` are in it too, and it carries `checks: { 'path/missing': 'off' }` so a bare run against it is safe rather than depending on the caller remembering `--only`.

ADR-0008 established that `path/missing` cannot run over `docs/spec/` — a specification quotes paths from other repositories and from hypothetical ones. **Anchors are the opposite case:** an anchor is a claim about the document it points at, and this repo's specs cross-reference each other constantly. This is the first check that can audit them, and `docs/` is the one place in the repo where a real drift is likely to already exist.

## Out of scope

- Reporting a link to a heading that exists in a *different* file. It is a plausible suggestion and a new way to be wrong.
- Anchors into non-Markdown targets, including `#L12` line references. Resolving them means parsing every language.
- The file half of `link/broken`. It works, it lives in `path/missing`, and moving it buys nothing but a rename.
- `--fix`, which is M3.

## Comments

Closed 2026-09-10. 35 new tests, 330 in the suite. Corpus run in full: **49 repos, 177 sources, 15 findings, zero snapshots changed.**

### The zero had to be shown not to be vacuous

A check that never runs also changes no snapshot. Measured directly: **112 link claims** over the corpus's discovered sources, **110 anchors resolved** against a parsed document, **0 findings**. The check read 110 anchors other people wrote and agreed with all of them.

It also means the corpus holds **no true positive for this check**. `link/broken` is proven quiet and unproven useful, and those need different evidence. `CLASSIFICATION.md` § "Ninth round" has the breakdown and what would change the reading.

### The material is thinner than the ticket assumed

The ticket predicted snapshots would move — "new finding surface over 49 repos full of cross-referencing documentation". Of the 183 anchor links in 377 context files, **148 are same-file** (tables of contents, generated from the headings they point at), **27 are external**, and **6 are cross-file relative Markdown**. All six resolve.

The same applies to this repo. `driftwatch.docs.config.ts` was added and it audits nothing today: not one document in `docs/`, `README.md` or `AGENTS.md` writes a `](...#...)` link. It is kept because it costs twenty lines and fires on the first one somebody writes, and the config says so in a comment rather than pretending otherwise.

The name is `driftwatch.docs.config.ts` and not the `driftwatch.docs.ts` the ticket wrote, because `tsconfig.json` includes `*.config.ts` and not the repo root: under the shorter name `pnpm typecheck` passed by never reading the file. Caught in review, and the same trap is waiting for every future root-level `.ts`.

### The canonical key, and why it is not `github-slugger`

[ADR-0010](../../../docs/adr/0010-anchors-match-on-a-canonical-key.md). Reproducing GitHub's slug — or depending on it — makes every divergence in a generated character class a finding on a link that works in the browser. Reducing both sides to lowercase-alphanumerics is **strictly more permissive**, so the divergence is one-directional by construction: it can cost a detection, it cannot produce a report.

That argument comes from the shape of the two functions, not from a corpus, which is why it did not need measuring first. What it gives up is written down: `#thefixflag` and `#The-Fix-Flag` both resolve here and neither resolves on GitHub.

### The existing fixture had been lying since it was written

`links-and-frontmatter` line 16 links to `./guides/deploy.md#steps`, and that file holds one heading, `# guide`. Broken from the day it was committed, and nothing reported it. The finding was added rather than the fixture quietened — it is the only true positive in the repo that nobody planted.

### Never fixable, and not by omission

Every case where the correction is obvious — wrong case, wrong punctuation — is one the canonical key already accepts and never reports. What is left to report is a real typo whose target is a guess. `SPEC.md` § 8 lists `link/broken` as autofixable "with a single candidate target"; that is the **file** half, which this check does not claim. Revisit in M3.

### The I/O is gated, because it is real

`Check.run` is synchronous, so the target files are read once per run into `verify/anchor-index.ts` before verification, the way `ignoredByGit` already is. And `run()` skips building it entirely when no enabled check consumes a link claim, so `--only path` pays nothing for a check it is not running.

### Review found three false-positive classes the corpus could not

The corpus holds **six** cross-file anchors in total, so "zero findings over 49 repos" covers almost none of the surface. Reading the code against the ticket found three ways to report a link that is not broken, and all three are now refused in `splitAnchor`:

- **`.mdx` and `.mdc` targets.** The ticket said "a Markdown file that exists" and the first implementation read that as any Markdown-ish extension. remark parses MDX without complaining and sees none of the headings a JSX component or an imported partial emits — so in a Docusaurus or Nextra repo *every* anchor into that file would be a finding. Now only `.md` and `.markdown` are claimed, which is the same reasoning the ticket already applied to `src/cli.ts`: no parse, no claim.
- **`#L12C5-L20C9`**, the column form GitHub's "Copy permalink" writes. The ticket named `#L12` and `#L12-L20` and the regex matched exactly those.
- **`#:~:text=foo`**, a browser text fragment, which keyed to `textfoo` and reported.

A fourth net was added behind them: **a target offering no anchor at all is never reported.** A document with zero headings and zero ids is far more likely one we failed to read than one whose author linked into nothing, and without the guard a single unparsed file becomes a screenful.

The fixture gained a case for each, plus the two the ticket asked for and the first draft skipped: `#readme`, and a link the prose gates hold back.

### Lint

No errors. Warnings stay at 11, the same two files as ticket `04` and none of them in the new code.
