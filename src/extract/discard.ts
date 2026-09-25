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
  | 'absolute-path'
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
 * Rule 1b. Prose drops the scheme, and the host is still not a location.
 *
 * Half the time a document writes `linkedin.com/in/` or `nextjs.org/docs/messages/`
 * rather than spelling out `https://`. Rule 1 does not see those, so they reach
 * `path/missing` and are reported as files this repository is missing. It is the
 * same class rule 1 exists for, arriving with the scheme left off.
 *
 * Found by tabulating the named false-positive classes over the discovery
 * corpus (ticket `37`): the same shape came back under three different class
 * names — `foreign-project` for `nextjs.org/docs/messages/`, `placeholder` for
 * `teams.microsoft.com/l/message/`, `third-party-convention` for `claude.ai/code/`.
 * A frequency scan over the corpus's 32 988 `path/missing` findings then put it
 * at **33 findings in 21 repositories, 23 distinct texts**, every one of them a
 * host, read by hand.
 *
 * Two things make the rule narrow enough to be safe, and both are measured.
 *
 * **The TLD list holds no file extension.** `md`, `sh`, `py`, `rs` and `go`
 * are excluded because a rule must not be the thing that decides whether
 * `docs.md/` is a directory.
 *
 * `io`, `dev`, `ai`, `app` and `co` were excluded in the first pass, on the
 * argument that they are real TLDs and also ordinary words people name
 * directories after, and on the condition that measurement rather than
 * intuition would decide. Ticket `39` measured: **222** discarded candidates
 * carry them and **0** resolve, against **one** real first segment in 12 439 —
 * `forecast.io`. Fourteen findings in nine repositories against one possible
 * missed claim is the trade `AGENTS.md` § "The rule that orders every
 * decision" takes every time, so they are in.
 *
 * **The match is case-sensitive**, which is not fussiness. Over 12 439 distinct
 * first path segments in 2599 repositories, a case-insensitive version matches
 * two and one of them is `GameOfLife3D.NET` — a .NET project, not a host.
 * Lowercase-only matches **one**: `my.sheerid.com/`, a scrape whose filenames
 * still carry `%3Flocale=en-US`.
 *
 * The cost, measured the way the `@` clause of `isSpecifier` measured its own:
 * of 1 352 382 discarded candidates, **284 have this shape and none of them
 * resolves to anything**. The `@` rule shipped at three resolving in 17 607.
 *
 * Like rule 1, this is the extractor being told about a syntax, not a guess
 * about likelihood.
 */
const HOST =
  /^[a-z0-9][a-z0-9-]*(\.[a-z0-9-]+)*\.(com|org|net|gov|edu|xyz|cloud|tech|info|biz|io|dev|ai|app|co)\//u

function isSchemelessHost(text: string): boolean {
  return HOST.test(text)
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
 * A leading `@` is the third, and it covers two things that are one thing.
 * `@n8n/typeorm/`, `@rails/request.js`, `@blackbelt-technology/…` are npm
 * **scoped packages**; `@/engine/`, `@/components/ui/`, `@/api/` are the
 * **path alias** a `tsconfig.json` `paths` entry or a Vite `resolve.alias`
 * maps onto `src/`. Both are names a resolver turns into a location, which is
 * what every other entry in this function is, and neither is a location.
 *
 * Both were found in the discovery corpus and neither has ever appeared in the
 * certification corpus: 128 distinct texts across 69 repositories, and the
 * alias half is the larger — `@/engine/` alone is 44 findings.
 *
 * What it costs is two things, both measured rather than assumed.
 *
 * A directory literally named `@something`: **one repository in 2599** has a
 * top-level entry starting with `@`, and of 17 607 discarded candidates
 * beginning with one, **three** resolve to anything.
 *
 * And Claude Code's `@./file` import, which *is* a path claim wearing a
 * sigil — `@../AGENTS.md` means read that file, and a missing one is drift.
 * The rule cannot see it and the honest count is **5 candidates in 1 352 382
 * discards**, none of which resolves even with the `@` stripped. Narrowing the
 * rule to strip the sigil instead is a code path for five strings, so the cost
 * is written here rather than built around. If that syntax becomes common this
 * paragraph is where to start.
 *
 * The alias case is worth stating separately because the tool could not answer
 * it even if it tried: resolving `@/engine/` means reading `tsconfig.json`'s
 * `paths`, and a claim we cannot resolve is not a claim we may report broken.
 *
 * None of these is a heuristic about likelihood. All three are the extractor
 * being told about a syntax it did not know.
 */
const SCHEME = /^[a-z][a-z\d+.-]*:/u

function isSpecifier(text: string): boolean {
  return text.startsWith('#') || text.startsWith('@') || SCHEME.test(text)
}

/**
 * A text opening with a drive letter is on **the reader's machine** too.
 *
 * `D:/Projects/pjmagee/multi-stream-viewer/.claude/gsd-core/references/ai-evals.md`,
 * `G:/Claude/`, `F:/Git-Repositories/Dalamud/VoicePack/`. Same category as
 * `isHomePath`, arriving from Windows: a location on the machine of whoever
 * wrote the document, unverifiable against any repository, and nothing in a
 * repository is named `C:` — a colon is not legal in a Windows path component.
 *
 * Half of this was already covered by accident, which is the reason to write
 * it down rather than leave it. `SCHEME` above is lowercase-only, so
 * `d:/projects` is discarded as a module specifier and `D:/Projects` is not:
 * 41 of the 276 drive-shaped discards arrive through that door and the rest
 * used to arrive as findings.
 *
 * Found in ticket `39`, reading the `foreign-project` class. Cost measured
 * both ways and it is the cleanest of these clauses: **276** discarded
 * candidates carry a drive letter and **0** resolve to anything, and **0** of
 * 12 439 distinct first path segments across 2599 repositories look like one.
 */
function isDrivePath(text: string): boolean {
  return /^[A-Za-z]:[\\/]/u.test(text)
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
 * A text opening with `/` is an **endpoint, a URL, or a machine's filesystem**
 * — and almost never a file in this repository.
 *
 * `resolve.ts` used to read a leading slash as "from the repo root", which is a
 * reading nobody writing the document had in mind. Measured over the 66-repo
 * corpus: **306 claims are written as an absolute path, and 5 of them resolve
 * to anything in the repo.** The other 301 are of three kinds and none is ours:
 *
 * - HTTP routes (BerriAI/litellm): `/v1/responses`, `/embeddings`, `/batches`
 * - site URLs (vercel/next.js): `/docs/app/glossary`, `/docs/app/`
 * - real absolute paths (1amageek/SwiftAgent): `/etc/`, `/tmp/../etc/`
 *
 * Same category as `isHomePath` and the same argument: this is the extractor
 * being told about a syntax it was misreading, not a guess about likelihood. In
 * Markdown a leading slash is a root-relative **URL**, which is what `](/x)`
 * means everywhere it is rendered; in prose it is an absolute path on somebody's
 * disk. Neither can be checked against a repo index.
 *
 * What it costs is those 5 — a document that writes `/src/index.ts` meaning the
 * repo root and is right. They stop being verified rather than start being
 * reported, so the cost is a false negative, 1.6% of the absolute paths the
 * corpus contains.
 */
function isAbsolutePath(text: string): boolean {
  // `//host/x` is rule 1's protocol-relative URL, and it stays rule 1's: the
  // reason a text was discarded is what the tests and the report pin.
  return text.startsWith('/') && !text.startsWith('//')
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

/**
 * `path/to/…`, the metasyntactic path.
 *
 * It is a **sequence**, not a word, which is why it cannot join
 * `METASYNTACTIC`: that set is tested one segment at a time, and `path` and
 * `to` are both ordinary directory names on their own — `src/path/resolve.ts`,
 * `lib/to/index.ts`. Only adjacent do they stop naming anything.
 *
 * Real case (`withastro/astro`), in a template for the review output a skill
 * should produce:
 *
 *     `[medium][requirements]` `path/to/file.ts:87` - Short title. Explain the
 *     unmet requirement, impact, and minimal remediation direction.
 *
 * Matched at any position rather than only at the front, because a document
 * writes `some/path/to/thing` as readily as `path/to/thing`, and case-
 * insensitively because prose capitalises it.
 */
function hasMetasyntacticPath(text: string): boolean {
  const segments = text.toLowerCase().split('/')
  return segments.some((segment, i) => segment === 'path' && segments[i + 1] === 'to')
}

function hasMetasyntacticSegment(text: string): boolean {
  return hasMetasyntacticPath(text) || text.split('/').some(isPlaceholderName)
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
 * An ellipsis in the middle of a path is the writer abbreviating it.
 *
 * `core/.../sql/parser/`, `datagsm-common/src/main/kotlin/.../domain/`,
 * `src/main/resources/META-INF/native-image/…/proxy-config.json`. Both
 * spellings occur, three dots and U+2026, and neither names a directory.
 * `GLOB_OR_PLACEHOLDER` does not see them because there is no sigil and no
 * bracket: the hole is punched with punctuation that is legal in a filename.
 *
 * **The position is the rule and the care is all in it.** A text *ending* in
 * `...` — `steps-c/...`, `.claude/skills/...` — normalises to its parent,
 * which usually exists: 91 such candidates come back `exists: true`. They are
 * already discarded by other rules and are not findings, but a rule written as
 * "contains an ellipsis" would look identical and be resting on that
 * normalisation. So the segment has to be an interior one, or the ellipsis has
 * to be the unicode character, which never appears in a real path at all.
 *
 * Ticket `40`, reading the `placeholder` class. 104 findings in 35
 * repositories, and the cost is zero twice over: **0** of **1 858 219**
 * distinct path segments across 2599 repositories is `...` or contains `…`,
 * and of 1946 discarded candidates carrying the shape, **0** resolve.
 */
function hasInteriorEllipsis(text: string): boolean {
  if (text.includes('\u2026')) return true
  const segments = text.split('/')
  return segments.slice(0, -1).includes('...')
}

/**
 * A SCREAMING_SNAKE name ending in `_DIR` is a variable with its sigil left off.
 *
 * `SKILL_DIR/wiki/`, `SCRIPT_DIR/`, `EXP_ROOT/user_workload.yaml`,
 * `FEATURE_DIR/checklists/requirements.md`, `SPECIFY_FEATURE_DIRECTORY/spec.md`.
 * Written `$SKILL_DIR` it is caught by `GLOB_OR_PLACEHOLDER`; written bare it
 * reaches `path/missing` as a directory this repository is missing.
 *
 * **The suffix is a narrowing chosen on evidence rather than on nerves.** Any
 * SCREAMING_SNAKE first segment would take 165 findings in 23 repositories and
 * cost five real first segments in 12 439 — `FIX_BLOCCANTI`, `JSU_V2`,
 * `README_IMAGES`, `UPSTREAM_WORKFLOWS_DISABLED`, `ZION_OS` — and one of those
 * is live, `Yose144/Zion-v3.0.0` naming `ZION_OS/dashboard/app.py`, which
 * resolves. Requiring the directory-shaped suffix keeps **157 of the 165** in
 * 21 repositories and costs **0** of 12 439, with **0** of 50 discarded
 * candidates resolving. It gives up three texts, and eight findings for five
 * real directories is the trade this project takes every time.
 */
const DIRECTORY_VARIABLE = /^[A-Z][A-Z0-9_]*_(DIR|DIRECTORY|ROOT|PATH|HOME|FOLDER)\//u

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
  if (isUrl(text) || isSchemelessHost(text)) return 'url'
  if (hasInteriorEllipsis(text) || DIRECTORY_VARIABLE.test(text)) return 'metasyntactic'
  if (isSpecifier(text)) return 'module-specifier'
  if (isHomePath(text) || isDrivePath(text)) return 'home-path'
  if (isAbsolutePath(text)) return 'absolute-path'
  if (options.couldBeCommand && hasSpaces(text)) return 'has-spaces'
  if (GLOB_OR_PLACEHOLDER.test(text)) return 'glob-or-placeholder'
  if (isBareWord(text)) return 'bare-word'
  if (isNotAFile(text)) return 'not-a-file'
  if (isBareDirectory(text)) return 'bare-directory'
  if (hasMetasyntacticSegment(text)) return 'metasyntactic'
  return undefined
}
