/**
 * The reader in front of the skill-name question.
 *
 * Everything this pass concludes rests on pairing the right two strings: the
 * `name` as written in the file, and the directory the tool would overwrite it
 * with. The audit record carries only the second, so the first is read back off
 * disk, and a pass that silently dropped the ones it could not read would
 * report a smaller problem than there is.
 */
import { describe, expect, it } from 'vitest'
import { renamesIn, report, stateOf, type Rename } from '../scripts/jev/names.ts'

const outcome = (repo: string, findings: unknown[]) => JSON.stringify({ repo, findings })
const nameFinding = (path: string, suggestion: string, fixable = true) => ({
  check: 'skill/frontmatter',
  text: 'name',
  path,
  suggestion,
  fixable,
})

const heads: Record<string, string> = {
  'o/a|.claude/skills/spawn/SKILL.md':
    '---\nname: meta-agent-spawn\ndescription: Spawns agents\n---\n',
  'o/a|.claude/skills/quoted/SKILL.md': '---\nname: "Memory Palace"\n---\n',
  'o/a|.claude/skills/noname/SKILL.md': '---\ndescription: no name here\n---\n',
}
const read = (repo: string, path: string) => heads[`${repo}|${path}`]

describe('which rewrites the pass picks up', () => {
  it('pairs the declared name with the directory the tool would impose', () => {
    const text = outcome('o/a', [nameFinding('.claude/skills/spawn/SKILL.md', 'spawn')])
    expect(renamesIn(text, read)).toEqual([
      {
        repo: 'o/a',
        path: '.claude/skills/spawn/SKILL.md',
        directory: 'spawn',
        current: 'meta-agent-spawn',
        suggested: 'spawn',
        description: 'Spawns agents',
      },
    ])
  })

  it('unquotes a name, so a title is not compared with its own quotes', () => {
    const text = outcome('o/a', [nameFinding('.claude/skills/quoted/SKILL.md', 'quoted')])
    expect(renamesIn(text, read)[0]?.current).toBe('Memory Palace')
  })

  it('ignores a finding that is not fixable, which is the whole population of interest', () => {
    const text = outcome('o/a', [nameFinding('.claude/skills/spawn/SKILL.md', 'spawn', false)])
    expect(renamesIn(text, read)).toEqual([])
  })

  it('ignores other checks and other fields of this one', () => {
    const text = outcome('o/a', [
      { ...nameFinding('.claude/skills/spawn/SKILL.md', 'spawn'), check: 'path/missing' },
      { ...nameFinding('.claude/skills/spawn/SKILL.md', 'spawn'), text: '---' },
    ])
    expect(renamesIn(text, read)).toEqual([])
  })

  it('drops a file whose name cannot be read rather than guessing one', () => {
    const text = outcome('o/a', [nameFinding('.claude/skills/noname/SKILL.md', 'noname')])
    expect(renamesIn(text, read)).toEqual([])
  })

  it('survives a torn line and a repository with no findings', () => {
    const text = `${outcome('o/a', [nameFinding('.claude/skills/spawn/SKILL.md', 'spawn')])}\n{"repo":\n{"repo":"o/b"}\n`
    expect(renamesIn(text, read)).toHaveLength(1)
  })
})

describe('the state the questions are asked over', () => {
  const rename: Rename = {
    repo: 'o/a',
    path: '.agents/skills/meta/orchestration/spawn/SKILL.md',
    directory: 'spawn',
    current: 'meta-agent-spawn',
    suggested: 'spawn',
    description: 'Spawns agents',
  }

  it('shows the edit as an edit, not as two loose strings', () => {
    expect(stateOf(rename).proposedEdit).toBe('name: meta-agent-spawn -> name: spawn')
  })

  it('keeps the whole directory path, because a nested leaf is the defect', () => {
    expect(stateOf(rename).skillDirectory).toBe('.agents/skills/meta/orchestration/spawn')
  })
})

const answer = (why: string, directoryIsAName: number) => ({
  repo: 'o/a',
  path: '.claude/skills/x/SKILL.md',
  directory: 'x',
  current: 'a',
  suggested: 'x',
  description: '',
  rewriteIsRight: 0.3,
  directoryIsAName,
  why,
  confidence: 0.9,
})

describe('the report', () => {
  it('splits each class by whether the directory names the skill at all', () => {
    const text = report([answer('human-title', 0.9), answer('human-title', 0.05)])
    expect(text).toMatch(/human-title\s+2\s+1\s+1/u)
  })

  it('counts the middle band in neither column', () => {
    const text = report([answer('human-title', 0.5)])
    expect(text).toMatch(/human-title\s+1\s+0\s+0/u)
  })
})
