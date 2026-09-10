import { describe, expect, it } from 'vitest'
import { anchorKey, collectAnchors } from '../src/parse/anchors.ts'

/** The keys only, which is what matching compares. */
function keys(content: string): string[] {
  return [...collectAnchors(content).keys()].toSorted()
}

describe('anchorKey', () => {
  it('lowercases and drops everything that is not a letter or a number', () => {
    expect(anchorKey('The Repo Index')).toBe('therepoindex')
    expect(anchorKey('the-repo-index')).toBe('therepoindex')
    expect(anchorKey('§ 7 Configuration!')).toBe('7configuration')
  })

  it('is the same key however the writer punctuated it', () => {
    // The whole point: every anchor GitHub resolves, this resolves. The cases
    // it accepts that GitHub would not are false negatives, which is the
    // direction this project pays for (AGENTS.md).
    expect(anchorKey('`--fix` behaviour')).toBe(anchorKey('fix-behaviour'))
    expect(anchorKey('Path extraction')).toBe(anchorKey('path--extraction'))
  })

  it('keeps letters that are not ascii', () => {
    expect(anchorKey('Configuración')).toBe('configuración')
    expect(anchorKey('设计')).toBe('设计')
  })

  it('drops emoji, which GitHub also drops', () => {
    expect(anchorKey('Getting started 🚀')).toBe('gettingstarted')
  })

  it('a fragment with nothing to key on is empty', () => {
    expect(anchorKey('---')).toBe('')
    expect(anchorKey('')).toBe('')
  })

  it('strips the user-content- prefix GitHub adds to rendered ids', () => {
    expect(anchorKey('user-content-install')).toBe('install')
  })
})

describe('collectAnchors', () => {
  it('collects every heading level', () => {
    expect(keys('# One\n\n## Two\n\n###### Six\n')).toEqual(['one', 'six', 'two'])
  })

  it('a heading contributes its visible text, not its markup', () => {
    const found = collectAnchors('## The `--fix` flag, [linked](./x.md)\n')
    expect([...found.keys()]).toEqual(['thefixflaglinked'])
  })

  it('numbers duplicate headings the way GitHub does', () => {
    // GitHub renders the second `## Setup` as `setup-1`, which keys to
    // `setup1`. Without this a correct link is reported broken.
    const found = collectAnchors('## Setup\n\n## Setup\n\n## Setup\n')
    expect([...found.keys()].toSorted()).toEqual(['setup', 'setup1', 'setup2'])
    expect(found.get('setup1')).toBe('setup-1')
  })

  it('the display value is a readable slug, for the suggestion', () => {
    const found = collectAnchors('## The `--fix` flag\n')
    expect(found.get('thefixflag')).toBe('the-fix-flag')
  })

  it('takes ids and names off html, which anchor things that are not headings', () => {
    const content = '<a id="install"></a>\n\n<a name="Legacy Name"></a>\n\n<h2 id="manual">x</h2>\n'
    expect(keys(content)).toEqual(['install', 'legacyname', 'manual'])
  })

  it('an html anchor inside a heading contributes both', () => {
    expect(keys('## <a id="pinned"></a> Setup\n')).toEqual(['pinned', 'setup'])
  })

  it('a {#custom-id} heading contributes the literal and the custom id', () => {
    // GitHub keeps the braces in the slug; other renderers honour the id.
    // Accepting both is the permissive direction.
    expect(keys('## My Section {#custom-id}\n')).toEqual(['customid', 'mysectioncustomid'])
  })

  it('a heading inside a code fence is not an anchor', () => {
    expect(keys('```md\n## Not A Heading\n```\n')).toEqual([])
  })

  it("an image's alt text counts, which can only add a key", () => {
    expect(keys('## ![the logo](./logo.png) Overview\n')).toEqual(['thelogooverview'])
  })

  it('a document with no headings has no anchors', () => {
    expect(keys('just prose, and a `path/to.ts`\n')).toEqual([])
  })
})
