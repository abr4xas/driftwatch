/**
 * The instrumentation ticket `07` asks for: what the extractor threw away.
 *
 * Discards are the one thing this project has never measured. They appear in
 * no snapshot, and the reason is that nothing ever asked for them — so the
 * risk here is not that the sink misses a discard, it is that it reports
 * something that was not thrown away by the rule it is filed under. A table
 * that blames `conditional` for every backticked `true` in a corpus is worse
 * than no table, because it reads like evidence.
 */
import { describe, expect, it } from 'vitest'
import type { Source } from '../src/core/types.ts'
import { proseGatesFor } from '../src/extract/context-prose.ts'
import type { Discard, ExtractContext } from '../src/extract/context.ts'
import { extractLinkClaims } from '../src/extract/links.ts'
import { extractPathClaims } from '../src/extract/paths.ts'
import { extractScriptClaims } from '../src/extract/scripts.ts'
import { parseFrontmatter } from '../src/parse/frontmatter.ts'
import { parseMarkdown } from '../src/parse/markdown.ts'
import { buildLineTable } from '../src/parse/positions.ts'

function sourceOf(content: string): Source {
  return {
    path: 'CLAUDE.md',
    kind: 'claude-md',
    content,
    baseDir: '',
    absPath: '/repo/CLAUDE.md',
    aliases: [],
  }
}

/** The same context `run.ts` builds, with the sink attached or not. */
function contextOf(content: string, discards?: ExtractContext['discards']): ExtractContext {
  const source = sourceOf(content)
  return {
    source,
    doc: parseMarkdown(content),
    frontmatter: parseFrontmatter(content),
    table: buildLineTable(content),
    prose: proseGatesFor(content, 'owner/repo'),
    ...(discards === undefined ? {} : { discards }),
  }
}

function discardsOf(content: string): Discard[] {
  const collected: Discard[] = []
  extractPathClaims(contextOf(content, (discard) => collected.push(discard)))
  return collected
}

function causesOf(content: string): string[] {
  return discardsOf(content).map((discard) => discard.cause)
}

describe('the sink', () => {
  it('is absent by default, and the claims are the same either way', () => {
    const content = 'The entry point is `src/cli.ts`, not `https://x.dev/a.ts` or `index.ts`.\n'
    const without = extractPathClaims(contextOf(content))
    const instrumented = extractPathClaims(contextOf(content, () => {}))
    expect(without.map((claim) => claim.text)).toEqual(['src/cli.ts'])
    expect(instrumented).toEqual(without)
  })

  it('names the shape rule, the text as written, and where it was', () => {
    const [discard] = discardsOf('See `https://example.com/docs/guide.md`.\n')
    expect(discard).toMatchObject({
      cause: 'url',
      text: 'https://example.com/docs/guide.md',
    })
    // The window is what a reader needs to judge it, and the offset is what
    // locates it in a file nobody is keeping.
    expect(discard?.window).toBe('See `https://example.com/docs/guide.md`.')
    expect(discard?.offset[0]).toBe(5)
  })
})

describe('a shape rule', () => {
  it('is reported by the name the tests already pin it by', () => {
    expect(causesOf('Run `pnpm`.\n')).toEqual(['bare-word'])
    expect(causesOf('Run `node scripts/sync.mjs`.\n')).toEqual(['has-spaces'])
    expect(causesOf('Look in `~/repos/other/x.ts`.\n')).toEqual(['home-path'])
    expect(causesOf('Call `/v1/responses` and `/batches`.\n')).toEqual([
      'absolute-path',
      'absolute-path',
    ])
    expect(causesOf('Everything under `src/**/*.test.ts` runs.\n')).toEqual(['glob-or-placeholder'])
    expect(causesOf('It lives in `feat/`.\n')).toEqual(['bare-directory'])
    expect(causesOf('It goes in `foo/index.ts`.\n')).toEqual(['metasyntactic'])
  })
})

describe('a prose gate', () => {
  it('is reported under its own name, not as one undifferentiated gate', () => {
    // The whole point of the table: `conditional` is the riskiest list in
    // `context-prose.ts` and `example` is not, so they cannot share a row.
    expect(causesOf('The output would land in `dist/report.json`.\n')).toEqual(['conditional'])
    expect(causesOf('Name it such as `auth/test_token.py` here.\n')).toEqual(['example'])
    expect(causesOf('- `crates/README.md` (if exists)\n')).toEqual(['hedged'])
    expect(causesOf('1. Create `perf/profile/mine.rs` for it\n')).toEqual(['create-instruction'])
    expect(causesOf('See [the other](https://github.com/other/repo) `docs/x.md`.\n')).toEqual([
      'another-repo',
    ])
  })

  it('reports a destination declared somewhere else in the document', () => {
    const content = '1. Create `docs/notes.md` first.\n\nThen read `docs/notes.md` again.\n'
    // The first mention is the instruction; the second is the one the
    // whole-document gate silences.
    expect(causesOf(content)).toEqual(['create-instruction', 'creation-target'])
  })

  it('reports a section rooted on somebody else machine', () => {
    const content = '## Scan\n\nRead the source at `~/repos/other/src/`.\n\n- `src/db/schema.ts`\n'
    // One, not two: the `~/` root that establishes the section is a `home-path`
    // by shape, so the section gate is not what cost it.
    expect(causesOf(content)).toEqual(['external-root'])
  })
})

describe('what a gate did not throw away', () => {
  it('is not credited to it', () => {
    // Every one of these is inside a sentence a prose gate closes on, and not
    // one of them is path-shaped. Blaming the gate for them would inflate the
    // riskiest rules in the file by the frequency of ordinary inline code.
    expect(causesOf('The result would be `true`, so run `pnpm test -- --watch`.\n')).toEqual([])
    expect(causesOf('1. Create the `--fix` flag, such as `-f`.\n')).toEqual([])
  })

  it('leaves the shape rules to report the candidates they refuse', () => {
    // Same sentence, one path-shaped candidate and one not. The gate fires
    // once, for the one it actually cost.
    expect(causesOf('The output would land in `dist/report.json` when `true`.\n')).toEqual([
      'conditional',
    ])
  })
})

describe('the gates are shared, so the count is too', () => {
  /**
   * `conditional` refuses a path, an anchor link and a script name with the
   * same list. Counting only the first reports the rule's cost as smaller than
   * it is, and measurably so: a large share of its discards come from the other
   * two extractors. The count is in ticket `07`.
   */
  function causesFrom(
    extract: (context: ExtractContext) => unknown,
    content: string,
  ): Array<[string, string]> {
    const collected: Discard[] = []
    extract(contextOf(content, (discard) => collected.push(discard)))
    return collected.map((discard) => [discard.kind, discard.cause])
  }

  it('reports an anchor link the prose disclaims', () => {
    const content = 'The output would be in [the report](./docs/out.md#totals).\n'
    expect(causesFrom(extractLinkClaims, content)).toEqual([['link', 'conditional']])
  })

  it('reports a script name the prose disclaims', () => {
    const content = 'A `pnpm run release` task would help here.\n'
    expect(causesFrom(extractScriptClaims, content)).toEqual([['script', 'conditional']])
  })

  it('does not credit a gate with something that was never a claim', () => {
    // The same condition `paths.ts` applies: the anchor has nowhere to go and
    // the command does not parse, so neither was the gate's to refuse.
    expect(causesFrom(extractLinkClaims, 'It would be in [x](https://a.dev/b).\n')).toEqual([])
    expect(causesFrom(extractScriptClaims, 'It would be `just a phrase`.\n')).toEqual([])
    expect(causesFrom(extractScriptClaims, 'It would run `pnpm release`.\n')).toEqual([])
  })

  it('stamps a path candidate with its own kind', () => {
    const collected: Discard[] = []
    extractPathClaims(
      contextOf('The output would land in `dist/x.json`.\n', (d) => collected.push(d)),
    )
    expect(collected.map((d) => d.kind)).toEqual(['path'])
  })
})

/**
 * The rule a model proposed, the measurement that refused it, and why the
 * refusal is the useful part.
 *
 * `discovery claims` put 800 `bare-word` discards that resolve nowhere to Jev,
 * asking whether the sentence puts the word forward as a path in this
 * repository. It said no 92% of the time — ADR-0003's "almost never", with a
 * number on it at last. The 8% left had a shape: 61 of 64 carry an extension
 * and 33 sit in a sentence that already names a directory. So: claim a bare
 * name against the nearest directory the sentence gave it.
 *
 * Built, and measured against the 66 as `07` prescribes. It took the corpus
 * from **37 findings to 118**, and narrowing it — no suffix patterns like
 * `.spec.ts`, no base with a hole in it — only reached 104. The two failures
 * are structural rather than tuning:
 *
 * - **The directory usually has no trailing slash.** `unjs/nitro` writes
 *   "- `src/dev` — Development server logic (`app.ts`, `server.ts`)". Looking
 *   for a token ending in `/` finds `src/config/` from the item *above* and
 *   claims `src/app.ts`, a file nobody mentioned.
 * - **A bare name in a document that teaches a convention is the reader's.**
 *   `remix-run/react-router` writes "- `about.tsx` → `/about`". That is
 *   `readers-project`, a class `CLASSIFICATION.md` already names.
 *
 * So the gate stays shut, and these tests pin it shut with the evidence
 * attached. What Jev found was real — the 33 examples exist — and what the 66
 * said is that no rule reaching them survives contact with the same corpus.
 */
describe('a bare name the sentence seems to locate', () => {
  it('is discarded, directory in the sentence or not', () => {
    const content = '- `config/` — agent definitions (`agents.json`) and the skills list.\n'
    expect(causesOf(content)).toContain('bare-word')
    expect(extractPathClaims(contextOf(content)).map((claim) => claim.text)).toEqual([])
  })

  it('is discarded when the sentence names no directory at all', () => {
    const content = 'Rename it to `config.ts` when you are done.\n'
    expect(causesOf(content)).toContain('bare-word')
    expect(extractPathClaims(contextOf(content))).toEqual([])
  })

  it('is discarded where the base would have been wrong', () => {
    // The `unjs/nitro` shape, which is what refused the rule: the directory
    // this list item is about carries no slash, and the one that does belongs
    // to the item before it.
    const content =
      '- `src/config/` — Config defaults.\n- `src/dev` — Dev server (`app.ts`, `server.ts`).\n'
    const texts = extractPathClaims(contextOf(content)).map((claim) => claim.text)
    expect(texts).not.toContain('src/app.ts')
    expect(texts).not.toContain('src/dev/app.ts')
  })
})
