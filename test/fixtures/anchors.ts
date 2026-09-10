import type { Fixture } from '../helpers/fixture.ts'

/**
 * `link/broken`: the anchor half. Same-file and cross-file, resolving and
 * broken, plus the classes the check must **never** claim — a target that does
 * not exist (which is `path/missing`'s finding, so one link produces one
 * line), a target whose headings cannot be parsed, an external url, an empty
 * fragment, a fragment the renderer synthesizes, and a line reference.
 */
export const anchors: Fixture = {
  name: 'anchors',
  files: {
    'CLAUDE.md': [
      '# Project', // 1
      '', // 2
      '## Setup', // 3
      '', // 4
      '## Setup', // 5
      '', // 6
      // The second `## Setup` renders as `setup-1`, which keys to `setup1`.
      'Same file, resolves: [first](#setup) and [second](#setup-1).', // 7
      '', // 8
      'Same file, broken: [gone](#teardown).', // 9
      '', // 10
      'Cross file, resolves: [the flag](./docs/guide.md#the-fix-flag).', // 11
      '', // 12
      'Cross file, broken: [absent](./docs/guide.md#nope).', // 13
      '', // 14
      'An html id resolves: [manual](./docs/guide.md#manual).', // 15
      '', // 16
      'A typo, and the suggestion: [close](./docs/guide.md#instal).', // 17
      '', // 18
      // One finding, from `path/missing`, and it is the one carrying the
      // suggestion. `link/broken` never claims a target that is not there.
      'Target absent, so `path/missing` owns it: [x](./docs/gone.md#anything).', // 19
      '', // 20
      'Not Markdown, no headings to parse: [y](./src/cli.ts#L40).', // 21
      '', // 22
      'External: [z](https://example.com/a.md#nope).', // 23
      '', // 24
      'Empty fragment, a link to the top: [w](./docs/guide.md#).', // 25
      '', // 26
      'Synthesized by the renderer: [t](./docs/guide.md#top).', // 27
      '', // 28
      'A line reference: [l](./docs/guide.md#L12-L20).', // 29
      '', // 30
      'The renderer answers it: [r](./docs/guide.md#readme).', // 31
      '', // 32
      // The prose gates that already hold back path claims hold these back
      // too: `for example` is an EXAMPLE marker in `context-prose.ts`.
      'For example, [e](./docs/guide.md#invented) links a section.', // 33
      '', // 34
      // A document offering no anchor at all is more likely one we failed to
      // read than one whose author linked into nothing.
      'A target offering nothing: [n](./docs/plain.md#anything).', // 35
      '', // 36
      // remark reads MDX without complaining and sees none of the headings a
      // component emits, so the file is refused outright.
      'An MDX target: [m](./docs/page.mdx#anything).', // 37
      '',
    ].join('\n'),
    'docs/guide.md': [
      '# Guide',
      '',
      '## The `--fix` flag',
      '',
      '<a id="manual"></a>',
      '',
      '## Install',
      '',
      '## Rationale',
      '',
      '## Rationale',
      '',
    ].join('\n'),
    'docs/plain.md': 'Just prose, and no heading anywhere in it.\n',
    'docs/page.mdx': '# Page\n',
    'src/cli.ts': '',
  },
  expected: [
    {
      check: 'link/broken',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 9,
      column: 27,
      text: '#teardown',
      message: 'anchor does not exist',
      // Nothing within two edits of `teardown`.
    },
    {
      check: 'link/broken',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 13,
      column: 30,
      text: './docs/guide.md#nope',
      message: 'anchor does not exist',
    },
    {
      check: 'link/broken',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 17,
      column: 37,
      text: './docs/guide.md#instal',
      message: 'anchor does not exist',
      // A single anchor within two edits. Never fixable: see `suggestAnchor`.
      suggestion: { value: '#install', confidence: 0.6, fixable: false },
    },
    {
      check: 'path/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 19,
      column: 47,
      text: 'docs/gone.md',
      message: 'path does not exist',
    },
  ],
}
