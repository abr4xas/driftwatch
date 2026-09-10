import type { Fixture } from '../helpers/fixture.ts'

/**
 * A repo that declares extra sources in a `driftwatch.config.ts`.
 *
 * Three things at once: the config is loaded with no transpiler (Node strips
 * the types), a glob is matched against the repo index, and a file discovery
 * would never classify as a source gets audited anyway.
 *
 * `docs/notes.txt` is there to prove the glob is a real pattern and not a
 * prefix match, and `AGENTS.md` is listed in the config on purpose: discovery
 * already found it, so it must not be audited twice.
 */
export const configuredSources: Fixture = {
  name: 'configured-sources',
  files: {
    'driftwatch.config.ts': [
      'const config = {',
      "  sources: ['docs/**/*.md', 'AGENTS.md'],",
      '}',
      'export default config',
      '',
    ].join('\n'),
    'AGENTS.md': [
      '# Agents',
      '',
      'The entry point is `src/cli.ts`.', // 3: exists
      '',
    ].join('\n'),
    'docs/guide.md': [
      '# Guide',
      '',
      'The helpers live in `src/util/format.ts`.', // 3: does not exist
      '',
    ].join('\n'),
    'docs/deep/design.md': [
      '# Design',
      '',
      'See `src/cli.ts` and `src/core/gone.ts`.', // 3: the second is missing
      '',
    ].join('\n'),
    // Matched by no pattern: the glob ends in *.md.
    'docs/notes.txt': 'The plan is in `src/nowhere.ts`.\n',
    'src/cli.ts': '',
  },
  expected: [
    {
      check: 'path/missing',
      severity: 'error',
      file: 'docs/deep/design.md',
      line: 3,
      column: 23,
      text: 'src/core/gone.ts',
      message: 'path does not exist',
    },
    {
      check: 'path/missing',
      severity: 'error',
      file: 'docs/guide.md',
      line: 3,
      column: 22,
      text: 'src/util/format.ts',
      message: 'path does not exist',
    },
  ],
}
