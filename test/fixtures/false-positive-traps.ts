import type { Fixture } from '../helpers/fixture.ts'

/**
 * The most important fixture in the project. Every block of this document is a
 * trap a naive extractor would report, and **none** of them may produce a
 * finding. A single finding here is a precision regression.
 *
 * Each section corresponds to a discard rule from ARCHITECTURE.md § "Path
 * extraction". The materialized repo deliberately contains none of the
 * mentioned files: if a trap were reported, it would be because the rule
 * failed, not because the file happened to exist.
 */
export const falsePositiveTraps: Fixture = {
  name: 'false-positive-traps',
  files: {
    'CLAUDE.md': [
      '# False positive traps',
      '',
      '## Rule 1: URLs',
      '',
      'The guide is at `https://example.com/docs/guide.md` and the mirror at',
      '`http://cdn.example.com/lib/app.js`. The file protocol too:',
      '`file:///tmp/output/report.json`. And without a protocol: `//cdn.example.com/x.js`.',
      '',
      '## Rule 2: globs and placeholders',
      '',
      'The tests are `src/**/*.test.ts` and the fixtures `test/fixtures/*.json`.',
      'A ticket lives in `.scratch/<feature>/issues/`, the template in',
      '`{{path}}/template.md`, the user config in `$HOME/.config/app.json`,',
      'and each package in `packages/[name]/src`. A question mark counts too:',
      '`docs/page?.md`.',
      '',
      '## Rule 3: bare words',
      '',
      'Every module has its `index.ts`, the config is `tsconfig.json`, the package',
      'manager is `pnpm` and the command is `build`. None of that claims a location.',
      '',
      '## Rule 4: looks like a file and is not',
      '',
      'We run on `node.js` with `next.js` on the front end and `vue.js` in the admin.',
      'The minimum version is `1.0` and the current one `v2.1.3`. Types go in a `d.ts`.',
      '',
      '## Paths inside example blocks',
      '',
      'This is what the output would look like, with paths that do not exist:',
      '',
      '```bash',
      'cat src/made-up/does-not-exist.ts',
      'mv docs/old/guide.md docs/new/guide.md',
      '```',
      '',
      '```',
      'src/also/missing.ts',
      '```',
      '',
      '## Paths in prose, not marked up as code',
      '',
      'The file src/prose/loose.ts is mentioned without backticks, and "other/thing.ts"',
      'in quotes. Prose is not scanned.',
      '',
      '## Paths that escape above the root',
      '',
      'The original brief is at `../other-repo/BRIEF.md` and further up at',
      '`../../shared/notes.md`.',
      '',
      '## What does exist',
      '',
      'The entrypoint is `src/index.ts` and the docs `docs/guide.md`, and both exist,',
      'so they produce no findings either.',
      '',
    ].join('\n'),
    'src/index.ts': 'export const x = 1\n',
    'docs/guide.md': '# guide\n',
  },
  expected: [],
}
