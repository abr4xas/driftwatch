import type { Fixture } from '../helpers/fixture.ts'

/** Everything the document claims is true. Expected: zero findings. */
export const happyPath: Fixture = {
  name: 'happy-path',
  files: {
    'CLAUDE.md': [
      '# Project',
      '',
      'The entry point is `src/index.ts` and the tests live in `test/`.',
      '',
      'The config is at `config/app.json`, and the helper at `./src/util/date.ts`.',
      '',
      'A path from the root: `/src/index.ts`.',
      '',
    ].join('\n'),
    'src/index.ts': 'export const x = 1\n',
    'src/util/date.ts': 'export const today = () => new Date()\n',
    'config/app.json': '{}\n',
    'test/index.test.ts': '',
  },
  expected: [],
}
