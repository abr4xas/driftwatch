# ADR-0011 — An unknown frontmatter key is only reported when it is a near-miss

- **Status:** accepted
- **Date:** 2026-09-10

## Context

`skill/frontmatter` (SPEC § 3) lists five structural rules, and four of them are arithmetic over two strings we can see: a field is there or it is not, a name matches its directory or it does not, a description is longer than twenty characters or it is not.

The fifth is different in kind. "Unknown keys in the frontmatter" is not a claim that something is wrong — it is a claim that **we have never heard of it**, and the thing being appealed to is our own list.

The obvious implementation is that list as an allowlist: every top-level key outside it is a finding. It even looks safe, because `.claude/skills/**/SKILL.md` is one tool's format and a key that tool ignores really is dead weight in the document.

It is not safe, for one reason: **the key set is not ours.** Claude Code adds frontmatter fields between releases. A list written today and shipped in a tool people install once is a list that falls behind, and the day it does, driftwatch reports a valid `SKILL.md` using a field that has been documented for a month. The rule that orders every decision in this project prices that at ten missed detections.

## Decision

An unknown key is reported **only when it is a near-miss of a known key**: edit distance ≤ 2 from a name on the list, with the closest one named as the suggestion. Two candidates at that distance is no candidate, the same rule `suggestAnchor` already applies.

Anything the list does not resemble — `version`, `x-team`, `stage` — produces nothing.

## Why

The divergence is **one-directional by construction**, which is the same property [ADR-0010](0010-anchors-match-on-a-canonical-key.md) buys for anchors. A field added to the format after this list was written is a new English word, not a typo of an old one, so it sits far outside the distance and cannot be reported. A key that *is* within two edits of `description` or `allowed-tools` is a key somebody meant to spell that way.

So a stale list costs detections and cannot produce a report. That argument comes from the shape of the two sets rather than from a corpus, which is why it did not need measuring first — and, as it happens, the corpus cannot adjudicate it: all 14 non-required keys across its 30 skills are on the list, so the wide rule and the narrow one both produce zero there.

## What is lost

**A key that is wrong but not a misspelling goes undetected.** `tools:` written where `allowed-tools:` belongs is eight edits away, and it is exactly the kind of mistake somebody makes by remembering another tool's format. `system:`, `prompt:`, `trigger:` — anything imported from a different vocabulary — is silent too.

That is a real and not-small class. What remains detected is the mistake this rule is actually good at naming: `allowed_tools`, `descriptin`, `licence`, where the author knew the field and typed it wrong.

## Consequences

- The rule cannot fire without a suggestion. "Unknown key" with nothing to compare it to is not a finding this check produces, which also means the message never has to hedge.
- **Not `fixable`.** SPEC § 8 lists exactly one autofix for this check — a `name` corrected to its directory — and a key rename is not it. It is a plausible correction, not the only one.
- The known list can be extended freely, but **not from the corpus**. Adding a key because a specific repo tripped over it is tuning against a validation repo, which ADR-0006 condition 9 costs a replacement.
- If the trade turns out to be wrong, the way back is a second, wider rule at a lower severity — "this key is on nobody's list" as a tier 2 warning — not a loosening of this one.
