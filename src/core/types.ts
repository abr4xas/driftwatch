/**
 * El modelo de datos del pipeline (ARCHITECTURE.md § "Modelo de datos").
 * Las etapas se comunican solo a traves de estos tipos, y ninguna conoce a la
 * siguiente. Cada tipo aparece aca cuando hay una etapa que lo consume, no
 * antes.
 */

export type SourceKind =
  'claude-md' | 'agents-md' | 'skill' | 'subagent' | 'command' | 'cursor-rule' | 'copilot'

/** Un archivo de contexto de agente: lo que se audita. */
export type Source = {
  /** Relativa a la raiz del repo, con separador posix. */
  path: string
  absPath: string
  kind: SourceKind
  content: string
  /**
   * Directorio contra el que se resuelven las rutas relativas que menciona.
   * Un `packages/api/CLAUDE.md` habla de su propio directorio, no de la raiz.
   * Es '' para una fuente en la raiz.
   */
  baseDir: string
}
