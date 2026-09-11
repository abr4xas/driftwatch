# 01: What `--fix` is allowed to overwrite

**What to build:** a fix range per fixable finding, separate from the claim's range, so that applying a suggestion replaces the bytes it was written to replace and nothing else.

**Blocked by:** nothing.

**Status:** done

`core/types.ts` says `Claim.offset` "enables --fix without reformatting". That is true for one of the three autofixes and false for the other two, and the falseness is silent: the code compiles, the offsets are valid, and the file comes out corrupted.

## The three cases, verified against the code

- **`path/missing`** — `extract/paths.ts` pushes the claim with the span of the fragment as written. For an inline-code or frontmatter claim the offset is the path and the suggestion replaces it cleanly. For a **link** claim the offset "still points at the full url, anchor included" (`paths.ts:213`) while the suggestion is a bare repo-relative path: writing it over the url silently deletes `#section`.
- **`script/missing`** — the claim spans the whole command and `suggestScript` returns the whole corrected command, deliberately (`ScriptFact.nameOffset`'s comment says why). Range and suggestion already agree. Do not "improve" this into a token-level edit; the reason it is whole-command is that the alternative is a second parser drifting from the first.
- **`skill/frontmatter`** — the claim spans the **key** token. `parse/frontmatter.ts:31` records it that way on purpose, because that is what a finding quotes. The value's offset exists on `FrontmatterValue` (`parse/frontmatter.ts:134`) and the claim does not carry it. Replacing the claim's range with `my-skill` produces `my-skill: wrong-thing`.

## What to decide

- [ ] Where the fix range lives. Two shapes, and the ticket picks one rather than leaving it to the implementer:
  - on `Suggestion`, as an optional `range: [number, number]` the producer fills in when it differs from the claim's;
  - or on `ClaimFact`, as a value span the frontmatter extractor records and the check reads.
  The first keeps the knowledge next to the `fixable: true` that makes it matter, and means one type grew rather than two. Take it unless implementing shows otherwise, and say so in the comments either way.
- [ ] **A fixable suggestion with no range falls back to the claim's offset.** That keeps `path/missing`'s inline-code case and `script/missing` untouched, and it is the case the fixture must cover twice over.

## What has to change

- [ ] `skill/frontmatter`'s `name` fix carries the **value's** span. That means the frontmatter claim has to carry it: the extractor has it (`FrontmatterValue.offset`) and drops it on the floor at `extract/frontmatter.ts`. Add it to the `key` variant of `FrontmatterFact`, which is already a discriminated union built for exactly this ("producer and consumer used to agree on a `subject` string through three hand-written revalidators, and the compiler does it").
- [ ] A **link** claim's path fix either carries the span of the url's path half, or is refused. Refusing is defensible — a broken link with an anchor is rare and the anchor half is a second claim — but it has to be a decision with a comment, not an omission. Preferred: carry the span, since `splitAnchor` already exists and knows where the `#` is.
- [ ] **The author's spelling survives what the suggestion does not carry.** `normalizePathText` strips a leading `./` before the index ever sees the path, so a document that writes `./src/cli.ts` gets back `src/helpers/cli.ts` and loses the prefix it was consistent about. Re-apply the prefix from `Claim.raw` when the raw one had it. Same question for a trailing slash on a directory claim.

## Tests

- [ ] Unit: for each of the three fixable producers, the range that comes out, asserted as the exact substring of the source it covers. That assertion — `content.slice(...) === 'the thing it should replace'` — is the whole ticket in one line.
- [ ] A frontmatter `name` fix whose key and value have different lengths, so an off-by-one in either direction breaks it.
- [ ] A link claim with an anchor, asserting the anchor survives or the fix is withheld, whichever `02` above decided.
- [ ] A `./`-prefixed path, asserting the prefix survives.

## Out of scope

- Applying anything. This ticket only says what may be replaced; `02` replaces it.
- Making any new check fixable.

## Comments

Closed. 13 new tests (12 in `test/fix-range.test.ts`, one in `frontmatter.test.ts`), 458 in the suite.

### The range lives in a module, not on `Suggestion`

The ticket offered two shapes and asked for a third to be justified if taken. A third was taken: `src/fix/range.ts`, one function, `fixEditFor(finding) -> FixEdit | undefined`.

Both offered shapes spread the same question — *what does this suggestion replace* — across the three producers, and two of them do not have the claim in hand when they build the suggestion (`suggestPath` receives an index and a string). The module is the same move the repo already made twice: `verify/path-claim.ts` owns the verdict on a path claim, and this owns the verdict on what an autofix may overwrite. It also means the answer is one file to read before trusting `--fix`.

`Suggestion` is unchanged, so the reporter and the JSON contract M4 will define are untouched by this ticket.

### The `./` prefix survives by construction, not by re-application

The ticket asked to "re-apply the prefix from `Claim.raw` when the raw one had it". The implementation does better and the difference is worth recording: the range is the claim's **normalized text located inside what the author wrote**, so the prefix, a trailing `:42` line reference and a link's `#anchor` are all outside the replacement. Nothing is re-applied, because nothing was consumed. One rule covers the three cases the ticket listed separately.

The refusals it implies are the safe direction: the text not being found inside the raw span (a backtick inside, a percent-encoded url) or being found twice both mean no edit.

### A nested source is refused, and that is a real cost

`rewritten()` accepts a path written from the repo root (`/src/cli.ts`) anywhere, and any path in a source **at** the root. A relative path in a nested source is refused.

The reason is the largest precision correction in the project, recorded in `verify/path-claim.ts`: a nested document writes half its paths against its own directory and half against the repo root, with no syntactic signal separating them. Reporting can accept both readings, because accepting both only costs detections. Writing cannot — picking one convention rewrites the path into the other one.

This is a false negative with a number attached, and ticket `07` is where it gets one: if the corpus's fixable findings are mostly in nested sources, the refusal is too wide and the ticket will say so with evidence. The test asserts the finding is still reported and its suggestion still `fixable`; what is withheld is the write.

### The guard that would have caught the corruption

Every branch checks the bytes before it replaces them: the path and script cases assert the span still holds `claim.raw`, and the frontmatter case asserts the value token — quotes stripped — is the scalar the check reasoned about. An offset that has drifted from the content produces `undefined`, never an edit.

The `skill/frontmatter` case is the one the ticket was written for. Its claim covers `name`, so an edit inheriting the claim's range would write `my-skill: other-name`. `FrontmatterKey` now carries `valueOffset` from the YAML parser — `range[1]` and not `range[2]`, since the third bound runs past the value to the end of the node — and the test asserts the covered text is `other-name` and never `name`.

Quoting survives: `name: "other-name"` is corrected to `name: "my-skill"`. Rewriting it unquoted would be a reformat of somebody's YAML.

### `script/missing` needed nothing, as predicted

Claim and suggestion already line up on the whole command. The only thing added was the byte guard. The ticket's instruction not to "improve" it into a token-level edit was followed.
