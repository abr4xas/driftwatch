import type { Fixture } from '../helpers/fixture.ts'

/**
 * The three directive forms of `SPEC.md` § 7, and the three cases that must
 * **not** silence anything: a directive inside a code fence, a directive
 * naming a check that did not fire, and a bare directive on a line with no
 * claim on it.
 *
 * The paths are all under `src/lib/` on purpose. The first draft used
 * `src/planned/`, and every finding vanished: `planned` is a prose marker
 * (`context-prose.ts`), so the *path* was disclaiming its own claim.
 */
export const ignores: Fixture = {
  name: 'ignores',
  files: {
    'CLAUDE.md': [
      '# Project', // 1
      '', // 2
      '<!-- driftwatch-ignore-next-line -->', // 3
      'The parser is at `src/lib/parser.ts`.', // 4
      '', // 5
      'The formatter is at `src/lib/format.ts` <!-- driftwatch-ignore -->', // 6
      '', // 7
      'One id: `src/lib/lint.ts` <!-- driftwatch-ignore path/missing -->', // 8
      '', // 9
      'A namespace: `src/lib/emit.ts` <!-- driftwatch-ignore path -->', // 10
      '', // 11
      'Two ids: `src/lib/two.ts` <!-- driftwatch-ignore dep/missing,path/missing -->', // 12
      '', // 13
      // Fires: the directive names a check that did not produce this finding.
      'Another check: `src/lib/other.ts` <!-- driftwatch-ignore dep/missing -->', // 14
      '', // 15
      'The syntax is:', // 16
      '', // 17
      // Fires below: this parses as a code fence, never as HTML, so an example
      // of the syntax stays an example. It is why mdast is used and not a regex.
      '```markdown', // 18
      '<!-- driftwatch-ignore-file -->', // 19
      '```', // 20
      '', // 21
      'The reader is at `src/lib/read.ts`.', // 22
      '', // 23
      // Fires below: a bare directive alone on its own line covers that line,
      // and there is no claim on it. `-next-line` is what reaches downwards.
      '<!-- driftwatch-ignore -->', // 24
      '', // 25
      'The writer is at `src/lib/write.ts`.', // 26
      '',
    ].join('\n'),
    'NOTES.md': '',
    'src/index.ts': '',
  },
  expected: [
    {
      check: 'path/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 14,
      column: 17,
      text: 'src/lib/other.ts',
      message: 'path does not exist',
    },
    {
      check: 'path/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 22,
      column: 19,
      text: 'src/lib/read.ts',
      message: 'path does not exist',
    },
    {
      check: 'path/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 26,
      column: 19,
      text: 'src/lib/write.ts',
      message: 'path does not exist',
    },
  ],
}
