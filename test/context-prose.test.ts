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
  return proseGatesFor(content, origin).disclaimedBy(offset) !== undefined
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

/**
 * A path the document elsewhere tells you to create is a destination, not a
 * claim that it exists.
 *
 * `isCreateInstruction` already covers the sentence the claim sits in. This is
 * the other half: the instruction is somewhere else in the same document, and
 * the sentence holding the claim only refers to the thing being created.
 */
function declaresDestination(content: string, text: string): boolean {
  return proseGatesFor(content, undefined).declaresDestination(text)
}

describe('a path the document tells you to create', () => {
  // Real case (remix-run/react-router), the two findings that broke ADR-0006
  // condition 2. The claims are on the "Review whether" and "Use" lines; the
  // instruction to create the file is on the bullets between them.
  const RELEASE_NOTES = [
    '4. Review whether `scripts/changes/whats-changed.md` is needed:',
    '   - Read `CHANGELOG.md` examples or `references/whats-changed.md` when uncertain',
    '   - Add `scripts/changes/whats-changed.md` only for features, migration guidance,',
    '     or complex behavior that needs long-form text',
    '   - Do not add it for ordinary bug fixes or internal refactors',
    '',
    '## Guidance',
    '',
    'Use `scripts/changes/whats-changed.md` for release-level narrative.',
    '',
  ].join('\n')

  it('recognises a path the document adds elsewhere', () => {
    expect(declaresDestination(RELEASE_NOTES, 'scripts/changes/whats-changed.md')).toBe(true)
  })

  it('says nothing about a path the document only reads', () => {
    // `references/whats-changed.md` is on a "Read ..." bullet. Same basename,
    // and the document treats it as a different file that already exists.
    expect(declaresDestination(RELEASE_NOTES, 'references/whats-changed.md')).toBe(false)
    expect(declaresDestination(RELEASE_NOTES, 'CHANGELOG.md')).toBe(false)
  })

  it('recognises `save ... at`, which is how a scratch file gets written', () => {
    // Real case (remix-run/react-router), the third finding of the same class.
    const content = 'Save the resolved decisions to a scratch file at `tasks/rfc-decisions.md`.\n'
    expect(declaresDestination(content, 'tasks/rfc-decisions.md')).toBe(true)
  })

  it('does not fire on a document that never instructs', () => {
    const content = 'The entry point is `src/index.ts` and the config is `tsconfig.json`.\n'
    expect(declaresDestination(content, 'src/index.ts')).toBe(false)
  })
})

describe('`optional`, which was measured and left alone', () => {
  /**
   * Ticket `16`. `optional` is matched as a substring against the **two-line
   * window**, wide enough to reach a sentence the word has nothing to do with,
   * and it fires more often than any other marker in `HEDGED`.
   *
   * It was scoped to the sentence, the way `CONDITIONAL` is, and then measured
   * over the discovery corpus: the change produced new findings, removed none,
   * and every new one was a false positive. A discard is not a finding, and the
   * rules that decline to answer a claim — `exists-as-suffix` above all — catch
   * what this gate lets through. So the wide scope was kept, and `AGENTS.md`'s
   * rule about what a false positive costs is why. The counts are in the
   * ticket.
   *
   * These cases pin what was kept, so the next reader finds the measurement
   * instead of repeating it.
   */
  it('silences the sentence it is in', () => {
    expect(disclaims('- Optional: existing `‸design/concept.md` for the draft\n')).toBe(true)
  })

  it('reaches across the window, which is the part that looked wrong', () => {
    // haddocking/haddock3 asserts three files exist in three consecutive
    // sentences and the word in one of them silences the others. All three
    // resolve under `src/haddock/`, so not one was ever going to be reported.
    const wrapped =
      'Optional top-level parameters (`preprocess`) are in\n' +
      '`core/optional.yaml`. Global execution parameters are in `‸modules/defaults.yaml`.\n'
    expect(disclaims(wrapped)).toBe(true)
  })

  /**
   * **Accidental, and recorded rather than endorsed.**
   *
   * cloudfoundry/uaa-release: "produces `config/uaa.yml` … on the target VM …
   * and optionally an LDAP/SAML IdP". Those files are rendered onto a machine
   * that is not the repository, and `HEDGED` has no marker for that — what
   * keeps them quiet is `optional` matching inside `optionally`, two clauses
   * away.
   *
   * So this asserts a substring match nobody designed. `CONDITIONAL` uses
   * `\b${modal}\b` and this list does not; making the two agree is a
   * defensible change and it would break this case. Anyone making it should
   * **re-run the measurement** rather than delete the assertion — the ledger
   * that kept the wide scope is what this case is holding up.
   */
  it('matches inside a longer word, which is an accident that prevents two findings', () => {
    expect(disclaims('It produces `‸config/uaa.yml` and optionally an LDAP IdP.\n')).toBe(true)
  })
})
