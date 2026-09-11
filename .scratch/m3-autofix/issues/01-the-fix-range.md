# 01: What `--fix` is allowed to overwrite

**What to build:** a fix range per fixable finding, separate from the claim's range, so that applying a suggestion replaces the bytes it was written to replace and nothing else.

**Blocked by:** nothing.

**Status:** ready-for-agent

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
