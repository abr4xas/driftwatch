import type { Fixture } from '../helpers/fixture.ts'

/** Paths the document claims and the repo does not have. */
export const brokenPaths: Fixture = {
  name: 'broken-paths',
  files: {
    'CLAUDE.md': [
      '# Project', // line 1
      '', // 2
      'Authentication lives in `src/lib/auth.ts`.', // 3
      '', // 4
      'The real index is `src/index.ts`, which does exist.', // 5
      '', // 6
      'The release script is `./scripts/release.sh`.', // 7
      '', // 8
      'The assets are in `public/images/`.', // 9
      '',
    ].join('\n'),
    'src/index.ts': 'export const x = 1\n',
  },
  expected: [
    {
      check: 'path/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 3,
      column: 26,
      text: 'src/lib/auth.ts',
      message: 'path does not exist',
    },
    {
      check: 'path/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 7,
      column: 24,
      // The `./` is trimmed during normalization (rule 5).
      text: 'scripts/release.sh',
      message: 'path does not exist',
    },
    {
      check: 'path/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 9,
      column: 20,
      text: 'public/images/',
      message: 'path does not exist',
    },
  ],
}
