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
  | 'module-specifier'
  | 'home-path'

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
 * A **specifier**, in one of the two syntaxes that exist to not be a path.
 *
 * `#` opens a Node subpath import or a URL fragment. Real case
 * (vercel-labs/marketing-team-eve-template): "Imports use the `#*` subpath from
 * `package.json` (`#lib/...` maps to `agent/lib/...`)". Subpath imports are
 * declared under `imports` in `package.json` and are *required* to start with
 * `#` precisely so they cannot be confused with a path.
 *
 * A leading `scheme:` is a protocol. `isUrl` above already takes the `://`
 * forms; the ones without slashes are the package-manager protocols. Real case
 * (aptos-labs/aptos-ts-sdk): "`examples/typescript`, `examples/javascript` use
 * a **linked** SDK (`link:../..`)" — three findings from a `package.json`
 * dependency value, and the normalizer made it worse by trimming the trailing
 * dots and reporting `link:../` for text that says `link:../..`. The family is
 * `link:`, `file:`, `workspace:`, `portal:`, `npm:`, `jsr:`, `catalog:`,
 * `patch:`, `git:`, `github:`.
 *
 * The scheme is matched **generally** rather than from a list of protocol
 * names, for the reason [ADR-0011](../../docs/adr/0011-an-unknown-key-is-only-reported-as-a-near-miss.md)
 * gives inverted: a list of somebody else's vocabulary falls behind, and here
 * falling behind can only produce a finding. What a general rule costs instead
 * is a file whose *first* segment holds a colon, which is illegal on Windows
 * and which nobody has on POSIX either. The colon a real path does carry is a
 * `:12` line suffix, and that one comes after a slash — `SCHEME` is anchored,
 * so it cannot reach it.
 *
 * Neither is a heuristic about likelihood. Both are the extractor being told
 * about a syntax it did not know.
 */
const SCHEME = /^[a-z][a-z\d+.-]*:/u

function isSpecifier(text: string): boolean {
  return text.startsWith('#') || SCHEME.test(text)
}

/**
 * A text opening with `~/` is on **the reader's machine**, not in the repo.
 *
 * Real case (mattpocock/course-video-manager): "Read the AI Hero API source at
 * `~/repos/ai/course-builder/apps/ai-hero/src/`". The tilde is the shell's
 * home directory; nothing under it can be verified against a repo index, and
 * nothing in a repo is named `~`.
 *
 * Same category as `isModuleSpecifier`: a syntax the extractor is being told
 * about, not a guess about likelihood.
 */
function isHomePath(text: string): boolean {
  return text === '~' || text.startsWith('~/')
}

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
 * A word with a **trailing capital standing for a number**: the other way
 * documentation writes "put the index here".
 *
 * Real case (saubakirov/KZ-IT-telegram-list), a command that counts iteration
 * folders: "Count `research/iterN/` folders (N = highest folder number + 1, or
 * 1 if none)". Eight findings in one document, from `research/iterN/`,
 * `research/iterN/RES.md` and `research/iterN-1/RES.md` — the last one being
 * the arithmetic form, which is why the suffix is part of the pattern.
 *
 * Narrow on purpose. The word before the capital must be **all lowercase**, so
 * `MyModuleX` and `matrixTranspose` are untouched, and the capital has to be
 * one of the six letters that conventionally stand for a number. What it gives
 * up is a directory genuinely named `moduleX` or `partN`, which a tutorial repo
 * really might have.
 */
const PLACEHOLDER_INDEXED = /^[a-z]+[NMKXYZ]([-+]\d+)?$/u

/**
 * A **version or date template** inside a segment: the placeholder convention
 * for "the one for that release" and "the one for that day".
 *
 * Real cases, three findings across two repos:
 *
 * - garagon/aguara: "confirm links in `product/vX.Y.Z/_index.md`" and "Create
 *   status file - `product/vX.Y.Z/status-YYYY-MM-DD.md` for significant
 *   milestones".
 * - aptos-labs/aptos-ts-sdk: "remind the maintainer to write an upgrade guide
 *   at `upgrade-guides/UPGRADE_GUIDE_X.Y.Z.md`", where the real files are
 *   `UPGRADE_GUIDE_6.0.0.md` and `UPGRADE_GUIDE_7.0.0.md`.
 *
 * `VERSION` above discards a segment that *is* a number (`1.0`, `v2.1`); this
 * discards one that is the **shape** of a number. The letters are required
 * uppercase and in order, so `x.y.z` and a file genuinely called `a.b.c` are
 * untouched, and `YYYY` is a spelling nobody uses for anything else.
 */
const PLACEHOLDER_TEMPLATE = [/(?:^|[^A-Za-z])v?X\.Y(\.Z)?(?![A-Za-z])/u, /YYYY[-_]?MM([-_]?DD)?/u]

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

/**
 * Whether a name is a hole the reader is expected to fill in rather than a
 * name.
 *
 * Exported because `extract/scripts.ts` asks the same question about a script
 * name: `npm run your-script` and `foo/index.ts` are the same convention in two
 * grammars, and a second list of fillers would drift from this one.
 */
export function isPlaceholderName(word: string): boolean {
  return (
    METASYNTACTIC.has(word.toLowerCase()) ||
    PLACEHOLDER_UPPERCASE.test(word) ||
    PLACEHOLDER_INDEXED.test(word) ||
    PLACEHOLDER_TEMPLATE.some((pattern) => pattern.test(word)) ||
    PLACEHOLDER_POSSESSIVE.test(word) ||
    PLACEHOLDER_CAMEL.some((pattern) => pattern.test(word))
  )
}

function hasMetasyntacticSegment(text: string): boolean {
  return text.split('/').some(isPlaceholderName)
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
  if (isSpecifier(text)) return 'module-specifier'
  if (isHomePath(text)) return 'home-path'
  if (options.couldBeCommand && hasSpaces(text)) return 'has-spaces'
  if (GLOB_OR_PLACEHOLDER.test(text)) return 'glob-or-placeholder'
  if (isBareWord(text)) return 'bare-word'
  if (isNotAFile(text)) return 'not-a-file'
  if (isBareDirectory(text)) return 'bare-directory'
  if (hasMetasyntacticSegment(text)) return 'metasyntactic'
  return undefined
}
