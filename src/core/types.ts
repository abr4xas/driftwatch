/**
 * The pipeline's data model (ARCHITECTURE.md § "Data model").
 * The stages communicate only through these types, and none of them knows the
 * next one. Each type shows up here when a stage consumes it, not before.
 */

export type SourceKind =
  | 'claude-md'
  | 'agents-md'
  | 'skill'
  | 'subagent'
  | 'command'
  | 'cursor-rule'
  | 'copilot'
  /**
   * Declared in the config's `sources`, not found by discovery. It is a
   * separate kind and not a lie about being an `agents-md`: the reporter names
   * it, and a reader can tell "the tool found this" from "this repo asked for
   * it".
   */
  | 'configured'

/** An agent context file: the thing being audited. */
export type Source = {
  /** Relative to the repo root, with posix separators. */
  path: string
  absPath: string
  kind: SourceKind
  content: string
  /**
   * The directory the relative paths it mentions resolve against.
   * A `packages/api/CLAUDE.md` talks about its own directory, not the root.
   * It is '' for a source at the root.
   */
  baseDir: string
  /**
   * Other paths whose content is byte-for-byte identical to this one, in the
   * same directory. Having `AGENTS.md` and `CLAUDE.md` as copies is common:
   * auditing both reports the same problem twice, which is the easiest way to
   * make the output look twice as noisy as it really is.
   */
  aliases: readonly string[]
}

export type ClaimKind = 'path' | 'script' | 'dep' | 'symbol' | 'link' | 'frontmatter'

/** Where the fragment appeared. It is what separates a real path from an example. */
export type ClaimContext = 'inline-code' | 'code-fence' | 'link' | 'frontmatter' | 'prose'

export type Range = {
  line: number
  column: number
  endLine: number
  endColumn: number
}

/** A fragment of a source that asserts something verifiable about the repo. */
export type Claim = {
  kind: ClaimKind
  source: Source
  /** The exact asserted fragment, already normalized. */
  text: string
  /** The fragment as it appears in the file, before normalizing. */
  raw: string
  /** 1-indexed, pointing at the fragment and not at the node containing it. */
  range: Range
  /** Absolute offsets into `source.content`. Enables --fix without reformatting. */
  offset: [number, number]
  context: ClaimContext
  /**
   * What the extractor read, beyond the text. It is a discriminated union and
   * not an open record: producer and consumer used to agree on a `subject`
   * string through three hand-written revalidators, and the compiler does it.
   */
  fact?: ClaimFact
}

/** Which file a script claim's name would have to be defined in. */
export type ScriptRunner = 'package' | 'make' | 'deno'

/**
 * The observed type of a top-level frontmatter value. It names YAML shapes and
 * not JavaScript ones: `mapping` and `list`, and `empty` for a key written with
 * nothing after it.
 */
export type FrontmatterType = 'string' | 'number' | 'boolean' | 'list' | 'mapping' | 'empty'

/** What a script claim asserts. */
export type ScriptFact = {
  subject: 'script'
  runner: ScriptRunner
  /** The binary as written, so a message can name what the reader typed. */
  manager: string
  script: string
  /**
   * Where the name starts inside `Claim.text`. The claim spans the whole
   * command — that is what `SPEC.md` § 5 prints and what `--fix` replaces — so
   * rewriting one token needs its position, and re-parsing the text later is
   * how the parser and the fix come to disagree.
   */
  nameOffset: number
}

/**
 * What a frontmatter claim asserts: either that the block did not parse, or
 * what one top-level key holds.
 */
export type FrontmatterFact =
  | { subject: 'parse'; reason: string }
  | {
      subject: 'key'
      key: string
      type: FrontmatterType
      /** The value when it is a string. Reading it is how a `yes` stays a boolean. */
      scalar: string | undefined
    }

/** What a `SKILL.md`'s frontmatter block asserts by existing, or by not. */
export type SkillFact = {
  subject: 'skill-block'
  /** `false` when the file has no frontmatter at all. */
  present: boolean
  /** The top-level keys, in the order they are written. */
  keys: readonly string[]
}

/** Everything a claim can carry. The `subject` is the discriminant. */
export type ClaimFact = ScriptFact | FrontmatterFact | SkillFact

export type Verdict = 'ok' | 'broken' | 'suspect' | 'skipped'

export type Severity = 'error' | 'warning'

export type Suggestion = {
  value: string
  confidence: number
  fixable: boolean
}

export type Finding = {
  /** Stable check id, such as `path/missing`. */
  check: string
  severity: Severity
  claim: Claim
  message: string
  suggestion?: Suggestion
}
