/**
 * Script claims: a package manager command whose script the manifest has to
 * offer.
 *
 * This extractor is the only one that parses a **grammar** rather than
 * recognising a shape. `pnpm build` claims that `build` is a script; `pnpm add
 * zod` claims nothing at all, and the difference is one word. So every question
 * below is asked in order and any of them answering "I do not know" produces no
 * claim: which manager, whether a script is being run, and which token is its
 * name.
 */
import type { Claim, ScriptFact, ScriptRunner } from '../core/types.ts'
import type { FenceSpan } from '../parse/markdown.ts'
import { rangeFor } from '../parse/positions.ts'
import { isPlaceholderName } from './discard.ts'
import type { ExtractContext } from './context.ts'

/** Which file answers whether the script exists. */
export type ParsedCommand = Omit<ScriptFact, 'subject'>

/** A token of a command line, with where it sits in the segment. */
type Token = { value: string; at: number }

function tokenize(segment: string): Token[] {
  const tokens: Token[] = []
  for (const match of segment.matchAll(/\S+/gu)) {
    tokens.push({ value: match[0], at: match.index })
  }
  return tokens
}

/**
 * A manager's grammar: which file answers for it, the keyword that makes a
 * script invocation explicit, and whether a bare token is one.
 *
 * One record per manager rather than three tables keyed on the same name:
 * adding a manager is one entry, and the three facts about it cannot fall out
 * of step.
 *
 * `bare: false` for the whole npm family is
 * [ADR-0012](../../docs/adr/0012-a-bare-pnpm-x-is-not-a-script-claim.md).
 * `pnpm vitest run x` and `yarn biome check` run a *binary* from
 * `node_modules/.bin`, which we do not index and cannot verify; the corpus
 * produced four of them — three of those `fixable` — the first time this check
 * ran. `SPEC.md` § 3 listed `pnpm X` and `yarn X`, and the specification was
 * narrowed rather than the heuristic weakened.
 *
 * `make` is the one bare form left, because make has no fallback: its argument
 * is a target or it is an error. Anything absent from this table — `cargo`,
 * `just`, `task`, `node` — is somebody else's runner and this check says
 * nothing about it.
 */
type ManagerGrammar = {
  runner: ScriptRunner
  /** The keywords after which the next token is a script name. */
  keywords: readonly string[]
  /** Whether the first token after the manager is a script name on its own. */
  bare: boolean
}

const MANAGERS: Readonly<Record<string, ManagerGrammar>> = {
  npm: { runner: 'package', keywords: ['run', 'run-script'], bare: false },
  pnpm: { runner: 'package', keywords: ['run'], bare: false },
  yarn: { runner: 'package', keywords: ['run'], bare: false },
  bun: { runner: 'package', keywords: ['run'], bare: false },
  deno: { runner: 'deno', keywords: ['task'], bare: false },
  make: { runner: 'make', keywords: [], bare: true },
}

/**
 * A flag before the name says the script lives somewhere we cannot identify:
 * `pnpm --filter api build` and `make -C docs html` both name a script in
 * another package, and resolving it against the nearest manifest would be
 * resolving it against the wrong one.
 *
 * Every flag is treated that way rather than a curated list of the dangerous
 * ones, because the failure mode of a list is silent: `make -j 4 build` would
 * read `4` as the target. Dropping the segment costs a detection; reading the
 * wrong token costs a false positive.
 */
function isFlag(token: string): boolean {
  return token.startsWith('-')
}

/**
 * Flags that move the question somewhere we cannot answer, **wherever they
 * sit**.
 *
 * `--filter` and `--workspace` name another package, `--prefix` and `-C`
 * another directory, and `--if-present` says the author already decided the
 * absence is fine. The position does not matter: `npm run buildd -w api` asks
 * about `api`'s scripts, and answering it from the nearest manifest would offer
 * a `fixable` correction drawn from the wrong package's script list — the one
 * class [ADR-0006](../../docs/adr/0006-the-m1-precision-criterion.md) condition
 * 2 admits none of.
 *
 * The `=` form is matched too, because `--filter=api` is one token.
 */
const ELSEWHERE_FLAGS = new Set([
  '--filter',
  '-F',
  '--workspace',
  '-w',
  '--workspaces',
  '--prefix',
  '--dir',
  '--cwd',
  '-C',
  '--directory',
  '--if-present',
  '-r',
  '--recursive',
])

function pointsElsewhere(tokens: readonly Token[]): boolean {
  return tokens.some((token) => ELSEWHERE_FLAGS.has(token.value.split('=')[0] ?? token.value))
}

/** A shell prompt and leading `VAR=value` assignments are not part of the command. */
function withoutPreamble(tokens: readonly Token[]): Token[] {
  let start = 0
  while (start < tokens.length) {
    const value = tokens[start]?.value ?? ''
    if (value === '$' || value === '>' || /^[A-Za-z_]\w*=/u.test(value)) start += 1
    else break
  }
  return tokens.slice(start)
}

/**
 * Characters that make a name a hole, a family or a shell expression instead of
 * a script: the same alphabet `discard.ts` refuses in a path, plus the quoting
 * and piping characters a name never has.
 */
const NOT_A_NAME = /[*?{}<>$[\]()|"'`=\\]/u

/**
 * A metavariable: `npm run X`, `make TARGET`. Uppercase and single characters
 * are how documentation writes "put yours here", and the shape is not one a
 * real script has.
 *
 * Real case: `docs/spec/SPEC.md` in this repo, whose § 3 specifies the check
 * with `npm run X` — six findings against ourselves the first time it ran.
 *
 * `discard.ts`'s uppercase rule needs two characters, because a path segment
 * has to be longer to be worth reporting at all. What it gives up here is a
 * Makefile target named `TAGS`, which is a real convention and a fair price.
 */
const METAVARIABLE = /^([A-Z][A-Z\d_-]*|.)$/u

/**
 * Names that are the *word* "script", not a script.
 *
 * Kept apart from `isPlaceholderName`, which this function also calls: that one
 * holds the fillers a **path segment** can be (`foo`, `NNNN`, `your-thing`) and
 * is shared with the path extractor. These are specific to this grammar — a
 * document writing `npm run task` is naming the concept, not a task — and
 * putting them in the shared list would start discarding `docs/name/x.md`.
 */
const NAME_PLACEHOLDERS = new Set([
  'script',
  'script-name',
  'scriptname',
  'task',
  'task-name',
  'target',
  'command',
  'name',
])

/**
 * A trailing `# ...` is a comment on the command, not part of it.
 *
 * Real case (unjs/h3): `pnpm vitest run <path>      # run specific test`. Left
 * in, the comment lands inside `Claim.text` and inside anything `--fix` would
 * write back.
 */
export function withoutComment(line: string): string {
  const at = line.search(/(?:^|\s)#/u)
  return at === -1 ? line : line.slice(0, at)
}

/**
 * Two spaces in a row are a **column**, and a column layout is a table that
 * happens to be written in a code block.
 *
 * Real case (spatie/bloom), whose `Makefile` is documented as an indented
 * two-column index:
 *
 *     make            list the targets        make lint       Tools/house-rules.sh
 *     make build      compile every target    make test       the BloomCore suite
 *
 * Read as a command, the first line invokes a target called `list`. A real
 * command does not align its arguments.
 */
const COLUMN_LAYOUT = /\S\s{2,}\S/u

/** The name a token carries, or `undefined` when it is not a name at all. */
function scriptNameOf(token: string): string | undefined {
  const name = token.replaceAll(/^["']|["']$/gu, '')
  if (name === '' || NOT_A_NAME.test(name)) return undefined
  // A path is a file being run (`bun run ./x.ts`), and a leading dot is a
  // Makefile special target. Neither is a script somebody named.
  if (name.includes('/') || name.startsWith('.')) return undefined
  if (METAVARIABLE.test(name)) return undefined
  if (NAME_PLACEHOLDERS.has(name.toLowerCase()) || isPlaceholderName(name)) return undefined
  return name
}

/**
 * The script a single command invokes, or `undefined` when it invokes none.
 * `nameOffset` is relative to the start of `segment`.
 */
export function parseCommand(segment: string): ParsedCommand | undefined {
  if (COLUMN_LAYOUT.test(segment.trim())) return undefined
  const tokens = withoutPreamble(tokenize(segment))
  const first = tokens[0]
  if (first === undefined) return undefined

  const manager = first.value
  const grammar = MANAGERS[manager]
  if (grammar === undefined) return undefined
  if (pointsElsewhere(tokens)) return undefined

  const rest = tokens.slice(1)
  // Rule above: a flag before the name drops the whole segment.
  const named = rest[0]
  if (named === undefined || isFlag(named.value)) return undefined

  let nameToken: Token | undefined
  if (grammar.keywords.includes(named.value)) {
    nameToken = rest[1]
    if (nameToken === undefined || isFlag(nameToken.value)) return undefined
  } else {
    if (!grammar.bare) return undefined
    nameToken = named
  }

  const script = scriptNameOf(nameToken.value)
  if (script === undefined) return undefined
  return {
    runner: grammar.runner,
    manager,
    script,
    // The quotes are stripped from the name, so the offset points at the name
    // and not at the quote around it.
    nameOffset: nameToken.at + nameToken.value.indexOf(script),
  }
}

/**
 * The commands a line chains. `pnpm build && pnpm test` is two claims, and a
 * separator is the only thing that reliably ends one command and starts
 * another.
 */
export function splitCommands(line: string): Array<{ text: string; at: number }> {
  const parts: Array<{ text: string; at: number }> = []

  /**
   * The bounds come from the separator matches rather than from `split`, which
   * loses the width of what it consumed. The offsets feed `--fix`, so
   * reconstructing them by arithmetic is the kind of thing that is right until
   * somebody adds a three-character separator.
   */
  let from = 0
  const push = (to: number): void => {
    const raw = line.slice(from, to)
    const text = raw.trim()
    if (text !== '') parts.push({ text, at: from + raw.indexOf(text[0] ?? '') })
  }

  for (const match of line.matchAll(/&&|\|\||[;|&]/gu)) {
    push(match.index)
    from = match.index + match[0].length
  }
  push(line.length)

  return parts
}

/**
 * Fence languages whose body is a shell session. `ARCHITECTURE.md` § "Markdown
 * parsing" gives the fences to the script and command claims and skips the ones
 * declaring a non-shell language; a fence declaring nothing is included,
 * because "```" with a build command under it is the commonest form there is.
 */
const SHELL_LANGS = new Set([
  '',
  'sh',
  'shell',
  'bash',
  'zsh',
  'fish',
  'console',
  'terminal',
  'shell-session',
  'shellsession',
  'sh-session',
  'command',
  'commands',
])

function isShellFence(fence: FenceSpan): boolean {
  const lang = fence.lang
  return lang === undefined || SHELL_LANGS.has(lang.toLowerCase())
}

/**
 * Script claims from inline code and from shell code fences.
 *
 * Fences are read here and nowhere else: `path/missing` refuses them because a
 * path inside an example is part of the example, but a command block *is* how a
 * context file tells an agent how to build the project.
 */
export function extractScriptClaims({ source, doc, table, prose }: ExtractContext): Claim[] {
  const claims: Claim[] = []

  const push = (text: string, offset: [number, number], context: Claim['context']): void => {
    const command = parseCommand(text)
    if (command === undefined) return
    if (prose.disclaims(offset[0])) return
    claims.push({
      kind: 'script',
      source,
      text,
      raw: text,
      range: rangeFor(table, offset[0], offset[1]),
      offset,
      context,
      fact: { subject: 'script', ...command },
    })
  }

  const pushLine = (raw: string, lineStart: number, context: Claim['context']): void => {
    // A comment inside a fence is prose that happens to sit in a code block,
    // and a trailing one is not part of the command it annotates.
    const line = withoutComment(raw)
    for (const part of splitCommands(line)) {
      const start = lineStart + part.at
      push(part.text, [start, start + part.text.length], context)
    }
  }

  for (const span of doc.inlineCode) {
    pushLine(span.value, span.offset[0], 'inline-code')
  }

  for (const fence of doc.fences) {
    if (!isShellFence(fence)) continue
    let at = 0
    for (const line of fence.value.split('\n')) {
      pushLine(line, fence.offset[0] + at, 'code-fence')
      at += line.length + 1
    }
  }

  return claims
}

/** The fact a claim carries. The union discriminates; nothing is revalidated. */
export function scriptFactOf(claim: Claim): ScriptFact | undefined {
  const fact = claim.fact
  return fact?.subject === 'script' ? fact : undefined
}
