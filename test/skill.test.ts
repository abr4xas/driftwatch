import { describe, expect, it } from 'vitest'
import type { Claim, Source, SourceKind } from '../src/core/types.ts'
import { proseGatesFor } from '../src/extract/context-prose.ts'
import { extractFrontmatterClaims, frontmatterFactOf } from '../src/extract/frontmatter.ts'
import { extractSkillClaims, skillFactOf } from '../src/extract/skill.ts'
import { suggestKey } from '../src/fix/suggest.ts'
import { parseFrontmatter } from '../src/parse/frontmatter.ts'
import { parseMarkdown } from '../src/parse/markdown.ts'
import { buildLineTable } from '../src/parse/positions.ts'

function claimsOf(
  content: string,
  path: string = '.claude/skills/deploy/SKILL.md',
  kind: SourceKind = 'skill',
): Claim[] {
  const source: Source = {
    path,
    absPath: `/tmp/${path}`,
    kind,
    content,
    baseDir: path.split('/').slice(0, -1).join('/'),
    aliases: [],
  }
  return extractSkillClaims({
    source,
    doc: parseMarkdown(content),
    frontmatter: parseFrontmatter(content),
    table: buildLineTable(content),
    prose: proseGatesFor(content, undefined),
  })
}

function block(...lines: readonly string[]): string {
  return ['---', ...lines, '---', '', '# Title', ''].join('\n')
}

describe('extractSkillClaims', () => {
  it('claims the block, at the opening delimiter, with the keys it holds', () => {
    const claims = claimsOf(block('name: deploy', 'description: ships it'))
    expect(claims).toHaveLength(1)
    expect(claims[0]?.text).toBe('---')
    expect(claims[0]?.range.line).toBe(1)
    expect(claims[0]?.offset).toEqual([0, 3])
    expect(skillFactOf(claims[0]!)).toEqual({
      subject: 'skill-block',
      present: true,
      keys: ['name', 'description'],
    })
  })

  it('a file with no frontmatter is claimed at its first line', () => {
    const claims = claimsOf('# Blockless\n\nText.\n')
    expect(claims[0]?.text).toBe('# Blockless')
    expect(skillFactOf(claims[0]!)).toEqual({
      subject: 'skill-block',
      present: false,
      keys: [],
    })
  })

  it('only a skill is claimed', () => {
    for (const kind of ['agents-md', 'subagent', 'command', 'configured'] as const) {
      expect(claimsOf(block('name: x'), '.claude/agents/x.md', kind), kind).toEqual([])
    }
  })

  it('a block that does not parse is left to `frontmatter/invalid`', () => {
    expect(claimsOf(block('name: [unclosed'))).toEqual([])
  })

  it('a template is not a skill, and neither gate is duplicated here', () => {
    expect(claimsOf(block('name: {{name}}'))).toEqual([])
    expect(claimsOf(block('Not frontmatter: prose'))).toEqual([])
  })

  it('a block holding nothing but a comment is refused by the key-shape gate', () => {
    expect(claimsOf(block('# just a comment'))).toEqual([])
  })
})

describe('suggestKey', () => {
  const known = ['name', 'description', 'license', 'allowed-tools', 'model']

  it('names the known key an unknown one is a near-miss of', () => {
    expect(suggestKey(known, 'allowed_tools')).toEqual({
      value: 'allowed-tools',
      confidence: 0.6,
      fixable: false,
    })
    expect(suggestKey(known, 'licence')?.value).toBe('license')
    expect(suggestKey(known, 'descriptions')?.value).toBe('description')
  })

  it('a genuinely novel key resembles nothing and is not reported', () => {
    for (const key of ['version', 'x-team', 'stage', 'tools']) {
      expect(suggestKey(known, key), key).toBeUndefined()
    }
  })

  it('two candidates is no candidate', () => {
    // One edit from each of two known keys: there is no correction to name.
    expect(suggestKey(['aa', 'ab'], 'ac')).toBeUndefined()
  })

  it('never fixable, whatever the distance', () => {
    expect(suggestKey(known, 'licence')?.fixable).toBe(false)
  })
})

describe('the fact guards discriminate', () => {
  const content = block('name: deploy', 'description: ships it')
  const source: Source = {
    path: '.claude/skills/deploy/SKILL.md',
    absPath: '/tmp/.claude/skills/deploy/SKILL.md',
    kind: 'skill',
    content,
    baseDir: '.claude/skills/deploy',
    aliases: [],
  }
  const context = {
    source,
    doc: parseMarkdown(content),
    frontmatter: parseFrontmatter(content),
    table: buildLineTable(content),
    prose: proseGatesFor(content, undefined),
  }

  /**
   * Both extractors emit `frontmatter` claims, so `claimKinds` cannot tell the
   * two checks apart and each narrows by fact. The union is what makes that a
   * discriminant test rather than a revalidation.
   */
  it('a skill-block claim is not read as a key, and a key is not read as a block', () => {
    const blockClaim = extractSkillClaims(context)[0]!
    const keyClaim = extractFrontmatterClaims(context)[0]!

    expect(skillFactOf(blockClaim)?.subject).toBe('skill-block')
    expect(frontmatterFactOf(blockClaim)).toBeUndefined()

    expect(frontmatterFactOf(keyClaim)?.subject).toBe('key')
    expect(skillFactOf(keyClaim)).toBeUndefined()
  })
})
