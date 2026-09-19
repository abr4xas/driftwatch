/**
 * The sparse cone of the discovery clone, with no network.
 *
 * `scripts/discovery-clone.ts --verify` is the real check and it clones: it
 * needs a full clone of the same commit to diff against, which is the corpus
 * and therefore ADR-0007 territory. What is mechanical, and what this file
 * covers, is that the cone still names every file driftwatch reads.
 *
 * The failure mode it exists to catch is the dangerous one, and it is silent:
 * a file type gets added to `discover.ts`, `config.ts`, `manifest.ts` or
 * `links.ts`, the cone does not learn about it, and the discovery corpus starts
 * producing conclusions that are artifacts of the checkout rather than of the
 * repository. A source that is never read is a finding that never fires, and
 * nothing raises an error on the way.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { classifySource } from '../src/core/discover.ts'
import { RUNNERS } from '../src/verify/manifest.ts'
import type { SourceKind } from '../src/core/types.ts'
import { CONE, coneSpec } from '../scripts/discovery-clone.ts'

const SRC = new URL('../src/', import.meta.url)

function read(rel: string): string {
  return readFileSync(new URL(rel, SRC), 'utf8')
}

/**
 * A throwaway repo whose `.gitignore` is the cone.
 *
 * `.git/info/sparse-checkout` and `.gitignore` are the same pattern language,
 * so "the cone matches this path" and "check-ignore matches this path" are the
 * same question asked of the same matcher. Asking git is the point: an earlier
 * version of this file re-implemented the semantics as a regex, which meant
 * every assertion below was about that regex rather than about what git would
 * actually check out.
 */
let repo = ''

beforeAll(() => {
  repo = mkdtempSync(join(tmpdir(), 'driftwatch-cone-'))
  execFileSync('git', ['init', '-q', repo], { stdio: 'ignore' })
  writeFileSync(join(repo, '.gitignore'), coneSpec())
})

afterAll(() => {
  if (repo !== '') rmSync(repo, { recursive: true, force: true })
})

/**
 * Whether the cone admits a path, according to git.
 *
 * `--no-index` so the path does not have to exist, which is the whole point:
 * these are hypothetical files. `-q` makes it an exit code, 0 for a match.
 */
function admits(path: string): boolean {
  try {
    execFileSync('git', ['-C', repo, 'check-ignore', '--no-index', '-q', '--', path], {
      stdio: 'ignore',
    })
    return true
  } catch {
    return false
  }
}

/**
 * One example path per source kind, checked against `classifySource` rather
 * than against a reading of it.
 *
 * It is a `Record<SourceKind, ...>` on purpose: a new kind added to the union
 * fails the typecheck here, which is the only mechanism that makes this test
 * keep up with `discover.ts`. The first version of this file listed the paths
 * by hand and missed `.cursorrules` — the file has no extension, so no wildcard
 * in the cone reached it, and `colinhacks/zod` crashed on it.
 *
 * `configured` has no canonical path: it is whatever a repo's config declares,
 * which a static cone cannot cover. See §"What the cone cannot promise" in
 * `discovery-clone.ts`.
 */
const EXAMPLES: Record<SourceKind, readonly string[]> = {
  'claude-md': ['CLAUDE.md', 'CLAUDE.local.md', 'packages/api/CLAUDE.md'],
  'agents-md': ['AGENTS.md', 'packages/api/AGENTS.md'],
  skill: ['.claude/skills/review/SKILL.md'],
  subagent: ['.claude/agents/planner.md'],
  command: ['.claude/commands/ship.md'],
  'cursor-rule': ['.cursorrules', '.cursor/rules/style.mdc', 'sub/.cursorrules'],
  copilot: ['.github/copilot-instructions.md'],
  configured: [],
}

describe('the sparse cone', () => {
  it('admits every source type discover.ts recognises', () => {
    for (const [kind, paths] of Object.entries(EXAMPLES)) {
      for (const path of paths) {
        // The example has to be one, or the assertion below proves nothing.
        expect(classifySource(path), `${path} should classify as ${kind}`).toBe(kind)
        expect(admits(path), `cone must admit ${path} (${kind})`).toBe(true)
      }
    }
  })

  it('admits every config file config.ts looks for', () => {
    const configs = [
      'driftwatch.config.ts',
      'driftwatch.config.js',
      'driftwatch.config.json',
      'driftwatch.config.yaml',
      'driftwatch.config.yml',
      'package.json',
    ]
    for (const path of configs) expect(admits(path), path).toBe(true)
  })

  it('admits every manifest filename RUNNERS declares, at any depth', () => {
    // Derived from the table itself, not from a reading of it. A missing
    // manifest is the *silent* failure — `script/missing` reads an empty task
    // list and the finding disappears — which is why this is asserted against
    // the source of truth. `tursodatabase/turso` lost a Makefile target this
    // way before the cone carried `Makefile`.
    for (const facts of Object.values(RUNNERS)) {
      for (const name of facts.filenames) {
        expect(admits(name), `root ${name}`).toBe(true)
        expect(admits(`packages/api/${name}`), `nested ${name}`).toBe(true)
      }
    }
  })

  it('admits the files repo-index.ts reads from disk', () => {
    // The only three `readFileSync`/`existsSync` targets outside the git index.
    for (const path of ['.gitignore', 'packages/api/.gitignore', 'packages/api/package.json']) {
      expect(admits(path), path).toBe(true)
    }
  })

  it('admits every source and anchor-target document', () => {
    for (const path of [
      'docs/guide.md',
      'docs/spec/SPEC.md',
      'docs/guide.markdown',
      '.cursor/rules/style.mdc',
    ]) {
      expect(admits(path), path).toBe(true)
    }
  })

  it('admits every extension links.ts will open for an anchor', () => {
    // The cone's obligation here is exactly `links.ts`'s `MARKDOWN` pattern:
    // `buildAnchorIndex` opens a target only when the extractor made it a
    // `link` claim, and only these extensions do. Derived from that source
    // rather than restated, so widening `MARKDOWN` — dropping the deliberate
    // `.mdx` exclusion, say — fails here until the cone follows.
    const pattern = /const MARKDOWN = \/\\\.\(\?:([^)]+)\)\$\//u.exec(read('extract/links.ts'))
    expect(pattern, 'MARKDOWN not found in links.ts').not.toBeNull()
    const extensions = (pattern?.[1] ?? '').split('|')
    expect(extensions).toContain('md')
    for (const extension of extensions) {
      expect(admits(`docs/guide.${extension}`), `anchor target .${extension}`).toBe(true)
    }
  })

  it('does not carry extensions nothing ever opens', () => {
    // The corollary, and the reason the checkout is small. These appear in
    // links and in prose, but a claim about them is answered from the index:
    // `.mdx` and `.html` are not in `MARKDOWN`, so no anchor resolves against
    // them and nothing reads them. Carrying `.html` alone cost 146 MB of 241
    // across the corpus.
    for (const path of ['docs/guide.mdx', 'docs/api.html', 'docs/api.htm']) {
      expect(admits(path), path).toBe(false)
    }
  })

  it('leaves out the bulk of a repository', () => {
    const excluded = [
      'src/index.ts',
      'packages/api/src/server.rs',
      'assets/logo.png',
      'Cargo.lock',
      'pnpm-lock.yaml',
    ]
    for (const path of excluded) expect(admits(path), path).toBe(false)
  })

  it('names every config filename that config.ts declares', () => {
    // Pins the list rather than trusting the example above: a sixth config
    // filename added to `config.ts` has to reach the cone too.
    const declared = [...read('core/config.ts').matchAll(/'(driftwatch\.config\.[a-z]+)'/gu)].map(
      (match) => match[1] ?? '',
    )
    expect(declared.length).toBeGreaterThan(0)
    for (const name of declared) expect(admits(name), name).toBe(true)
  })

  it('admits every literal basename classifySource tests for', () => {
    // The regex reads the source rather than trusting EXAMPLES to be complete:
    // `base === '<name>'` is how every extensionless and exact-name rule in
    // `classifySource` is written, and each one is a file the cone must carry.
    const literals = [...read('core/discover.ts').matchAll(/base === '([^']+)'/gu)].map(
      (match) => match[1] ?? '',
    )
    expect(literals).toContain('.cursorrules')
    for (const name of literals) expect(admits(name), name).toBe(true)
  })

  it('writes one pattern per line, newline-terminated', () => {
    // git reads `.git/info/sparse-checkout` line by line and silently ignores a
    // final line with no newline on some versions.
    const spec = coneSpec()
    expect(spec.endsWith('\n')).toBe(true)
    expect(spec.trimEnd().split('\n')).toEqual([...CONE])
  })
})
