# 07: The corpus with `--fix` in hand

**What to build:** the measurement this milestone is actually accepted on, and the two fixability decisions that were explicitly deferred to it.

**Blocked by:** `06`

**Status:** ready-for-agent

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
