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
  meta?: Record<string, unknown>
}

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
