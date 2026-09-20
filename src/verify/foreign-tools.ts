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
import { allManifests, hasDir, type RepoIndex } from './repo-index.ts'

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
  // Both spellings, because they are two different things. `.agent/` is
  // Antigravity's, and the `KZ-IT` case this module was written against names
  // it *after deleting it* — which is the shape the absence gate exists for.
  // `.agents/` is the universal skills target `npx skills add` writes to by
  // default; the corpus has it in 12 repos and `.agent/` in none.
  '.agent',
  '.agents',
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

/**
 * Whether the path's first segment names a package **this repo publishes**.
 *
 * Real case (remix-run/react-router), sixteen findings in one skill — and the
 * skill states the convention itself, in a sentence that is one of the sixteen:
 *
 *     When this skill references `react-router/docs/...`, read the matching
 *     file under `node_modules/react-router/docs/`. If the installed version
 *     does not include local docs, use the repo `docs/` directory
 *
 * `react-router/docs/start/modes.md` is the published package's copy of a file
 * the repo keeps at `docs/start/modes.md`. The prefix is a **package
 * specifier**, the same as `link:` or `#lib/` in `discard.ts`, except that this
 * one cannot be recognised from syntax: it is an ordinary-looking path, and the
 * only thing that tells you otherwise is knowing the package's name.
 *
 * Which this tool does know. `buildRepoIndex` parses every `package.json` it
 * walks past, so the set of names the repo publishes is already in hand.
 *
 * **Gated on absence**, exactly like `belongsToAbsentTool` above, and for the
 * same reason. If a top-level directory with that name exists, the document is
 * talking about the directory and a missing file under it is drift like any
 * other. It is only when the name resolves to nothing in the tree that a
 * package is the remaining explanation. A monorepo publishing a package called
 * `docs` while keeping a real `docs/` therefore keeps every finding it had.
 *
 * What it costs is a repo that publishes a package named after a directory it
 * deleted. That is a narrow case, and it reads as a false negative rather than
 * a false positive, which is the trade this project takes every time.
 */
export function isPackageSpecifier(index: RepoIndex, asWritten: string): boolean {
  // A single segment is not a path (ADR-0003) and `bare-word` has already
  // discarded it; requiring the slash keeps this from answering about one.
  if (!asWritten.includes('/')) return false
  const first = asWritten.split('/')[0] ?? ''
  if (first === '' || hasDir(index, first)) return false
  for (const [, manifest] of allManifests(index)) {
    if (manifest.name === first) return true
  }
  return false
}
