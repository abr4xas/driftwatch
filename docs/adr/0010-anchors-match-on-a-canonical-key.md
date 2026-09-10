# ADR-0010 — Anchors match on a canonical key, not on GitHub's slug

- **Status:** accepted
- **Date:** 2026-09-10

## Context

`link/broken` (SPEC § 3) has to decide whether `#the-fix-flag` names a heading in the target document. The rendered id is produced by GitHub's slug algorithm, published as `github-slugger`: lowercase the heading's visible text, delete the characters in a large generated character class, replace spaces with hyphens, and disambiguate repeats with a numeric suffix.

The obvious implementation is to reproduce that algorithm, or to depend on it.

Both have the same failure mode. The character class is generated, it covers punctuation ranges and the emoji planes, and it changes. Any divergence between our slug and the rendered one turns an anchor that resolves fine in the browser into a reported finding — and the one rule that orders every decision in this project says one false positive costs more than ten false negatives.

## Decision

Both sides are reduced to a **canonical key**: lowercase, then drop every character that is not a letter or a number (`/[^\p{L}\p{N}]+/gu`). The link's fragment and each of the target's anchors are keyed the same way, and the check reports only when no key matches.

Five things are added on top, and each of them only ever **adds** a key, which is what keeps the one-directional property below true:

- Repeated headings get GitHub's suffixes, so a second `## Setup` contributes `setup1` and `#setup-1` resolves.
- The ids of any html in the document count, because real documents anchor things that are not headings.
- `## Section {#custom-id}` contributes both the literal key GitHub produces and the custom id other renderers honour.
- An image's `alt` counts toward its heading's text. Whether the rendered slug includes it depends on the renderer, so including it is the safe guess.
- A `user-content-` prefix is stripped off the fragment before keying, because GitHub prefixes the ids it renders and a link copied out of the DOM carries it.

Three things are refused outright rather than keyed, and each is a whole class of report the check never gets the chance to produce:

- **`.mdx` and `.mdc` targets.** remark reads them without complaining and sees none of the headings a JSX component or an imported partial emits, so the anchors collected are a subset of the real ones and every link into the rest becomes a finding. Not parsing at all is the honest answer.
- **A target that offers no anchor at all.** Far more likely a document we failed to read — generated, templated, a format remark sees as prose — than one whose author linked into nothing. One unparsed file would otherwise become a screenful.
- **Fragments no heading produces:** `#top`, `#readme`, line references including the `#L12C5-L20C9` form "Copy permalink" writes, and browser text fragments (`#:~:text=`).

## Why

The key is **strictly more permissive** than the real slug: any two strings the slug algorithm maps together, the key also maps together. So the divergence is one-directional by construction — it can cost a detection, and it cannot produce a report.

That is the trade this project already makes everywhere else, made here without needing to be measured, because it follows from the shape of the two functions rather than from a corpus.

It is also five lines with no dependency, and it cannot drift from a generated regex we do not own. Those are the secondary reasons and they are secondary on purpose: a correct dependency would not answer the first objection.

## What is lost

**A link whose punctuation is wrong but whose letters are right is not reported.** `#thefixflag`, `#the_fix_flag` and `#The-Fix-Flag` all resolve here and none of them resolves on GitHub.

That is a real class of broken link going undetected, and it is not small — a hand-typed anchor gets the punctuation wrong more often than the letters. What remains detected is the case where the *words* changed, which is what drift actually looks like: a section gets renamed and the links to it go stale.

## Consequences

- The suggestion carries a readable slug (`#install`), never the key, because a suggestion that reads `thefixflag` helps nobody. Nothing is ever matched against it.
- **No anchor finding is ever `fixable`.** Every case where the correction is obvious — wrong case, wrong punctuation — is one the key already accepts and never reports, so what is left to report is a real typo whose target is a guess. SPEC § 8 lists `link/broken` as autofixable "with a single candidate target"; that is the *file* half, which this check does not claim (it belongs to `path/missing`).
- If the trade turns out to be wrong, the way back is a second, stricter key compared only when the permissive one already matched — reporting "resolves as written, but not on GitHub" as a separate, lower-severity finding. That is a new check, not a loosening of this one.
