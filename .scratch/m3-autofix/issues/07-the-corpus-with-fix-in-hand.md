# 07: The corpus with `--fix` in hand

**What to build:** the measurement this milestone is actually accepted on, and the two fixability decisions that were explicitly deferred to it.

**Blocked by:** `06`

**Status:** done

ADR-0006's hard floor is **zero false positives among the `fixable` findings**, with no rate modulating it. Until now that has been measured on **one finding** — the single autofixable finding the 66-repo corpus produces, classified as correct. One observation is not a floor, it is an anecdote that happens to be true.

## The run

- [ ] `pnpm corpus --check` in full, before and after everything `01` changed about ranges. Ticket `01` touches the extractor's neighbourhood, and `AGENTS.md` § Verification names that as a before-and-after trigger.
- [ ] Then, over all 66 repos, collect every finding with `suggestion.fixable === true` **and the exact edit it would apply** — the file, the line, the bytes out, the bytes in. Read every one by hand.
- [ ] **Nothing is ever written to a corpus clone.** `--dry-run` is the only form the corpus sees ([ADR-0007](../../../docs/adr/0007-the-corpus-does-not-run-in-ci.md)). If the harness needs a flag to collect edits without writing, that is what `04` built.
- [ ] Classify the result into `test/corpus/CLASSIFICATION.md` as its own round, in the voice the previous sixteen use: what was measured, what it says, and what it would take to change the reading.

## The number that matters, and the one that does not

The count of autofixable findings across 66 repos is small — it was one. So the useful output of this round is **not** a percentage. It is:

- [ ] For every fixable finding: is the edit the one a maintainer of that repo would have made? Not "is the target file real" — that is the check being right, which is already measured. The question is whether the *rewrite* is right.
- [ ] Whether the edit preserves what the author wrote around it. `./` prefixes, anchors, alignment in a table, quoting in frontmatter. This is where `01`'s decisions get tested against documents nobody wrote for us.
- [ ] If the sample is still too thin to say anything, **say that**, the way the ninth round said `link/broken` was "proven quiet and unproven useful". A milestone closed on one observation that is honestly labelled is worth more than one closed on a percentage computed from it.

## The two deferred decisions

Both were postponed to "M3 with the corpus in hand", in writing. This is the reading, and the expected outcome of both is **no change** — the ticket exists so the deferral gets closed rather than inherited by M4.

- [ ] **`link/broken` anchors.** `fix/suggest.ts` argues at length that they are never fixable, and the argument is structural: every case where the correction is obvious is already accepted by the canonical key and never reported, so what remains is a real typo whose target is a guess. Check it against the corpus's anchor findings — there were none in round nine — and either confirm it with evidence or record that there is still no evidence either way.
- [ ] **`frontmatter/invalid` values.** `checks/frontmatter-invalid.ts:127`: "Quoting somebody's value is an edit `--fix` (M3) decides on with the corpus in hand, not here." The corpus's frontmatter findings are the input. Quoting a value is a reformat of somebody's YAML, which the whole milestone otherwise refuses; expect to leave it unfixable and to say so in the code where the comment currently defers.

## The nine conditions

- [ ] Re-checked aggregate after `01`, not inherited from M2's close. `.scratch/m2-other-tier-1-checks/spec.md` § "The obligation nobody should skip" is the precedent and it applies unchanged.
- [ ] Any repo whose findings are used to change a rule moves from validation to calibration and a replacement is owed (ADR-0006 condition 9). Two replacements are **already** owed from M2's close, for `course-video-manager` and `emdash`; this is the natural moment to pay them.

## Then the milestone closes

- [ ] `pnpm typecheck && pnpm test && pnpm build && node ./dist/cli.js --help`, plus the tool over its own repo and over `docs/`.
- [ ] `docs/spec/ROADMAP.md` § M3 gets its close paragraph, including what did not get delivered and why — the two M2 precedents for that are `--init` and ticket `02`.
- [ ] Report what came out. If the fixable sample is one finding and it is still one finding, that sentence goes in the ROADMAP rather than being rounded up.

## Comments

Closed 2026-09-11. The measurement is round 17 of `test/corpus/CLASSIFICATION.md`; M3 is closed in `docs/spec/ROADMAP.md`.

### The tooling

`pnpm corpus --fixes` is a new mode of `scripts/corpus.ts`. It plans every fix across the 66 repos and prints, per edit, the line before and the line after — the whole line, because a replacement is judged in the sentence it sits in and the fragments are what the snapshots already carry. **It writes nothing to a clone**, which is ADR-0007's rule, and `AGENTS.md` § Verification now names a fifth trigger: after touching `src/fix/` or a suggestion's `fixable` flag, read every edit it prints.

### The result, and what it is worth

`pnpm corpus --check` first: **66 repos · 236 sources · 26 findings, no snapshot moved.** M3 added a value span to the frontmatter parser and a module deciding fix ranges, and moved no detection at all.

Then the edits: **one would be applied across the whole corpus, and none was refused.** `Endle/fireSeqSearch`'s `CLAUDE.md:145` says the query path is `fire_seq_search_server/src/query_engine/semantic_query.rs`; there is no `query_engine/` directory and the file sits directly in `src/`. Verified in the clone. The rewrite is the one a maintainer would make, and it preserves the backticks, the list marker and the label around it.

So the hard floor is met at the level of the **edit** rather than of the finding — on a sample of **one**, which is what this ticket said to report if it came out that way. The fix machinery is proven correct once and unproven at scale. `link/broken` was "proven quiet and unproven useful" in round nine; this is its sibling, and the way to move it is more repositories.

### The nested-source refusal, measured

Zero refusals, because the only fixable finding is in a root `CLAUDE.md`. That is the **absence of evidence that the rule is expensive**, not evidence that it is cheap — a denominator of one measures nothing. Recorded in round 17 so the next round with more fixable findings knows to look there first.

### The two deferred decisions are closed, not inherited

Both stay as they were, now for a reason rather than a deferral, and both code comments were rewritten to say so.

- **`link/broken` anchors.** The corpus holds zero such findings, so it offers no evidence either way. The argument in `fix/suggest.ts` is structural and never rested on the corpus.
- **`frontmatter/invalid` values.** The corpus made it concrete: the only such finding in 66 repos is an unquoted `description:` in `colinhacks/zod` whose text already contains double quotes, so the "obvious" fix — quote the value — requires escaping them, and a `--fix` that escapes is a YAML serializer.

### The conditions, and the debt

Unmoved. No heuristic was touched, no snapshot changed, no repo was burned, so all nine conditions still read as they did after round sixteen. The two replacement validation repos owed since M2's close are **still owed**: this round did not pay them, and saying so is cheaper than pretending the debt is younger than it is.

### Milestone verification

`pnpm typecheck && pnpm test && pnpm build && node ./dist/cli.js --help` all green at **496 tests**, the tool silent over its own repo (4 sources) and over `docs/` (24 sources), and `--fix --dry-run` over this repo reporting `nothing to fix`.
