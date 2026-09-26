import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { main } from '../src/cli/main.ts'
import { run } from '../src/run.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

/**
 * `docs/spec/ROADMAP.md` § M3's acceptance, as two assertions:
 *
 * > applying `--fix` to a broken fixture leaves it byte-for-byte identical to
 * > its correct version. Running `--fix` twice is idempotent.
 *
 * The documents are declared as data rather than committed as real files, for
 * the reason `helpers/fixture.ts` gives about every other fixture: a committed
 * `AGENTS.md` full of paths that are broken on purpose would be audited by
 * driftwatch run against its own repo. `AFTER` is still hand-written — a
 * snapshot recorded from the implementation would assert that the code does
 * what it does.
 */
const REPO: Record<string, string> = {
  'package.json': JSON.stringify({ name: 'fixture', scripts: { build: 'tsdown' } }),
  'src/helpers/date.ts': '',
  'src/helpers/time.ts': '',
  'docs/guides/notes.md': '# Usage\n\nHow it is used.\n',
}

/** Every autofix there is, plus the spellings that have to survive one. */
const BEFORE: Record<string, string> = {
  // No trailing newline, on purpose: the last line is the last byte.
  'AGENTS.md': [
    '# Project',
    '',
    'The entry point is `./src/util/date.ts`.',
    'Run `pnpm run biuld` first.',
    'See [the notes](./docs/old/notes.md#usage).',
    'Nothing lives at `src/nowhere/gone.ts`.',
  ].join('\n'),

  // CRLF throughout.
  'CLAUDE.md': '# Notes\r\n\r\nThe clock is `src/util/time.ts`.\r\n',

  // A skill whose `name` disagrees with its directory, kept deliberately: it
  // used to be the third autofix and it must now produce nothing.
  '.claude/skills/deploy-app/SKILL.md': [
    '---',
    'name: deploy-application-to-production',
    'description: Ships the application to production, with the checks that matter.',
    '---',
    '',
    '# Deploy',
    '',
  ].join('\n'),
}

/** The same three documents, written the way a maintainer would have fixed them. */
const AFTER: Record<string, string> = {
  'AGENTS.md': [
    '# Project',
    '',
    'The entry point is `./src/helpers/date.ts`.',
    'Run `pnpm run build` first.',
    'See [the notes](./docs/guides/notes.md#usage).',
    'Nothing lives at `src/nowhere/gone.ts`.',
  ].join('\n'),

  'CLAUDE.md': '# Notes\r\n\r\nThe clock is `src/helpers/time.ts`.\r\n',

  // Byte for byte what it was. The name disagrees with the directory and
  // that is not driftwatch's business: `skill/frontmatter` was withdrawn, and
  // this document stays in the fixture as the guard that nothing renames a
  // skill again.
  '.claude/skills/deploy-app/SKILL.md': [
    '---',
    'name: deploy-application-to-production',
    'description: Ships the application to production, with the checks that matter.',
    '---',
    '',
    '# Deploy',
    '',
  ].join('\n'),
}

function capture() {
  return {
    io: {
      out: () => {},
      err: () => {},
      isTty: false,
      env: {} as NodeJS.ProcessEnv,
    },
  }
}

function brokenRepo(): string {
  return makeTempRepo({ files: { ...REPO, ...BEFORE } })
}

function read(root: string, path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

/** A finding, as a string two runs can be compared on. */
function identify(finding: { check: string; claim: { text: string } }): string {
  return `${finding.check} ${finding.claim.text}`
}

describe('the M3 acceptance', () => {
  it('the broken version really does exercise both autofixes', async () => {
    // Without this, the fixture could stop covering a check — a rule narrowed,
    // a suggestion withdrawn — and every assertion below would still pass.
    const before = await run({ cwd: brokenRepo(), paths: [] })
    const fixable = before.findings.filter((finding) => finding.suggestion?.fixable === true)
    expect(new Set(fixable.map((finding) => finding.check))).toEqual(
      new Set(['path/missing', 'script/missing']),
    )
    expect(fixable).toHaveLength(4)
  })

  it('reports nothing at all about a skill whose name disagrees with its directory', async () => {
    const before = await run({ cwd: brokenRepo(), paths: [] })
    expect(before.findings.filter((f) => f.claim.source.path.endsWith('SKILL.md'))).toEqual([])
  })

  it('a fixed document is byte-for-byte its correct version', async () => {
    const root = brokenRepo()
    await main(['--fix'], capture().io, root)

    for (const [path, expected] of Object.entries(AFTER)) {
      expect(read(root, path), path).toBe(expected)
    }
  })

  it('running it twice is idempotent: the second run finds nothing to fix', async () => {
    const root = brokenRepo()
    await main(['--fix'], capture().io, root)

    const afterFirst = Object.keys(AFTER).map((path) => ({
      path,
      content: read(root, path),
      mtime: statSync(join(root, path)).mtimeMs,
    }))

    await main(['--fix'], capture().io, root)

    for (const { path, content, mtime } of afterFirst) {
      // The bytes are the cheap half. The mtime is the property: a second run
      // that rewrites the same bytes for the same reason means the first fix
      // did not make the claim true.
      expect(read(root, path), path).toBe(content)
      expect(statSync(join(root, path)).mtimeMs, path).toBe(mtime)
    }
  })

  it('what remains after fixing is a strict subset of what was there', async () => {
    const root = brokenRepo()
    const before = await run({ cwd: root, paths: [] })
    await main(['--fix'], capture().io, root)
    const after = await run({ cwd: root, paths: [] })

    const remaining = after.findings.map((finding) => identify(finding))
    const original = new Set(before.findings.map((finding) => identify(finding)))

    expect(after.findings.length).toBeLessThan(before.findings.length)
    // A fix that silences one finding by creating another is the failure
    // neither of the two acceptance sentences catches on its own.
    for (const finding of remaining) expect(original, finding).toContain(finding)
  })

  it('the finding that is not fixable is left alone, and still reported', async () => {
    const root = brokenRepo()
    await main(['--fix'], capture().io, root)
    const after = await run({ cwd: root, paths: [] })

    expect(after.findings.map((finding) => finding.claim.text)).toEqual(['src/nowhere/gone.ts'])
    expect(read(root, 'AGENTS.md')).toContain('src/nowhere/gone.ts')
  })

  it('--fix --dry-run over the same repo changes nothing at all', async () => {
    const root = brokenRepo()
    await main(['--fix', '--dry-run'], capture().io, root)

    for (const [path, content] of Object.entries(BEFORE)) {
      expect(read(root, path), path).toBe(content)
    }
  })
})
