import { describe, expect, it } from 'vitest'
import { proseGatesFor } from '../src/extract/context-prose.ts'

/**
 * The gates are asked about an **offset**, which is why every assertion about
 * them used to go through `run()` over a temporary repo: building the offset by
 * hand is the awkward part, not reaching the module. `‸` marks where the claim
 * sits and is removed before the content is handed over, so a case reads as the
 * document it is about.
 */
function disclaims(marked: string, origin?: string): boolean {
  const offset = marked.indexOf('‸')
  if (offset === -1) throw new Error('the case has to mark the claim with ‸')
  const content = marked.replace('‸', '')
  return proseGatesFor(content, origin).disclaims(offset)
}

describe('a claim nothing disclaims', () => {
  it('plain prose reports', () => {
    expect(disclaims('The entry point is `‸src/cli.ts`.\n')).toBe(false)
  })

  it('a bullet listing a file reports', () => {
    expect(disclaims('- `‸src/run.ts` is the pipeline\n')).toBe(false)
  })
})

describe('the marker gates', () => {
  it('an example is not a claim', () => {
    expect(disclaims('Name the test after the file, such as `‸auth/test_token.py`.\n')).toBe(true)
  })

  it('a hedge is not a claim', () => {
    expect(disclaims('- `‸crates/README.md` (if exists)\n')).toBe(true)
  })

  it('the marker counts after the path, not only before it', () => {
    expect(disclaims('Read `‸docs/notes.md` if present.\n')).toBe(true)
  })
})

describe('the sentence gates', () => {
  it('an imperative opening the sentence makes the path a destination', () => {
    expect(disclaims('1. Create `‸perf/profile/your_profile.rs` implementing it\n')).toBe(true)
  })

  /**
   * The line carries five sentences in the real case (laravel/vet), so the
   * imperative is tested against the sentence holding the claim and not the
   * line: otherwise one `Create` silences every path after it.
   */
  it('an imperative in an earlier sentence does not reach this one', () => {
    expect(disclaims('Create `a.ts`. The file `‸src/b.ts` is missing.\n')).toBe(false)
  })

  it('a modal makes the sentence about what would be, not what is', () => {
    expect(disclaims('The output would land in `‸dist/report.json`.\n')).toBe(true)
  })

  it('the imperative has to open the sentence', () => {
    expect(disclaims('The script will create `‸out/x.json` on first run.\n')).toBe(false)
  })
})

describe('the window around the claim', () => {
  /**
   * Real case (BerriAI/litellm): the "such as" wraps onto the previous line, so
   * the line alone splits the marker away from the path.
   */
  it('a wrapped sentence carries its marker from the previous line', () => {
    const content = [
      'Use subdirectories that match the implementation path, such as',
      '`‸auth/test_token_exchange.py` for `auth/token_exchange.py`.',
      '',
    ].join('\n')
    expect(disclaims(content)).toBe(true)
  })

  /**
   * Real case (cyanheads/git-mcp-server): two rows of a table, where the first
   * row's "e.g." was suppressing the second row's path. A row opens an item of
   * its own, so the window does not reach back.
   */
  it('a table row does not bleed into the next one', () => {
    const content = [
      '| `src/prompts/` | MCP Prompt definitions (e.g., the greeting one) |',
      '| `‸src/transports/` | Transport implementations |',
      '',
    ].join('\n')
    expect(disclaims(content)).toBe(false)
  })

  it('a bullet does not bleed into the next one', () => {
    const content = [
      '- Anything, for example a stale note',
      '- `‸src/real.ts` is the entry',
      '',
    ].join('\n')
    expect(disclaims(content)).toBe(false)
  })
})

describe('the gates that read the document', () => {
  /**
   * Real case (mattpocock/course-video-manager): one sentence roots a section
   * somewhere else and the bullets below it are relative to that root, so the
   * scope has to be the section and not the line.
   */
  it('a section rooted in another checkout silences the paths under it', () => {
    const content = [
      '### Scan the API source',
      '',
      'Read the API source at `~/repos/ai-hero/src/`. Focus on:',
      '',
      '- REST endpoints: `‸src/app/api/`',
      '',
    ].join('\n')
    expect(disclaims(content)).toBe(true)
  })

  it('the scope ends at the next heading', () => {
    const content = [
      '### Scan the API source',
      '',
      'Read the API source at `~/repos/ai-hero/src/`.',
      '',
      '## This repo',
      '',
      'The entry point is `‸src/cli.ts`.',
      '',
    ].join('\n')
    expect(disclaims(content)).toBe(false)
  })

  it('a file is not a root other paths hang off', () => {
    const content = [
      '### Notes',
      '',
      'The token lives in `~/.config/gh/hosts.yml`.',
      '',
      '- `‸src/auth.ts` reads it',
      '',
    ].join('\n')
    expect(disclaims(content)).toBe(false)
  })

  it('a path next to another repo belongs to that repo', () => {
    const line =
      'Skills live in [prisma/ignite](https://github.com/prisma/ignite) (`‸skills/x/`).\n'
    expect(disclaims(line, 'acme/tool')).toBe(true)
  })

  it('our own repo named in a link disclaims nothing', () => {
    const line = 'Skills live in [acme/tool](https://github.com/acme/tool) (`‸skills/x/`).\n'
    expect(disclaims(line, 'acme/tool')).toBe(false)
  })
})
