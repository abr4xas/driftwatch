# 04: `--format sarif`

**What to build:** a SARIF 2.1.0 document for upload to GitHub Code Scanning.

**Blocked by:** 01.

**Status:** done

## What has to change

- [ ] `src/report/sarif.ts` producing a document with `$schema`, `version: "2.1.0"`, and one `run`:
  - `tool.driver` with `name`, `informationUri`, `semanticVersion` (from `core/version.ts`), and `rules[]`;
  - `results[]` with `ruleId`, `level`, `message.text`, and a `location` carrying `artifactLocation.uri` (relative, with `uriBaseId: "%SRCROOT%"`) and a `region` with `startLine`, `startColumn`, `endLine`, `endColumn`;
  - `originalUriBaseIds` mapping `%SRCROOT%` to the repo root.
- [ ] **`rules[]` is the half that makes an alert readable a month later**, and it is the half that is easy to skip. One rule per check that *ran*, with `id`, `name`, `shortDescription`, `fullDescription` and `helpUri`. The check registry has the ids; the descriptions have to come from somewhere — if `Check` has no description field today, this ticket adds one, because the alternative is a lookup table in the reporter that drifts from the checks.
- [ ] **SARIF's native `fixes`**, under `--fix --dry-run`: `artifactChanges[].replacements[]` with `deletedRegion { charOffset, charLength }` and `insertedContent.text`. This is the same information as `02`'s `fix` field, in the format's own vocabulary. Do not invent a property bag for it.
- [ ] `SPEC.md` § 5's `sarif` paragraph says what is in the document, beyond "SARIF 2.1.0".

## What to decide

- [ ] `level` for a driftwatch warning: SARIF's `warning`. And for an error: `error`. There is no third case today.
- [ ] Whether to emit `partialFingerprints`. Without them, Code Scanning re-fingerprints on line numbers and an alert reappears as new when the file shifts by a line. With them, we own a hashing decision forever. Skip them, and write the sentence saying it was skipped deliberately, so the next person does not rediscover the question.

## Tests

- [ ] The document validates against the SARIF 2.1.0 schema shape the tests assert — required fields present, no extra top-level keys.
- [ ] A run with zero findings is still a valid document, with the tool block and `results: []`. This is the case CI hits most often and the one most likely to be broken.
- [ ] Every `results[].ruleId` has a matching entry in `rules[]`.
- [ ] Under `--fix --dry-run`, the `deletedRegion` offsets slice the same bytes the pretty diff showed.

## Out of scope

- Uploading it anywhere. The workflow that does is next batch.

## Comments

Closed. 7 tests.

`Check` gained `title` and `description`, which is what the ticket preferred over a lookup table in the reporter. Five checks and one synthetic one in `selection.test.ts` were updated; the compiler found all of them.

`helpUri` points at `docs/guide/checks.md`, which ticket `05` then had to write — so the link is real rather than aspirational. The anchor is GitHub's slug for a `## path/missing` heading, which is `#pathmissing`: the same "drop everything that is not a letter or a number" rule `parse/anchors.ts` canonicalises with.

`partialFingerprints` were skipped, with the reasoning in the module header so the question is not rediscovered.
