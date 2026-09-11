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
function skill(name: string): Record<string, string> {
  return {
    '.claude/skills/my-skill/SKILL.md': `---\nname: ${name}\ndescription: A skill that does a thing worth describing at length.\n---\n\n# Skill\n`,
  }
}

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

  it('accepts a root-relative path in a nested source, which is unambiguous', async () => {
    const edits = await editsIn({
      'packages/api/AGENTS.md': 'The entry point is `/src/util/date.ts`.\n',
      'src/helpers/date.ts': '',
    })
    expect(edits).toHaveLength(1)
    expect(edits[0]?.covers).toBe('/src/util/date.ts')
    expect(edits[0]?.replacement).toBe('/src/helpers/date.ts')
  })
})

describe("a skill's name fix replaces the value, never the key", () => {
  it('covers the value token', async () => {
    const edits = await editsIn(skill('other-name'))
    expect(edits).toHaveLength(1)
    // The claim covers `name`. An edit that inherited it would produce
    // `my-skill: other-name`, which is the way this milestone corrupts a file.
    expect(edits[0]?.covers).toBe('other-name')
    expect(edits[0]?.replacement).toBe('my-skill')
  })

  it("keeps the author's quoting", async () => {
    const edits = await editsIn(skill('"other-name"'))
    expect(edits[0]?.covers).toBe('"other-name"')
    expect(edits[0]?.replacement).toBe('"my-skill"')
  })

  it('is not thrown off by a value longer or shorter than its key', async () => {
    const short = await editsIn(skill('x-y'))
    expect(short[0]?.covers).toBe('x-y')
    const long = await editsIn(skill('a-considerably-longer-name-than-the-key'))
    expect(long[0]?.covers).toBe('a-considerably-longer-name-than-the-key')
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
