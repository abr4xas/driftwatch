/**
 * Configuration roots that belong to an agent tool rather than to a project.
 *
 * A context file explaining a tool writes that tool's paths, and they are not
 * claims about the repo holding the document. Real case
 * (`saubakirov/KZ-IT-telegram-list`), a command that installs the same
 * workflows for three assistants:
 *
 *     - Cursor: copy `tfw.mdc.template` → `.cursor/rules/tfw.mdc`
 *     - Antigravity: copy `.tfw/adapters/antigravity/rules/` → `.agent/rules/`
 *     | `.claude/commands/tfw-task.md`, `.agent/workflows/tfw-task.md` | ... |
 *
 * Seven findings from one document, and two of them **autofixable**: the tool
 * offered to rewrite `.agent/workflows/tfw-task.md` into
 * `.claude/commands/tfw-task.md`, which is not a correction but the
 * destruction of the distinction the table exists to draw.
 * [ADR-0006](../../docs/adr/0006-the-m1-precision-criterion.md) condition 2
 * admits no false positive there at any rate, so the class had to close.
 *
 * The rule is **gated on the root being absent**, and that gate is what makes
 * it narrow. A repo that has `.cursor/` uses Cursor: a path inside it either
 * exists or is real drift, and it is reported as before. A repo with no
 * `.cursor/` at all does not use Cursor, so a mention of `.cursor/rules/` is
 * about the tool.
 *
 * The list is somebody else's vocabulary, which
 * [ADR-0011](../../docs/adr/0011-an-unknown-key-is-only-reported-as-a-near-miss.md)
 * argues is exactly what a tool should not hold — but the direction here is the
 * opposite of that case. This list can only make driftwatch **quieter**: a tool
 * we have never heard of keeps producing findings, and a new assistant added to
 * the list next year costs a detection nobody was relying on. Falling behind is
 * free; being wrong is not possible.
 */
import { hasDir, type RepoIndex } from './repo-index.ts'

/**
 * `.claude` is on the list too, and it is the interesting entry.
 *
 * It is ours, so the temptation is to exempt it. But the gate is what decides:
 * a repo with no `.claude/` directory anywhere is a repo being audited through
 * its `CLAUDE.md` alone, and a `CLAUDE.md` saying "skills live in
 * `.claude/skills/`" in that repo is telling you where they *would* go. What it
 * costs is a real miss — a repo that deleted its whole `.claude/` and still
 * describes what was in it — and that is the trade this project takes every
 * time.
 */
const TOOL_ROOTS = new Set([
  '.claude',
  '.agent',
  '.cursor',
  '.windsurf',
  '.aider',
  '.continue',
  '.cline',
  '.roo',
  '.kilocode',
  '.gemini',
  '.codex',
  '.opencode',
  '.junie',
  '.trae',
  '.qodo',
  '.amazonq',
  '.augment',
  '.crush',
  '.goose',
  '.zed',
])

/**
 * Whether the path is inside an agent tool's configuration root that this repo
 * does not have.
 *
 * The path is taken **as written, from the root**: `.agent/rules/` means
 * Antigravity's directory wherever the document sits, and resolving it against
 * a nested source's `baseDir` first would ask about
 * `.claude/commands/.agent/rules/`, which nobody meant.
 */
export function belongsToAbsentTool(index: RepoIndex, asWritten: string): boolean {
  const first = asWritten.split('/')[0] ?? ''
  if (!TOOL_ROOTS.has(first)) return false
  return !hasDir(index, first)
}
