import { execFileSync } from 'node:child_process'
import { symlinkSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { classifySource, discoverSources } from '../src/core/discover.ts'
import { buildRepoIndex } from '../src/verify/repo-index.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

describe('classifySource', () => {
  it('recognizes the seven patterns of SPEC.md § 2', () => {
    expect(classifySource('CLAUDE.md')).toBe('claude-md')
    expect(classifySource('packages/api/CLAUDE.local.md')).toBe('claude-md')
    expect(classifySource('AGENTS.md')).toBe('agents-md')
    expect(classifySource('.claude/skills/deploy/SKILL.md')).toBe('skill')
    expect(classifySource('.claude/agents/reviewer.md')).toBe('subagent')
    expect(classifySource('.claude/commands/ship/release.md')).toBe('command')
    expect(classifySource('.cursor/rules/style.mdc')).toBe('cursor-rule')
    expect(classifySource('.cursorrules')).toBe('cursor-rule')
    expect(classifySource('.github/copilot-instructions.md')).toBe('copilot')
  })

  /**
   * `.claude/skills/` is one install target among dozens, and not the busiest.
   * `npx skills add` writes to `.agents/skills/` **by default** — it is the
   * "universal" destination covering Amp, Cline, Codex, Cursor, Copilot, Gemini
   * CLI, Kilo, OpenCode, Warp, Zed and a dozen more — and offers 50-odd others
   * behind a picker: `.aider-desk/skills`, `.augment/skills`, `.bob/skills`,
   * `data/skills`, a bare `skills` for OpenClaw, and so on.
   *
   * The corpus says the same thing: 83 `SKILL.md` under `.agents/skills/`
   * against 32 under `.claude/skills/`, plus `.flue`, `.codex`, `.github` and
   * `.opencode`. Treating `.claude/skills/` as the location was reading our own
   * installer as the format.
   */
  it('recognizes a skill under each install root that is read', () => {
    expect(classifySource('.claude/skills/deploy/SKILL.md')).toBe('skill')
    expect(classifySource('.agents/skills/deploy/SKILL.md')).toBe('skill')
    expect(classifySource('.cursor/skills/deploy/SKILL.md')).toBe('skill')
    // Ticket `11`, added after the first three and ordered by how many
    // **repositories** use them rather than how many files they hold: a root
    // that eleven files share inside one project is one project's convention.
    expect(classifySource('.codex/skills/deploy/SKILL.md')).toBe('skill')
    expect(classifySource('.opencode/skills/deploy/SKILL.md')).toBe('skill')
    // `.github/` is GitHub's directory rather than an agent's, which is a real
    // difference and not the reason it arrived last: it was held by ticket `18`
    // until a document could say its files were somewhere else and be heard.
    expect(classifySource('.github/skills/deploy/SKILL.md')).toBe('skill')
  })

  it('recognizes a skill nested deeper under a skills root', () => {
    // mattpocock/skills groups by category: skills/engineering/<skill>/SKILL.md.
    // The identity is the immediate parent, so depth below the root is fine.
    expect(classifySource('.agents/skills/engineering/grill-me/SKILL.md')).toBe('skill')
  })

  it('takes the containers a repository declares, on top of the built-in ones', () => {
    // Ticket `12`. `skills/` in the repository root is what 74 of the 106
    // discovery repositories with a skill outside a known root use, and it is
    // the one shape the built-in list cannot grow to cover: those are pairs,
    // `<root>/skills`, and a bare `skills/` has no root above it.
    //
    // So what a repository declares is a **container** — a directory whose
    // children are skill directories — and the built-in roots are expressed as
    // containers too.
    expect(classifySource('skills/deploy/SKILL.md', ['skills'])).toBe('skill')
    expect(classifySource('.flue/skills/repro/SKILL.md', ['.flue/skills'])).toBe('skill')
  })

  it('keeps the built-in roots when a repository declares its own', () => {
    // Additive, like `sources`. A typo in the config costs the entry and
    // nothing else — it must never be able to silence the whole check, which
    // is the failure a replacing list would have.
    expect(classifySource('.claude/skills/deploy/SKILL.md', ['skills'])).toBe('skill')
    expect(classifySource('typo/deploy/SKILL.md', ['skils'])).toBeUndefined()
  })

  it('accepts a declared container at any depth, like the built-in ones', () => {
    expect(classifySource('packages/api/skills/build/SKILL.md', ['skills'])).toBe('skill')
    expect(classifySource('skills/engineering/grill-me/SKILL.md', ['skills'])).toBe('skill')
  })

  it('leaves install roots it does not know alone', () => {
    // Each of these was weighed by ticket `11` and left out for its own reason,
    // which is why they are one case rather than a list.
    //
    // `.flue` holds eleven `SKILL.md` files — the most of the four candidates —
    // and all eleven are in **one repository**, the same one in the
    // certification corpus and in 700 discovery repositories. Eleven files is
    // not a root, it is a project.
    //
    // A bare `skills/` is OpenClaw's target and an ordinary English word.
    for (const rel of [
      '.flue/skills/repro/SKILL.md',
      'skills/engineering/grill-me/SKILL.md',
      'answer-reviewers/SKILL.md',
    ]) {
      expect(classifySource(rel), rel).toBeUndefined()
    }
  })

  it('recognizes the anchored patterns nested in a monorepo too', () => {
    expect(classifySource('packages/api/.claude/skills/build/SKILL.md')).toBe('skill')
    expect(classifySource('packages/api/.agents/skills/build/SKILL.md')).toBe('skill')
    expect(classifySource('apps/web/.github/copilot-instructions.md')).toBe('copilot')
  })

  it('does not classify markdown that is not a context source', () => {
    for (const rel of [
      'README.md',
      'docs/spec/SPEC.md',
      '.claude/skills/deploy/reference.md',
      '.claude/agents/nested/too-deep.md',
      '.cursor/rules/notes.md',
      'CLAUDE.md.bak',
      'src/CLAUDE.ts',
    ]) {
      expect(classifySource(rel), rel).toBeUndefined()
    }
  })
})

describe('discoverSources', () => {
  const files = {
    'CLAUDE.md': '# root\n',
    'packages/api/CLAUDE.md': '# api\n',
    '.claude/skills/deploy/SKILL.md': '---\nname: deploy\n---\n',
    'README.md': '# not a source\n',
    '.gitignore': 'ignored/\n',
    'ignored/CLAUDE.md': '# should not show up\n',
  }

  it('finds the sources and skips what is not one', async () => {
    const root = makeTempRepo({ files })
    const { sources } = await discoverSources(await buildRepoIndex(root), { paths: [] })
    expect(sources.map((s) => s.path)).toEqual([
      '.claude/skills/deploy/SKILL.md',
      'CLAUDE.md',
      'packages/api/CLAUDE.md',
    ])
  })

  it('respects .gitignore', async () => {
    const root = makeTempRepo({ files })
    const { sources } = await discoverSources(await buildRepoIndex(root), { paths: [] })
    expect(sources.some((s) => s.path.startsWith('ignored/'))).toBe(false)
  })

  it('each source carries its own baseDir, which is its directory', async () => {
    const root = makeTempRepo({ files })
    const { sources } = await discoverSources(await buildRepoIndex(root), { paths: [] })
    const byPath = new Map(sources.map((s) => [s.path, s]))
    expect(byPath.get('CLAUDE.md')?.baseDir).toBe('')
    expect(byPath.get('packages/api/CLAUDE.md')?.baseDir).toBe('packages/api')
    expect(byPath.get('.claude/skills/deploy/SKILL.md')?.baseDir).toBe('.claude/skills/deploy')
  })

  it('reads the content of each source', async () => {
    const root = makeTempRepo({ files })
    const { sources } = await discoverSources(await buildRepoIndex(root), { paths: [] })
    expect(sources.find((s) => s.path === 'CLAUDE.md')?.content).toBe('# root\n')
  })

  it('a positional argument that is a directory narrows the scope', async () => {
    const root = makeTempRepo({ files })
    const { sources } = await discoverSources(await buildRepoIndex(root), { paths: ['packages'] })
    expect(sources.map((s) => s.path)).toEqual(['packages/api/CLAUDE.md'])
  })

  it('a positional argument that is a file audits only that file', async () => {
    const root = makeTempRepo({ files })
    const { sources } = await discoverSources(await buildRepoIndex(root), { paths: ['CLAUDE.md'] })
    expect(sources.map((s) => s.path)).toEqual(['CLAUDE.md'])
  })

  it('a positional containing no sources returns nothing, without erroring', async () => {
    const root = makeTempRepo({ files })
    const { sources } = await discoverSources(await buildRepoIndex(root), { paths: ['README.md'] })
    expect(sources).toEqual([])
  })

  it('a directory prefix does not match a partial directory name', async () => {
    const root = makeTempRepo({
      files: { 'pack/CLAUDE.md': '#\n', 'packages/api/CLAUDE.md': '#\n' },
    })
    const { sources } = await discoverSources(await buildRepoIndex(root), { paths: ['pack'] })
    expect(sources.map((s) => s.path)).toEqual(['pack/CLAUDE.md'])
  })
})

/**
 * Real case (emdash-cms/emdash): `.claude/CLAUDE.md` is a symlink to
 * `../AGENTS.md`, so one stale claim was reported twice.
 */
function repoWithSymlink(): string {
  const root = makeTempRepo({
    files: { 'AGENTS.md': '# Agents\n\nThe entry point is `src/gone.ts`.\n' },
    git: false,
  })
  symlinkSync('../AGENTS.md', join(root, '.claude', 'CLAUDE.md'))
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root })
  execFileSync('git', ['add', '-A'], { cwd: root })
  return root
}

describe('a symlinked source is the same file, not a second one', () => {
  it('audits it once, with the link as an alias', async () => {
    const root = repoWithSymlink()
    const { sources } = await discoverSources(await buildRepoIndex(root), { paths: [] })
    expect(sources.map((source) => source.path)).toEqual(['AGENTS.md'])
    expect(sources[0]?.aliases).toEqual(['.claude/CLAUDE.md'])
  })

  // `.claude/CLAUDE.md` sorts before `AGENTS.md`, so first-wins would name the
  // link as the source and the real file as its alias, which is backwards.
  it('the real file wins over the link, not alphabetical order', async () => {
    const root = repoWithSymlink()
    const { sources } = await discoverSources(await buildRepoIndex(root), { paths: [] })
    expect(sources[0]?.path).toBe('AGENTS.md')
  })
})

/**
 * The four rules `.scratch/config-ignore/spec.md` fixed before the code, one
 * case each. The one that breaks first if the implementation is careless is
 * the second: a path discovery found on its own, never named in `sources`,
 * which is the whole motivating case.
 */
describe('the config ignore key', () => {
  const files = {
    'CLAUDE.md': '# root\n',
    'AGENTS.md': '# agents\n',
    '.claude/skills/deploy/SKILL.md': '---\nname: deploy\n---\n',
    '.claude/skills/vendored/SKILL.md': '---\nname: vendored\n---\n',
    'docs/notes.md': '# a configured source\n',
    'packages/a/skills/x.md': '# nested\n',
  }
  const pathsOf = async (options: Parameters<typeof discoverSources>[1]) => {
    const root = makeTempRepo({ files })
    const { sources } = await discoverSources(await buildRepoIndex(root), options)
    return sources.map((s) => s.path)
  }

  it('drops a source discovery found on its own', async () => {
    const kept = await pathsOf({ paths: [], ignore: ['.claude/skills/vendored/**'] })
    expect(kept).not.toContain('.claude/skills/vendored/SKILL.md')
    expect(kept).toContain('.claude/skills/deploy/SKILL.md')
  })

  it('beats sources: a path in both is ignored', async () => {
    const kept = await pathsOf({ paths: [], sources: ['docs/notes.md'], ignore: ['docs/**'] })
    expect(kept).not.toContain('docs/notes.md')
    expect(kept).toContain('CLAUDE.md')
  })

  it('does not error on a pattern that matches nothing', async () => {
    // The deliberate asymmetry with `sources`, which throws. One config shared
    // across repositories must not fail on the repo that has no third_party/.
    const kept = await pathsOf({ paths: [], ignore: ['third_party/**', 'vendor/**'] })
    expect(kept).toEqual(await pathsOf({ paths: [] }))
  })

  it('matches from the repo root, not as a substring', async () => {
    const kept = await pathsOf({ paths: [], ignore: ['/skills/**'] })
    expect(kept).toContain('.claude/skills/deploy/SKILL.md')
  })

  it('takes a literal path as well as a glob', async () => {
    expect(await pathsOf({ paths: [], ignore: ['AGENTS.md'] })).not.toContain('AGENTS.md')
  })

  it('changes nothing when it is absent or empty', async () => {
    const base = await pathsOf({ paths: [] })
    expect(await pathsOf({ paths: [], ignore: [] })).toEqual(base)
    expect(await pathsOf({ paths: [], ignore: ['./'] })).toEqual(base)
  })
})
