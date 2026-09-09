import type { Fixture } from '../helpers/fixture.ts'

/**
 * The three confidence levels from ARCHITECTURE.md, each with its own case.
 * The document claims three paths that moved; the repo holds the targets.
 */
export const suggestions: Fixture = {
  name: 'suggestions',
  files: {
    'CLAUDE.md': [
      '# Project',
      '',
      'Auth lives in `src/lib/auth.ts`.', // 3: moved within src
      '',
      'The seed is at `src/seed.ts`.', // 5: moved to another tree
      '',
      'The helper is `src/util/date.ts`.', // 7: there are two namesakes
      '',
    ].join('\n'),
    'src/auth/auth.ts': '',
    'scripts/db/seed.ts': '',
    'packages/a/date.ts': '',
    'packages/b/date.ts': '',
  },
  expected: [
    {
      check: 'path/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 3,
      column: 16,
      text: 'src/lib/auth.ts',
      message: 'path does not exist',
      // Single candidate and it shares the `src` segment: unambiguous.
      suggestion: { value: 'src/auth/auth.ts', confidence: 1, fixable: true },
    },
    {
      check: 'path/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 5,
      column: 17,
      text: 'src/seed.ts',
      message: 'path does not exist',
      // Single candidate but in another tree: suggested, not fixed.
      suggestion: { value: 'scripts/db/seed.ts', confidence: 0.6, fixable: false },
    },
    {
      check: 'path/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 7,
      column: 16,
      text: 'src/util/date.ts',
      message: 'path does not exist',
      // Two namesakes: never autofixable, no matter how close one of them is.
      suggestion: { value: 'packages/a/date.ts', confidence: 0.3, fixable: false },
    },
  ],
}
