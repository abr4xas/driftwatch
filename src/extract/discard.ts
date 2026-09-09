/**
 * The discard rules of the path extractor, in the order given by
 * ARCHITECTURE.md § "Path extraction".
 *
 * This module is where the risk of the whole project concentrates: one false
 * positive costs more than ten false negatives, so when in doubt we discard.
 * Every rule has the concrete false positive it prevents written down, and
 * every one has its case in the `false-positive-traps` fixture.
 */

/** Why a text was discarded. The tests pin each rule by its reason. */
export type DiscardReason =
  | 'url'
  | 'has-spaces'
  | 'glob-or-placeholder'
  | 'bare-word'
  | 'not-a-file'
  | 'bare-directory'
  | 'metasyntactic'
  | 'not-path-shaped'

/**
 * Rule 1. A text with a protocol points outside the repo.
 * Prevents: `https://example.com/docs/guide.md` reported as a missing file.
 */
function isUrl(text: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//iu.test(text) || text.startsWith('//')
}

/**
 * Rule 2. A glob or a placeholder does not name a file, it names a family or a
 * hole the reader is expected to fill in.
 * Prevents: `src/**\/*.test.ts`, `.scratch/<feature>/issues/`, `{{path}}/x.ts`,
 * `$HOME/.config/app.json`, `packages/[name]/src`.
 */
const GLOB_OR_PLACEHOLDER = /[*?{}<>$[\]]/u

/**
 * Rule 3. A single word is not a claim about a path in the repo, not even with
 * a known extension (ADR-0003).
 * Prevents: `index.ts`, `tsconfig.json`, `pnpm`, `build` reported against the
 * root.
 */
function isBareWord(text: string): boolean {
  return !text.includes('/')
}

/**
 * Rule 4. Things with a dot that look like a file and are not.
 * Prevents: `node.js`, `next.js`, `vue.js` (technology names), `1.0`, `v2.1`
 * (versions), and a bare `d.ts` (an extension, not a file).
 */
const NOT_FILES = new Set([
  'node.js',
  'nodejs',
  'next.js',
  'nuxt.js',
  'vue.js',
  'nest.js',
  'three.js',
  'd.ts',
  'package.json#scripts',
])

const VERSION = /^v?\d+(\.\d+)+$/u

/**
 * Names that in technical writing are holes, not things.
 * Prevents: `foo/index.ts` in sst/opencode, where the document says "if the
 * module is `foo/index.ts`" to explain a re-export convention. `foo` is not a
 * directory in the repo, it is the x of a statement.
 *
 * The list keeps the Spanish fillers too: this runs against documents written
 * in any language, and `fulano/` is as much of a hole as `foo/`.
 */
const METASYNTACTIC = new Set(['foo', 'bar', 'baz', 'qux', 'quux', 'fulano', 'ejemplo'])

/**
 * The other placeholder convention: a repeated uppercase letter, which reads as
 * "put the number here".
 * Prevents: `../NNNN/results.md` in colinhacks/zod, where `NNNN` is the issue
 * number. Also `XXXX`, `YYYY`, `NN`, `ID`.
 */
const PLACEHOLDER_UPPERCASE = /^(N{2,}|X{2,}|Y{2,}|Z{2,}|ID|NNN?N?)$/u

/**
 * Filler names with a possessive prefix, which ask the reader to put in their
 * own.
 * Prevents: `perf/memory/src/profile/your_profile.rs` in tursodatabase/turso,
 * which the document asks you to create.
 */
const PLACEHOLDER_POSSESSIVE = /^(your|my|tu|mi|su|myapp|mycompany)[-_]/iu

/**
 * CamelCase placeholders with filler, the other form of "put yours here".
 *
 * Real case (browser-use/browser-use): "any tests specific to an event live in
 * its `tests/ci/test_action_EventNameHere.py` file". `EventNameHere` is a hole,
 * not a file.
 *
 * The three forms were deliberately kept narrow:
 *
 * - `...Here` with an uppercase `H` preceded by a lowercase letter. The
 *   uppercase is required so real words ending in "here" (`sphere`,
 *   `elsewhere`) are left alone.
 * - `Your...` or `My...` followed by another uppercase letter: `YourClassName`.
 * - `XXX` or `Xxx`, the classic hole convention.
 */
const PLACEHOLDER_CAMEL = [
  /[a-z]Here(?![a-z])/u,
  /(?:^|[^A-Za-z])(?:Your|My)[A-Z]/u,
  /(?:XXX|Xxx)(?![a-z])/u,
]

function hasMetasyntacticSegment(text: string): boolean {
  return text
    .split('/')
    .some(
      (segment) =>
        METASYNTACTIC.has(segment.toLowerCase()) ||
        PLACEHOLDER_UPPERCASE.test(segment) ||
        PLACEHOLDER_POSSESSIVE.test(segment) ||
        PLACEHOLDER_CAMEL.some((pattern) => pattern.test(segment)),
    )
}

function isNotAFile(text: string): boolean {
  const last = text.slice(text.lastIndexOf('/') + 1).toLowerCase()
  return NOT_FILES.has(last) || VERSION.test(last) || NOT_FILES.has(text.toLowerCase())
}

/**
 * Rule 5. Normalizes whatever survived the previous rules.
 *
 * Every trim has its reason: a leading `./` is writing noise; a `:12` or
 * `:12:3` suffix is a line reference, not part of the name; leftover backticks
 * show up when someone nests quotes; and trailing punctuation belongs to the
 * sentence, not to the path.
 */
export function normalizePathText(text: string): string {
  let out = text.trim()
  out = out.replaceAll('`', '')
  out = out.replace(/^\.\//u, '')
  out = out.replace(/:\d+(:\d+)?$/u, '')
  out = out.replace(/[.,;:)\]]+$/u, '')
  return out
}

/**
 * Rule 6. A fragment with spaces inside inline code is, almost always, a whole
 * command and not a path.
 * Prevents: `node scripts/sync.mjs`, `pnpm test test/e2e/app/x.test.ts`,
 * `prisma/ignite docs/drive/`, which a naive extractor reads as a single path
 * because they end in a known extension.
 *
 * The cost is not verifying a path that really does have a space in its name.
 * That is why the rule does **not** apply to link targets, where the text is a
 * URL by construction and cannot be a command.
 */
function hasSpaces(text: string): boolean {
  return /\s/u.test(text.trim())
}

/**
 * Rule 7. A single-segment directory does not pin down a location.
 * Prevents: `feat/` and `fix/` (branch prefixes), `embeddings/` and
 * `security/` (test categories), `ppr/` (a mode), `partners/` (a package that
 * lives deeper). It is the natural extension of ADR-0003 to directories; see
 * ADR-0004.
 */
function isBareDirectory(text: string): boolean {
  if (!text.endsWith('/')) return false
  return !text.slice(0, -1).includes('/')
}

export type DiscardOptions = {
  /** Whether the text could be a command. False for link targets. */
  couldBeCommand: boolean
}

/**
 * The discard rules applied to the raw text. Normalization comes afterwards, so
 * that a trim cannot turn something already discarded into a path.
 */
export function discardReason(
  text: string,
  options: DiscardOptions = { couldBeCommand: true },
): DiscardReason | undefined {
  if (text.length === 0) return 'not-path-shaped'
  if (isUrl(text)) return 'url'
  if (options.couldBeCommand && hasSpaces(text)) return 'has-spaces'
  if (GLOB_OR_PLACEHOLDER.test(text)) return 'glob-or-placeholder'
  if (isBareWord(text)) return 'bare-word'
  if (isNotAFile(text)) return 'not-a-file'
  if (isBareDirectory(text)) return 'bare-directory'
  if (hasMetasyntacticSegment(text)) return 'metasyntactic'
  return undefined
}
