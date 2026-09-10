# 07: `skill/frontmatter` — the five structural rules

**What to build:** the check that reads a `SKILL.md`'s frontmatter as a **structure** and says what is wrong with it.

**Blocked by:** `04` (ignores), `06` (`frontmatter/invalid`, which owns the types this check assumes)

**Status:** done

`docs/spec/SPEC.md` § 3 lists five rules:

- Missing `name` or `description`.
- `name` does not match the containing directory's name.
- `name` is not kebab-case.
- `description` empty or shorter than 20 characters.
- Unknown keys in the frontmatter.

Four of them are arithmetic over two strings. The fifth is the only rule in the whole project that reports **a key we do not recognise**, which is a different kind of claim: it is not "this is wrong", it is "we have never heard of this". That asymmetry is what most of this ticket is about.

## The division with `frontmatter/invalid`

Ticket `06` settled it: **that check owns types, this one owns structure.** A `description` that is a list has no length to be too short, so every rule here runs only on a field whose type is already right, and a field `06` reported is skipped rather than reported twice.

Two consequences:

- [x] A block that does not parse produces **one** finding, `06`'s. This check stays silent on it: there is no structure to read.
- [x] A block the `06` gates refused — not key-shaped, or holding a template placeholder — is refused here too. A skill template has `name: {{name}}` and is not a skill; reporting that its name is not kebab-case would be reporting the generator.

## Where the claims come from

`06` already emits one claim per top-level key carrying `{ key, type, scalar }`, positioned at the **key token**. That is exactly what four of the five rules need, so this check consumes those claims rather than growing a second extractor for the same bytes.

- [x] **`06` stops filtering `type: 'empty'` in the extractor**, and `frontmatter-invalid.ts` skips it in the check instead. Nothing changes for `06` — an empty value is still not a type error — but `description:` with nothing after it becomes visible here, which is half of the "description empty" rule.
- [x] What is missing is a claim for the **block itself**, because "there is no `name`" is not a fact about any key. `src/extract/skill.ts` adds it, for `kind === 'skill'` only: one claim at the opening `---` carrying the list of top-level keys present.
- [x] A `SKILL.md` with **no frontmatter at all** is the same claim with nothing present, positioned at the first line of the file. One finding, `frontmatter is missing`, not two for the two absent fields.
- [x] The gates live in `06`'s module and both extractors go through the same exported function. A second copy of `KEY_SHAPED` would be the thing this tool exists to find.

## One claim, one finding

`Check.run` returns `Finding | null`, so a claim cannot produce two findings. That is a constraint, and it makes the output better rather than worse:

- [x] Both fields missing gives **one** finding: `frontmatter has no name or description`.
- [x] A `name` that is neither kebab-case nor the directory's gives **one** finding, the directory one, because it carries the fix. Reporting the case of a name that is about to be replaced wholesale is noise.

## The unknown-key rule is narrowed, and this is the reason

The obvious implementation is an allowlist: every key not on it is a finding. **Do not.** The key set is not ours — Claude Code adds fields between releases — and a list that falls one release behind reports a valid `SKILL.md`. `AGENTS.md` § "The rule that orders every decision" prices that at ten missed detections.

So the rule reports an unknown key **only when it is a near-miss of a known one**: edit distance ≤ 2 from a key on the list, and then the closest known key is the suggestion.

- [x] `allowed_tools`, `descriptin`, `licence` are reported, with the correction named. Two known keys at the same distance is **no** suggestion and therefore no finding, which is `suggestAnchor`'s rule and is recorded in the ADR rather than in this line.
- [x] `x-team`, `version`, `stage` — anything genuinely novel — are **not**. A key nobody on our list resembles is far more likely somebody's own than a mistake.
- [x] The direction of the divergence is what makes this safe: a key the list does not know yet can only be missed, never reported, because a newly added field is not two edits from an old one.
- [x] `editDistance` already exists in `src/fix/suggest.ts`, capped at 2, written for the anchors. Reuse it.

What it gives up: `tools:` written where `allowed-tools:` belongs is eight edits away and goes undetected. That is a real miss and it is the price of the rule above.

The known list is written from the **documented format**, not from what the corpus happens to contain — that ordering is deliberate and is what keeps the corpus a measurement rather than a mirror.

## The one fixable finding in the project so far

`SPEC.md` § 8 lists exactly one autofix for this check: **a `name` that does not match the directory, corrected to the directory's.** It is unambiguous by construction — there is one directory, and it is the identity Claude Code actually uses to invoke the skill — so it ships with `confidence: 1` and `fixable: true`.

- [x] Everything else this check reports is **not** fixable. A missing description cannot be invented, a short one cannot be lengthened, and an unknown key's correction is a guess even when it is a good one.
- [x] **`test/corpus-bookkeeping.test.ts` asserts `fixable: 0` across the corpus.** If a real repo turns out to have a mismatched skill name, that assertion has to become what ADR-0006 condition 2 actually says — zero *false positives* among the fixable findings — and the finding gets classified by hand first. Foreseen, not discovered.

## What it never reports

- [x] A source that is not a `skill`. `.claude/agents/*.md` and `.claude/commands/**` have their own required fields and this check knows nothing about them.
- [x] A field whose type is wrong (`06`'s), a block that does not parse (`06`'s), a template (nobody's).
- [x] ~~A `name` matching the directory but not kebab-case when the directory itself is not kebab-case.~~ **Withdrawn while implementing, see the comments:** this bullet is the only shape in which the kebab-case rule can fire at all, so honouring it would have shipped a rule that is dead code. A name outside `[a-z0-9-]` is not a matter of taste, it is a name the format does not accept.
- [x] A `SKILL.md` sitting directly in `.claude/skills/` with no directory of its own. There is no directory name to compare against.

## Where the pieces go

- `src/extract/skill.ts` — the block claim. Not in `ARCHITECTURE.md`'s tree yet; add it.
- `src/verify/checks/skill-frontmatter.ts` plus its entry in `CHECKS`. The tree already names this file.
- `src/extract/frontmatter.ts` — exports the gate, stops filtering empties.
- `src/verify/checks/frontmatter-invalid.ts` — skips empties itself.

## Tests

- [x] Fixture `skills`, which `ARCHITECTURE.md` § Testing has listed since before there was code: a valid skill with zero findings, and one case per rule.
- [x] Negative cases in the same fixture: the template, the unparseable block (one finding, `06`'s), the non-kebab directory agreeing with its name, the novel key, a `subagent` and a `command` with the same shapes and no findings.
- [x] Unit tests for the extractor and for the near-miss rule.
- [x] The `false-positive-traps` fixture stays at zero.

## Corpus

Owed before and after, and this one has the largest new surface of the three checks in M2: **30 of the 33 frontmatter blocks in the corpus are skills**, and five rules now read them. Every new finding is classified by hand in `CLASSIFICATION.md` and the nine ADR-0006 conditions are re-checked aggregate.

If a validation repo produces a false positive, the honest responses are, in order: narrow the rule **on principle** and write down what it gave up; or withdraw the rule and say so. Widening the known-key list because a specific repo tripped over it burns that repo under condition 9 and owes a replacement.

## Out of scope

- Validating the *content* of a description beyond its length. Whether it says the right thing is not decidable offline.
- `metadata`'s inner shape, and nested keys generally.
- The `allowed-tools` values: checking that `Bash(git status:*)` names a real tool is a different check with a different list.
- `--fix` itself, which is M3. This ticket only sets the flag M3 will act on.

## Comments

Closed 2026-09-10. 10 new tests, 355 in the suite. Corpus run in full: **49 repos, 177 sources, 16 findings, zero snapshots changed.**

It also produced [ADR-0011](../../../docs/adr/0011-an-unknown-key-is-only-reported-as-a-near-miss.md).

### The kebab-case rule and the bullet that had to be withdrawn

The ticket's never-report list said a non-kebab name agreeing with a non-kebab directory is not ours to report. Written that way, **the rule has no reachable case**: the directory comparison runs first and wins whenever the two disagree, so the only shape left is exactly the one the bullet forbade.

The bullet is what was wrong. A skill name outside `[a-z0-9-]` is not a naming preference, it is a name the format does not accept — `Ship_It/SKILL.md` with `name: Ship_It` agrees with its directory and is still broken. The rule reports it, the fixture pins it, and the bullet is struck through above rather than quietly dropped.

The code review caught the contradiction sitting in the ticket. It was noticed while implementing and not written down, which is the part that should not have happened: a ticket that contradicts its own implementation is worse than either.

### The unknown-key rule was gated on the value, and that was a real hole

The first draft answered the type gates before the unknown-key rule, so an unknown key only produced a finding when its value happened to be a **string**. `allowed_tools: [Read, Bash]` — the commonest spelling of that mistake, since the documented key takes a list — was reported by nobody: not here, because the value is not a string, and not by `frontmatter/invalid`, whose schema knows nothing about a key it has never heard of.

The rule does not read the value at all. It is now answered first, and the fixture carries both shapes: a list-valued `allowed_tools` and a string-valued `licence`.

### The skills root is recognised by path, not by name

`skillDirectoryOf` first compared the parent directory's *name* to `skills`, which quietly exempts a skill legitimately called `skills` (`.claude/skills/skills/SKILL.md`). It now tests the parent's whole path, and the fixture holds that skill with a mismatched name so the branch is proven rather than assumed. A `SKILL.md` in the root itself is in the fixture too, producing nothing.

### `--fix` is withheld when it would produce the next finding

`SPEC.md` § 8 says a mismatched name is corrected to the directory's, unconditionally. It is not: when the directory is not kebab-case, applying the fix trades this finding for the kebab-case one. The suggestion is withheld, the finding still reported, and § 8 now says so — the narrowing belongs in the contract that governs `--fix`, not only in a ticket.

### One claim, one finding, and where it shows

`Check.run` returns at most one finding per claim, which forced three decisions that improved the output: a block missing both fields says so on one line; a name that is neither kebab-case nor its directory's is reported once, as the mismatch, because that is the one carrying the fix; and an empty `name` is `name is empty` rather than being folded into "missing", because the key is there and a reader looking for it will find it.

### What the corpus said

Zero findings over 30 real skills, and the zero is not vacuous: **30 names read, 30 matching their directory; 30 descriptions, the shortest 70 characters against a floor of 20; 14 other keys in 8 distinct names, every one of them on the known list.** The 31st skill source is `colinhacks/zod`'s unparseable block, which this check leaves to `frontmatter/invalid` — the division from ticket `06`, visible on a real file.

Two things follow. The description-length rule has a 50-character margin against the corpus's shortest description, so it is the rule least likely to earn its keep, and it is also the only one of the five that is an opinion rather than arithmetic. And the corpus **cannot adjudicate ADR-0011**: with no near-miss in it, the wide rule and the narrow one both produce zero. `CLASSIFICATION.md` § "Eleventh round" says so.

### `fixable` is no longer structurally zero

This check ships the project's first autofixable finding. `corpus-bookkeeping.test.ts` still asserts `fixable: 0` across the corpus and still passes — because the rule never fired, not because it cannot. When a real repo does have a mismatched skill name, that assertion has to become what ADR-0006 condition 2 actually says: zero **false positives** among the fixable findings.

### What else the review changed

- `suggestAnchor` and `suggestKey` shared a shape and two constants; both now go through `nearestUnique`, and `MAX_ANCHOR_DISTANCE` is `MAX_SUGGESTION_DISTANCE` since it is no longer only about anchors.
- The claim factory was duplicated between the two extractors after the *gate* had been shared for exactly that reason. One `frontmatterClaim`, and `text` is the fragment `offset` covers in one place instead of two.
- `meta.problem` was renamed to `meta.subject`, with `'type'` becoming `'key'`. A key claim is emitted for every key and most of them are fine, so `problem` was a lie in the common case; `SkillFact` with `present: true` made it two.
- `ARCHITECTURE.md` § Testing said unit tests were "only for the path extractor and the suggestion scoring". Three tickets have gone past that sentence, so the sentence was the thing that was wrong: it now names what is actually unit-tested and, more usefully, the line — a bug a fixture would not localise.
