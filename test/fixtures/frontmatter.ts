import type { Fixture } from '../helpers/fixture.ts'

/**
 * `frontmatter/invalid`: a block that does not parse.
 *
 * It used to have a second half — a known field holding the wrong type — and
 * round twenty-eight withdrew it, so most of the files below are now negative
 * cases and that is deliberate. Every one whose findings are absent from
 * `expected` is something the check has to stay quiet about: a prose block
 * that only looks like frontmatter, a template placeholder, an empty value, a
 * nested key, a field of the wrong type, and the boolean spelled as a word.
 */
export const frontmatter: Fixture = {
  name: 'frontmatter',
  files: {
    // The parse half. `[unclosed` never terminates, and the parser points at
    // the end of the line it started on.
    '.claude/skills/unparseable/SKILL.md': [
      '---',
      'name: [unclosed', // 2
      '---',
      '',
      '# Unparseable',
      '',
    ].join('\n'),

    // A duplicate key is a parse error to `yaml`, and real drift: one of the
    // two values is silently lost.
    '.claude/skills/duplicated/SKILL.md': [
      '---',
      'name: duplicated',
      'description: sends the release to production',
      'name: duplicated-again', // 4
      '---',
      '',
    ].join('\n'),

    // The type half, one per kind that has a table.
    '.claude/skills/mistyped/SKILL.md': [
      '---',
      'name: mistyped',
      'description:', // 3: a list where the format wants a string
      '  - ships things',
      '  - and other things',
      'allowed-tools: [Read, Write]', // 6: a list is documented, so it is fine
      'color: red', // 7: unknown key, which is ticket 07 and not this check
      'metadata:', // 8
      '  description: [nested]', // 9: nested, never claimed
      '---',
      '',
    ].join('\n'),

    '.claude/agents/reviewer.md': [
      '---',
      'name: reviewer',
      'description: reviews a diff and says what is wrong with it',
      'model: 4', // 4: a number where the alias is a string
      'tools:', // 5: a mapping is neither of the two accepted shapes
      '  Read: true',
      '---',
      '',
    ].join('\n'),

    '.claude/commands/ship.md': [
      '---',
      'description: ships the current branch',
      'argument-hint: [environment]', // 3: the bracket idiom, deliberately not claimed
      'disable-model-invocation: [true]', // 4: a list where a boolean belongs
      '---',
      '',
    ].join('\n'),

    '.cursor/rules/style.mdc': [
      '---',
      'description: how this repo writes TypeScript',
      'globs: "*.ts"', // 3: a string is accepted, a list would be too
      'alwaysApply: yes', // 4: a boolean under YAML 1.1, so it is accepted
      '---',
      '',
      'Prefer const.',
      '',
    ].join('\n'),

    // The fourth kind with a table. `sometimes` is not one of the words a
    // YAML 1.1 parser reads as a boolean, so the concession does not cover it.
    '.cursor/rules/loose.mdc': [
      '---',
      'description: when to reach for a rule',
      'alwaysApply: sometimes', // 3
      '---',
      '',
      'Sometimes.',
      '',
    ].join('\n'),

    // A block that is not frontmatter: the first line is a thematic break and
    // what follows is prose. It does not parse as YAML, and reporting it would
    // be reporting our own slicing.
    'CLAUDE.md': ['---', 'Some **bold** prose: [unclosed', '---', '', '# The project', ''].join(
      '\n',
    ),

    // A skill template is not a skill. `{{name}}` parses as a mapping and the
    // file it generates will hold a string.
    '.claude/skills/template/SKILL.md': [
      '---',
      'name: {{name}}',
      'description: {{description}}',
      '---',
      '',
    ].join('\n'),

    /**
     * An empty value asserts no type. "Missing" and "empty" are
     * `skill/frontmatter`'s rules, and reporting them here would double them.
     *
     * The empty key is `license` and not `description` on purpose: an empty
     * `description` is a real `skill/frontmatter` finding, and this fixture is
     * about the other check.
     */
    '.claude/skills/empty/SKILL.md': [
      '---',
      'name: empty',
      'description: A description long enough to say something',
      'license:',
      '---',
      '',
    ].join('\n'),

    // No format defines a frontmatter for a nested CLAUDE.md, so the type of
    // whatever is in one is not ours to judge.
    'packages/api/CLAUDE.md': [
      '---',
      'description:', // no schema for this kind, and empty besides
      '  - one',
      'tools:',
      '  Read: true',
      '---',
      '',
      '# The api',
      '',
    ].join('\n'),
  },
  expected: [
    {
      check: 'frontmatter/invalid',
      severity: 'error',
      file: '.claude/skills/duplicated/SKILL.md',
      line: 4,
      column: 1,
      text: 'name: duplicated-again',
      message: 'invalid YAML: Map keys must be unique',
    },
    {
      check: 'frontmatter/invalid',
      severity: 'error',
      file: '.claude/skills/unparseable/SKILL.md',
      line: 2,
      column: 1,
      text: 'name: [unclosed',
      message:
        'invalid YAML: Flow sequence in block collection must be sufficiently indented and end with a ]',
    },
  ],
}
