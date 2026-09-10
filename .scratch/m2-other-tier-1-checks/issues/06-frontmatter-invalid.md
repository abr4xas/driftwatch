# 06: `frontmatter/invalid`

**What to build:** the check that reports a frontmatter block whose YAML does not parse, and a known field holding the wrong type.

**Blocked by:** `04` (ignores)

**Status:** done

`docs/spec/SPEC.md` § 3 defines it in one line: "frontmatter YAML that does not parse, or fields with the wrong type". Those are two checks wearing one id, and they carry very different risk. The parse half is a fact — the file either is YAML or it is not. The type half needs a **schema**, and a schema we get wrong reports a field that every real consumer accepts.

So the type half is deliberately tiny, and the reason each key is in the table is written next to it.

## The two halves

### The block does not parse

- [x] One finding per source, at the position the YAML parser reports, not at the top of the block.
- [x] Message: `invalid YAML: <reason>`, the parser's own reason. `Map keys must be unique` and `Tabs are not allowed as indentation` say more than any wording of ours.
- [x] A duplicate key comes for free: `yaml` treats it as an error, and one of the two values is silently lost — which is exactly the class of drift this tool exists to name.

### A known field holds the wrong type

- [x] A **curated table**, keyed by `SourceKind`, of top-level keys whose type the format fixes. Nothing else is claimed.
- [x] Message: `expected a string, found a list`. The quoted text is the **key**, because that is what the reader looks for in the block.
- [x] No suggestion, and **never `fixable`**. ADR-0006's floor is zero false positives among the fixable findings, and quoting somebody's value is an edit `--fix` (M3) can decide on with the corpus in hand.

## The table, and what is kept out of it

| kind | key | accepts | why it is safe |
|---|---|---|---|
| `skill` | `name`, `description` | string | The two required fields of the format |
| `skill` | `allowed-tools` | string, list | Both spellings are documented |
| `subagent` | `name`, `description`, `model` | string | |
| `subagent` | `tools` | string, list | |
| `command` | `description`, `model` | string | |
| `command` | `allowed-tools` | string, list | |
| `command` | `disable-model-invocation` | boolean | |
| `cursor-rule` | `description` | string | |
| `cursor-rule` | `globs` | string, list | |
| `cursor-rule` | `alwaysApply` | boolean | |

- [x] `claude-md`, `agents-md`, `copilot` and `configured` have **no typed keys**. No format defines a frontmatter for a `CLAUDE.md`, so anything in it is the author's own and its type is not ours to judge. The parse half still applies to them: invalid YAML is invalid whoever wrote it.
- [x] **`argument-hint` is kept out on purpose.** `argument-hint: [issue-number]` parses as a list, and writing the placeholder in brackets is the established idiom across the ecosystem. Claiming it would report a convention, which is the definition of a false positive here.
- [x] Unknown keys are never reported. That rule exists, it is a skill rule, and it belongs to ticket `07`.

## What it never reports

Each of these is a false-positive class with a fixture case.

- [x] **A block that is not frontmatter.** `parse/frontmatter.ts` slices any leading `---` block, and a document whose first line is a thematic break gives one that holds prose. So the block is only claimed when its first non-blank line is **key-shaped** (`^[A-Za-z_][\w.-]*:(\s|$)`). Prose that happens not to parse is silence.
- [x] **A block carrying a template placeholder** (`{{`, `{%`, `${`, `<%`). A skill template is not a skill: `description: {{DESCRIPTION}}` parses as a mapping and would be reported as a wrong type on a file nobody ships. Same reasoning the path extractor already applies to placeholders.
- [x] **An empty value.** `description:` with nothing after it is `null`, and "missing" is not "wrongly typed". It is `skill/frontmatter`'s finding, and reporting it here would double it.
- [x] **A YAML 1.1 boolean spelled as a word.** `alwaysApply: yes` is the string `yes` under YAML 1.2 core, which is what `yaml` implements, and a boolean under the 1.1 parsers half the ecosystem still uses. A boolean field accepts `true/false/yes/no/on/off` as strings for that reason: we cannot tell whose parser the author had in mind, and the permissive direction is the only one that cannot report a file that works.
- [x] **A nested key.** Only top-level pairs are claimed. `metadata.name` is somebody else's schema.

## The division with `skill/frontmatter`

Ticket `07` owns **structure**: a missing `name`, a `name` that does not match its directory, a `description` under 20 characters, an unknown key. This check owns **types**. One block produces one finding per problem and never two for the same one, so `07` skips a field whose type this check already reported — a `description` that is a list has no length to be too short.

## Where the pieces go

- `src/parse/frontmatter.ts` **changes**: from `parse` to `parseDocument`, which is the same dependency and gives what both halves need — the errors with their offsets, and the top-level pairs with the **exact range of each key token**. The existing `values` (the path claims) keep their text-search positions: they work, and most of them are nested.
- `src/extract/frontmatter.ts` — the `frontmatter` claims. `ClaimKind` already has `'frontmatter'`; do not add it. The extractor stays **schema-free**: it emits one claim per top-level key with the observed type in `meta`, and the table lives with the check.
- `src/verify/checks/frontmatter-invalid.ts` plus its entry in `CHECKS`.
- `docs/spec/ARCHITECTURE.md` § Layout lists eight check files and SPEC defines nine: `frontmatter-invalid.ts` is missing from the tree. Add it there.

- [x] Reading `claim.meta` goes through a **guard exported next to the extractor**, the way `splitAnchor` is, so the check never casts.
- [x] No new I/O: everything this check needs is in the source's own bytes. `CheckContext` does not grow.

## Tests

- [x] Fixture `frontmatter`: a broken block, a duplicate key, a wrong type in each of the four kinds that have a table, and a case for every never-report class above.
- [x] The `false-positive-traps` fixture gains the prose-block-that-looks-like-frontmatter case and stays at zero.
- [x] Unit tests for `parseFrontmatter`: the error offset points inside the block, the key ranges are exact, and the existing eleven tests keep passing after the move to `parseDocument`.

## Corpus

Owed before and after. This one has real surface: every corpus repo full of `.claude/` files has frontmatter, and the parse half applies to all eight source kinds. Every new finding is classified by hand in `CLASSIFICATION.md` and the nine ADR-0006 conditions are re-checked **aggregate** — `spec.md` § "The obligation nobody should skip".

If the table produces a finding on a file that works, the key comes out of the table and the reason is written down.

## Out of scope

- The five structural rules of `skill/frontmatter` (ticket `07`).
- Unknown-key detection, for any kind.
- Validating the *content* of a field (a `model` that is not a real model name, a `globs` that matches nothing). It needs a list we would have to keep current, and a stale list is drift in the tool itself.
- `--fix`, which is M3.

## Comments

Closed 2026-09-10. 14 new tests, 344 in the suite. Corpus run in full: **49 repos, 177 sources, 15 -> 16 findings, one snapshot changed.**

### The one snapshot that moved is a true positive

`colinhacks/zod`, `.claude/skills/security-advisory/SKILL.md:3`: an unquoted `description` holding `: ` mid-sentence, which is not valid YAML in any spec-compliant parser. **The frontmatter of that skill does not load**, and the description that decides whether the skill is ever invoked is read by nothing. The document looks entirely normal; the failure is silent.

It is also the first out-of-sample true positive from a check other than `path/missing` — the evidence ticket `05` said `link/broken` was missing. `CLASSIFICATION.md` § "Tenth round" has the classification and the numbers.

### The type half found nothing, and that had to be shown not to be vacuous

Measured over the corpus's discovered sources: **33** of 177 sources carry a leading block, **32** parse, **80** top-level key claims come out of them, and **65** of those hit a key the table types. Zero findings. The table was consulted 65 times against fields other people wrote and agreed every time.

The two prose gates are **unproven rather than unused**: no corpus source has a leading `---` block that is not frontmatter, and none is a template. They exist for the classes the fixture demonstrates.

### What the corpus was not allowed to change

It showed two things about the table, and neither was acted on:

- `disable-model-invocation` and `license` appear on real skills (7 and 6 times); the table types the first only for `command`.
- `argument-hint` is always **quoted** in the corpus, so the key's exclusion cost no detection there.

The files carrying them include `alpinejs/alpine`, which is in the validation group, so deriving a rule from their contents would burn the repo under ADR-0006 condition 9 and owe a replacement. The table was written from the documented formats before the corpus was read and it stays that way.

### Two things the implementation ran into

**`yaml` reaches for `process.emitWarning` on its own.** A block holding `name: {{value}}` printed `Warning: Keys with collection values will be stringified` over the report, from inside `toJS()`. `logLevel: 'silent'` on `parseDocument` stops it, and `doc.errors` is still collected — verified, because silencing the thing that reports the errors would have made the check vacuous.

**A parse error's offset can land on the newline.** The parser reports an unterminated construct at the end of the line it started on, which is the `\n` itself, and quoting that offset literally gives the empty line after it. `lineAt` walks back one character.

### The claim model, and why the parse half claims a line

`Claim.text` is a fragment everywhere else. For a parse error there is no fragment: the claim is the block, and the parser's own offset is often a single character. So the claim is the **line the parser stopped on** — found from the parser's offset, spanning the whole line. It reads as `3  name: y  invalid YAML: Map keys must be unique`.

The first version kept the parser's exact column and let `text` be the line anyway, which broke the one invariant `core/types.ts` states about the pair: `text` is the fragment `offset` covers. Caught in review. The column is what was given up — the pretty reporter never printed one, and nothing in this check is `fixable`, so no `--fix` will act on that offset either.

### The escape hatch is `-ignore-file` and only that

The directives are read from mdast `html` nodes, and a comment inside the YAML block is not one. So `<!-- driftwatch-ignore -->` and `-next-line` cannot reach a frontmatter finding: the file form is the only one that does. The `ignores` fixture now carries the case so the limitation is recorded as behaviour rather than discovered by a user.

### Lint

No errors. Warnings stay at **11** — `parseFrontmatter` crossed the 50-line limit on the way and the values loop was split out into `collectValues`, which is where it belonged anyway.

### What the two-axis review changed

Five corrections, all applied:

- **The parse claim spans its line** rather than the parser's token, so `text` is the fragment `offset` covers. Above.
- **A wrong-type case for `cursor-rule`** was missing from the fixture: three of the four kinds with a table fired, the fourth never did, and the corpus fired the type half zero times — so that row of the table was covered by nothing. `alwaysApply: sometimes` covers it, and doubles as the boundary of the boolean-word concession.
- **`FrontmatterType` was enumerated three times** — the producer, the guard, the message names. The union is now derived from one tuple and the guard reads it, so the two that can silently fall behind cannot.
- **Names**: `ARTICLES` held noun phrases, `Accepted` did not say accepted what. `TYPE_NAMES` and `AcceptedTypes`.
- **`{ key, type, scalar }` was declared twice**, once in `FrontmatterKey` and once in the fact. One `FrontmatterField`, intersected where the offset is needed.

And three deviations from the ticket that were kept, with the reason:

- **The key-shaped gate skips leading `#` comments.** The ticket said "first non-blank line"; a YAML comment before the first key is YAML, and the block is still only claimed when a key-shaped line follows. Tested both ways.
- **The placeholder gate covers the parse half too**, not only the type half the ticket motivated it with. A template is not a document: neither the shape of its fields nor whether its YAML parses says anything about a repo, and a half-substituted `{{...}}` failing to parse is the expected state of a template rather than drift.
- **`ARCHITECTURE.md` gained a § "Frontmatter validation"** beyond the one-line tree entry the ticket asked for. It follows the document's own pattern — `link/broken` has § "Anchor resolution" — and the three refusals are the kind of decision `docs/spec/` is the primary source for.