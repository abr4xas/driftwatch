import { describe, expect, it } from 'vitest'
import { fixEditFor, type FixEdit } from '../src/fix/range.ts'
import { run } from '../src/run.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

/**
 * The edits a repo's findings would apply, each with the bytes it is about to
 * overwrite.
 *
 * `covers` is the whole point of this module and therefore of this file: an
 * edit is right when the span it replaces is the span somebody would have
 * selected by hand. Asserting on the offsets would assert on arithmetic; this
 * asserts on the text.
 */
async function editsIn(
  files: Record<string, string>,
): Promise<Array<FixEdit & { covers: string }>> {
  const root = makeTempRepo({ files })
  const result = await run({ cwd: root, paths: [] })
  return result.findings
    .map((finding) => fixEditFor(finding))
    .filter((edit): edit is FixEdit => edit !== undefined)
    .map((edit) => ({
      ...edit,
      covers: edit.source.content.slice(edit.range[0], edit.range[1]),
    }))
}

/** A `SKILL.md` whose `name` disagrees with its directory: the one autofix. */

describe('a path fix replaces the path and nothing around it', () => {
  it('covers the fragment as written', async () => {
    const edits = await editsIn({
      'AGENTS.md': 'The entry point is `src/util/date.ts`.\n',
      'src/helpers/date.ts': '',
    })
    expect(edits).toHaveLength(1)
    expect(edits[0]?.covers).toBe('src/util/date.ts')
    expect(edits[0]?.replacement).toBe('src/helpers/date.ts')
  })

  it('leaves a `./` prefix alone, because it is outside the range', async () => {
    const edits = await editsIn({
      'AGENTS.md': 'The entry point is `./src/util/date.ts`.\n',
      'src/helpers/date.ts': '',
    })
    // The claim's text is normalized to `src/util/date.ts`, and that is what
    // the range covers: the prefix survives by not being part of it.
    expect(edits[0]?.covers).toBe('src/util/date.ts')
    expect(edits[0]?.replacement).toBe('src/helpers/date.ts')
  })

  it('leaves a link anchor alone', async () => {
    const edits = await editsIn({
      'AGENTS.md': 'See [the notes](./src/util/date.md#usage).\n',
      'src/helpers/date.md': '# Usage\n',
    })
    expect(edits).toHaveLength(1)
    // The claim spans the whole url, anchor included. The edit must not.
    expect(edits[0]?.covers).toBe('src/util/date.md')
  })

  it('leaves a trailing line reference alone', async () => {
    const edits = await editsIn({
      'AGENTS.md': 'It is raised at `src/util/date.ts:42`.\n',
      'src/helpers/date.ts': '',
    })
    expect(edits[0]?.covers).toBe('src/util/date.ts')
  })
})

describe('a path fix is refused when the correction would change a convention', () => {
  it('refuses a nested source, whose paths are ambiguous about where they start', async () => {
    const files = {
      'packages/api/AGENTS.md': 'The entry point is `src/util/date.ts`.\n',
      'packages/api/src/helpers/date.ts': '',
    }
    const root = makeTempRepo({ files })
    const result = await run({ cwd: root, paths: [] })

    // The finding is still reported, and still carries a fixable suggestion:
    // what is refused is writing it, not knowing it.
    expect(result.findings).toHaveLength(1)
    expect(result.findings[0]?.suggestion?.fixable).toBe(true)
    expect(await editsIn(files)).toEqual([])
  })

  it('says nothing about a path written from the filesystem root', async () => {
    /**
     * This used to assert the opposite: that `/src/util/date.ts` in a nested
     * source is unambiguously root-relative, is reported, and is autofixed to
     * `/src/helpers/date.ts`.
     *
     * The corpus disagreed. Of **306 absolute-path claims across 66 repos, 5
     * resolve to anything in the repo**, and the only three that ever produced
     * findings were `/docs/app/glossary` and its siblings in `vercel/next.js`
     * — documentation-site URLs, all false. The reading sustained no true
     * finding anywhere and cost three false ones, so `discard.ts` now treats a
     * leading slash the way it treats `~/`.
     *
     * The case below is what that costs, stated as a test rather than left
     * implicit: a document that does mean the repo root stops being checked.
     */
    const edits = await editsIn({
      'packages/api/AGENTS.md': 'The entry point is `/src/util/date.ts`.\n',
      'src/helpers/date.ts': '',
    })
    expect(edits).toEqual([])
  })
})

describe('a script fix replaces the whole command', () => {
  it('covers the command, because that is what the suggestion is', async () => {
    const edits = await editsIn({
      'package.json': JSON.stringify({ scripts: { build: 'tsdown' } }),
      'AGENTS.md': 'Run `pnpm run biuld` before committing.\n',
    })
    expect(edits).toHaveLength(1)
    expect(edits[0]?.covers).toBe('pnpm run biuld')
    expect(edits[0]?.replacement).toBe('pnpm run build')
  })
})

describe('nothing else is ever an edit', () => {
  it('a suggestion that is not fixable produces none', async () => {
    // Two namesakes: `suggestPath` names the closest and refuses to apply it.
    const edits = await editsIn({
      'AGENTS.md': 'The entry point is `src/util/date.ts`.\n',
      'src/helpers/date.ts': '',
      'lib/date.ts': '',
    })
    expect(edits).toEqual([])
  })

  it('a finding with no suggestion at all produces none', async () => {
    const edits = await editsIn({
      'AGENTS.md': 'The entry point is `src/util/date.ts`.\n',
      'src/other.ts': '',
    })
    expect(edits).toEqual([])
  })
})
