import { describe, expect, it } from 'vitest'
import { evaluatePathText } from '../src/extract/paths.ts'
import { passesThroughGenerated } from '../src/verify/generated.ts'
import { run } from '../src/run.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

/**
 * The classes of false positive the corpus of real repos uncovered, and that
 * the heuristics were not filtering. Every block here corresponds to a class
 * measured against context files other people wrote.
 */

describe('class 1: root-relative paths from a nested source', () => {
  it('a nested source may talk about its own directory from the root', async () => {
    const root = makeTempRepo({
      files: {
        // A real case from BerriAI/litellm: tests/e2e/CLAUDE.md says `tests/e2e/`.
        'tests/e2e/CLAUDE.md': 'The tests live in `tests/e2e/` and use `tests/e2e/util.py`.\n',
        'tests/e2e/util.py': '',
      },
    })
    const result = await run({ cwd: root, paths: [] })
    expect(result.findings).toEqual([])
  })

  it('still resolves against the baseDir when that is the right answer', async () => {
    const root = makeTempRepo({
      files: {
        'packages/api/CLAUDE.md': 'The database is `src/db.ts`.\n',
        'packages/api/src/db.ts': '',
      },
    })
    expect((await run({ cwd: root, paths: [] })).findings).toEqual([])
  })

  it('reports only if the path exists neither against the baseDir nor the root', async () => {
    const root = makeTempRepo({
      files: { 'packages/api/CLAUDE.md': 'The database is `src/db.ts`.\n' },
    })
    const result = await run({ cwd: root, paths: [] })
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]?.claim.text).toBe('src/db.ts')
  })
})

describe('class 2: generated artifacts', () => {
  it.each([
    'dist/cli.js',
    'node_modules/astro/dist/index.js',
    '.next/server',
    'target/debug/bin',
    'packages/next/dist/docs',
    '.turbo/cache',
    '.react-router/types',
  ])('%s passes through a generated directory', (rel) => {
    expect(passesThroughGenerated(rel)).toBe(true)
  })

  it('an ordinary path does not', () => {
    expect(passesThroughGenerated('src/index.ts')).toBe(false)
    expect(passesThroughGenerated('packages/api/src/db.ts')).toBe(false)
  })

  it('a generated artifact is not reported even though it is not in the index', async () => {
    const root = makeTempRepo({
      files: { 'CLAUDE.md': 'The bundle ends up in `dist/cli.js`, do not edit `node_modules/`.\n' },
    })
    expect((await run({ cwd: root, paths: [] })).findings).toEqual([])
  })
})

describe('class 3: commands taken for a path', () => {
  it.each([
    'node scripts/sync-agent-rules.mjs',
    'pnpm test packages/react-router/__tests__/router/fetchers-test.ts',
    'prisma/ignite docs/drive/',
  ])('discards %s for having spaces', (text) => {
    expect(evaluatePathText(text)).toEqual({ kind: 'discarded', reason: 'has-spaces' })
  })

  it('a link target with spaces is not discarded, because it cannot be a command', () => {
    expect(evaluatePathText('docs/architecture docs/x.md', { couldBeCommand: false })).toEqual({
      kind: 'path',
      text: 'docs/architecture docs/x.md',
    })
  })
})

describe('class 4: percent-encoded links', () => {
  it('a %20 in a link target is decoded before verifying', async () => {
    const root = makeTempRepo({
      files: {
        'CLAUDE.md': 'See [the guide](./docs/Architecture%20Overview.md).\n',
        'docs/Architecture Overview.md': '# guide\n',
      },
    })
    expect((await run({ cwd: root, paths: [] })).findings).toEqual([])
  })

  it('a malformed escape does not break the run', async () => {
    const root = makeTempRepo({
      files: { 'CLAUDE.md': 'See [broken](./docs/100%.md).\n' },
    })
    await expect(run({ cwd: root, paths: [] })).resolves.toBeDefined()
  })
})

describe('class 5: files that have to be created', () => {
  it('a step starting with Create does not claim the file exists', async () => {
    const root = makeTempRepo({
      files: {
        'CLAUDE.md': '1. Create `src/profile/new.rs` implementing the trait.\n',
      },
    })
    expect((await run({ cwd: root, paths: [] })).findings).toEqual([])
  })

  // Real case (laravel/vet): "Write a rule in a file in `.hod/rules/`. Write a
  // skill in a directory in `.hod/skills/`." The directory does not exist
  // because nobody has written a skill yet.
  it('a step starting with Write does not claim the directory exists', async () => {
    const root = makeTempRepo({
      files: { 'CLAUDE.md': 'Write a skill in a directory in `skills/mine/`.\n' },
    })
    expect((await run({ cwd: root, paths: [] })).findings).toEqual([])
  })

  // The reason the imperative is tested per sentence and not per line: this is
  // one line with two claims and only the first is an instruction.
  it('an instruction in one sentence does not suppress the next sentence', async () => {
    const root = makeTempRepo({
      files: {
        'CLAUDE.md': 'Create `src/new.ts` from the mould. The file `src/gone.ts` is missing.\n',
      },
    })
    const findings = (await run({ cwd: root, paths: [] })).findings
    expect(findings.map((finding) => finding.claim.text)).toEqual(['src/gone.ts'])
  })

  it('an instruction that wraps across a line is still one sentence', async () => {
    const root = makeTempRepo({
      files: { 'CLAUDE.md': 'Write a skill in a directory in\n`skills/mine/`.\n' },
    })
    expect((await run({ cwd: root, paths: [] })).findings).toEqual([])
  })

  it('a Create in the middle of a sentence suppresses nothing', async () => {
    const root = makeTempRepo({
      files: { 'CLAUDE.md': 'The create command uses `src/missing.ts` as the mould.\n' },
    })
    expect((await run({ cwd: root, paths: [] })).findings).toHaveLength(1)
  })

  it('a possessive filler name is discarded', () => {
    expect(evaluatePathText('perf/memory/src/profile/your_profile.rs')).toEqual({
      kind: 'discarded',
      reason: 'metasyntactic',
    })
  })
})

describe('class 6: identical copies of AGENTS.md and CLAUDE.md', () => {
  it('the same problem is reported once, naming the copy', async () => {
    const content = 'Auth lives in `src/lib/auth.ts`.\n'
    const root = makeTempRepo({
      files: { 'AGENTS.md': content, 'CLAUDE.md': content },
    })
    const result = await run({ cwd: root, paths: [] })
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]?.claim.source.path).toBe('AGENTS.md')
    expect(result.findings[0]?.claim.source.aliases).toEqual(['CLAUDE.md'])
  })

  it('two different documents are audited separately', async () => {
    const root = makeTempRepo({
      files: {
        'AGENTS.md': 'Auth lives in `src/lib/auth.ts`.\n',
        'CLAUDE.md': 'The seed lives in `src/lib/seed.ts`.\n',
      },
    })
    expect((await run({ cwd: root, paths: [] })).findings).toHaveLength(2)
  })
})

describe('class 8: the conditional mood', () => {
  // Real case (spatie/bloom): a CLAUDE.md arguing against adding an Xcode
  // project names the script that would generate one, in order to reject it.
  it('a path named inside a conditional is not a claim that it exists', async () => {
    const root = makeTempRepo({
      files: {
        'CLAUDE.md':
          'A `tools/xcodeproj.sh` that writes one on demand would avoid the conflicts.\n',
      },
    })
    expect((await run({ cwd: root, paths: [] })).findings).toEqual([])
  })

  // The rule is scoped to the sentence for this reason: over the two-line
  // window a modal would reach across a boundary into a neighbouring claim.
  it('a conditional in one sentence does not suppress the next one', async () => {
    const root = makeTempRepo({
      files: {
        'CLAUDE.md': 'A `tools/gen.sh` would avoid it. The entry point is `src/gone.ts`.\n',
      },
    })
    const findings = (await run({ cwd: root, paths: [] })).findings
    expect(findings.map((finding) => finding.claim.text)).toEqual(['src/gone.ts'])
  })

  it('a word merely containing a modal does not suppress', async () => {
    const root = makeTempRepo({
      files: { 'CLAUDE.md': 'The woodwork lives in `src/gone.ts`.\n' },
    })
    expect((await run({ cwd: root, paths: [] })).findings).toHaveLength(1)
  })
})

describe('class 7: files the document declares generated', () => {
  it('a path the document says is generated is not reported', async () => {
    const root = makeTempRepo({
      files: {
        'CLAUDE.md': '- `docs/.vitepress/names.json` is generated by `pnpm docs:contribs`\n',
      },
    })
    expect((await run({ cwd: root, paths: [] })).findings).toEqual([])
  })

  // Real case (vercel-labs/marketing-team-eve-template): the file is declared
  // in a TypeScript constant and written out when the skill compiles, so it is
  // neither committed nor gitignored.
  it('a path the document says materializes is not reported', async () => {
    const root = makeTempRepo({
      files: {
        'CLAUDE.md':
          '- `files` entries materialize as real siblings, so `refs/phrases.md` resolves.\n',
      },
    })
    expect((await run({ cwd: root, paths: [] })).findings).toEqual([])
  })

  it('the word generated without the generation marker does not suppress', async () => {
    const root = makeTempRepo({
      files: { 'CLAUDE.md': 'The generated-ish code lives in `src/missing.ts`.\n' },
    })
    expect((await run({ cwd: root, paths: [] })).findings).toHaveLength(1)
  })
})

describe('the prose window does not bleed between independent items', () => {
  it('a marker in one table row does not suppress the next row', async () => {
    const root = makeTempRepo({
      files: {
        'CLAUDE.md': [
          '| path | what it is |',
          '|---|---|',
          '| `src/exists.ts` | something (e.g., an example) |',
          '| `src/missing.ts` | something else |',
          '',
        ].join('\n'),
        'src/exists.ts': '',
      },
    })
    const result = await run({ cwd: root, paths: [] })
    expect(result.findings.map((f) => f.claim.text)).toEqual(['src/missing.ts'])
  })

  it('a marker in one bullet does not suppress the next bullet', async () => {
    const root = makeTempRepo({
      files: {
        'CLAUDE.md': [
          '- Internal ones use `_` (e.g., `_utils.ts`)',
          '- Auth goes in `src/missing.ts`',
          '',
        ].join('\n'),
      },
    })
    expect((await run({ cwd: root, paths: [] })).findings).toHaveLength(1)
  })

  it('but a wrapped sentence does look at the previous line', async () => {
    const root = makeTempRepo({
      files: {
        'CLAUDE.md': [
          'Use subdirectories that match the implementation path, such as',
          '`auth/test_x.py` for `auth/x.py`.',
          '',
        ].join('\n'),
      },
    })
    expect((await run({ cwd: root, paths: [] })).findings).toEqual([])
  })
})

describe('class 8: CamelCase placeholders with filler', () => {
  it.each([
    'tests/ci/test_action_EventNameHere.py',
    'src/NameHere/index.ts',
    'src/YourClassName.ts',
    'app/MyComponent/index.tsx',
    'src/XXX/config.ts',
    'src/Xxx.ts',
  ])('discards %s', (text) => {
    expect(evaluatePathText(text)).toEqual({ kind: 'discarded', reason: 'metasyntactic' })
  })

  it.each([
    'src/sphere.ts',
    'src/elsewhere/index.ts',
    'src/Sphere.ts',
    'src/Mystery.ts',
    'src/Yourself.ts',
    'src/adhere/cohere.ts',
  ])('does not discard %s, which is a real word', (text) => {
    expect(evaluatePathText(text)).toEqual({ kind: 'path', text })
  })
})
