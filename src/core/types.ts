/**
 * El modelo de datos del pipeline (ARCHITECTURE.md § "Modelo de datos").
 * Las cinco etapas —discover, parse, extract, verify, report— se comunican solo
 * a traves de estos tipos, y ninguna conoce a la siguiente.
 */

export type SourceKind =
  | 'claude-md'
  | 'agents-md'
  | 'skill'
  | 'subagent'
  | 'command'
  | 'cursor-rule'
  | 'copilot'

/** Un archivo de contexto de agente: lo que se audita. */
export type Source = {
  /** Relativa a la raiz del repo. */
  path: string
  absPath: string
  kind: SourceKind
  content: string
  /**
   * Directorio contra el que se resuelven las rutas relativas que menciona.
   * Un `packages/api/CLAUDE.md` habla de su propio directorio, no de la raiz.
   */
  baseDir: string
}

export type ClaimKind = 'path' | 'script' | 'dep' | 'symbol' | 'link' | 'frontmatter'

/** Donde aparecio el fragmento. Es lo que separa una ruta real de un ejemplo. */
export type ClaimContext = 'inline-code' | 'code-fence' | 'link' | 'frontmatter' | 'prose'

export type Range = {
  line: number
  column: number
  endLine: number
  endColumn: number
}

/** Un fragmento de una fuente que asegura algo verificable sobre el repo. */
export type Claim = {
  kind: ClaimKind
  source: Source
  /** El fragmento exacto afirmado. */
  text: string
  /** 1-indexado, como lo espera cualquier terminal y cualquier editor. */
  range: Range
  /** Offsets absolutos en `source.content`. Es lo que hace posible --fix sin reformatear. */
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
  /** Id estable del check, como `path/missing`. */
  check: string
  severity: Severity
  claim: Claim
  message: string
  suggestion?: Suggestion
}

export type CheckSeverity = Severity | 'off'

export type Config = {
  sources: string[]
  ignore: string[]
  checks: Record<string, CheckSeverity>
  knownPaths: string[]
  staleThreshold: number
}

export type UserConfig = Partial<Config>
