# 07: Basename suggestions with confidence scoring

**What to build:** when a path is broken, the tool does not just say so: it proposes the likely target. The output goes from `path does not exist` to `path does not exist  → src/auth/index.ts?`, and every suggestion carries a confidence that will later decide what `--fix` may touch.

**Blocked by:** 05

**Status:** done, with two gaps noted

- [x] The candidate search starts from `byBasename`; the fuzzy comparison only runs over the candidates for that basename
- [x] The scoring follows `docs/spec/ARCHITECTURE.md`: 1.0 with a single candidate and a similar parent directory, 0.6 with a single candidate in a different directory, 0.3 with several candidates
- [x] With several candidates the problem is reported but the suggestion is marked not autofixable
- [x] `suggestion` appears in the `Finding` model with `value`, `confidence` and `fixable`, even though `--fix` is M3
- [x] The suggestion renders in `dim` and does not break the column alignment of the `pretty` output
- [x] There are unit tests for the scoring, which alongside the path extractor is the only thing `docs/spec/ARCHITECTURE.md` § Testing asks to cover at that level

## Comments

Real output of the `suggestions` fixture, which covers the three confidence levels:

```
CLAUDE.md
  ✗ 3  src/lib/auth.ts   path does not exist  → src/auth/auth.ts?
  ✗ 5  src/seed.ts       path does not exist  → scripts/db/seed.ts?
  ✗ 7  src/util/date.ts  path does not exist  → packages/a/date.ts?

1 file · 3 problems (3 errors) · 27ms
1 fixable with --fix
```

**Directory similarity is measured by shared segments, not by edit distance.** Moving a file from `src/lib` to `src/auth` preserves a segment, and that is the signal that matters; strings looking alike letter by letter says nothing useful about a file move. Edit distance is used, but in `script/missing` (M2), where what gets compared are script names.

## Two gaps, noted instead of papered over

1. **A missing directory never gets a suggestion.** `byBasename` indexes files, not directories, so `` `public/images/` `` is reported with no candidate. Closing it means changing the `RepoIndex` contract, which is not what this ticket asked for. It is a decision for M3, when `--fix` defines what it really needs.

2. **The `BRIEF.md` example is not reachable by basename search.** The brief shows `src/lib/auth.ts → src/auth/index.ts?`, which is a rename *plus* a move: the basename changes from `auth.ts` to `index.ts`, so `byBasename` never finds it. `ARCHITECTURE.md` explicitly prescribes basename search, and extending it to "an `index.*` inside a directory named after the old file" is a new heuristic with its own risk of a wrong suggestion, which `--fix` would then apply with high confidence. I did not invent it. It stands as an observation: the brief's example is illustrative, not a case the current implementation produces.

### Later note, on closing ticket 09

This ticket's scoring had a precision problem the monorepo fixture uncovered. `parentSimilarity` measured segment overlap as a set, and that gave 0.667 for `packages/web/src` against `packages/api/src`, so the suggestion came out with confidence 1 and `fixable: true`. `--fix` would have rewritten one package's document to point at another package's file.

It was changed to common prefix: how far the two directories agree before diverging. The three cases in the `suggestions` fixture give the same as before; the monorepo case drops to 0.333 and the suggestion stops being fixable.
