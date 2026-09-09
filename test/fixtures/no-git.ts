import type { Fixture } from '../helpers/fixture.ts'

/**
 * A repo with no `.git`: the index falls back to glob and has to apply
 * `.gitignore` by hand. Detection does not change, and that is what is
 * verified here.
 */
export const noGit: Fixture = {
  name: 'no-git',
  git: false,
  files: {
    '.gitignore': 'generated/\n',
    'CLAUDE.md': [
      '# No git',
      '',
      'The entrypoint is `src/index.ts`.', // 3: exists
      '',
      'The build ends up in `generated/output.js`.', // 5: ignored, not indexed
      '',
      'Auth lives in `src/lib/auth.ts`.', // 7: does not exist
      '',
    ].join('\n'),
    'src/index.ts': '',
    'generated/output.js': '',
  },
  expected: [
    {
      check: 'path/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 5,
      column: 23,
      text: 'generated/output.js',
      message: 'path does not exist',
      // Known false positive: the file exists on disk but is gitignored, so it
      // never enters the index. SPEC.md § 7 solves this with `knownPaths`,
      // which is M2. It is pinned here as current behaviour, not as desired
      // behaviour.
    },
    {
      check: 'path/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 7,
      column: 16,
      text: 'src/lib/auth.ts',
      message: 'path does not exist',
    },
  ],
}
