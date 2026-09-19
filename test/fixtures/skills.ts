import type { Fixture } from '../helpers/fixture.ts'

/**
 * `skill/frontmatter`: the five structural rules of `SPEC.md` § 3, and the
 * cases where a structure that looks wrong is not this check's to report.
 *
 * `ARCHITECTURE.md` § Testing has listed this fixture since before there was
 * code for it.
 */
export const skills: Fixture = {
  name: 'skills',
  files: {
    /**
     * Valid, and deliberately carrying two keys the known list has never
     * heard of: `version` and `x-team`. Neither resembles a known key, so
     * neither is reported — that is the whole point of the near-miss rule.
     */
    '.claude/skills/deploy/SKILL.md': [
      '---',
      'name: deploy',
      'description: Ships the current branch to production and waits for the health check',
      'allowed-tools: Bash(git push:*)',
      'license: MIT',
      'version: 2',
      'x-team: platform',
      '---',
      '',
      '# Deploy',
      '',
    ].join('\n'),

    // Missing one required field.
    '.claude/skills/undescribed/SKILL.md': ['---', 'name: undescribed', '---', ''].join('\n'),

    // Missing both: one finding, not two.
    '.claude/skills/bare/SKILL.md': ['---', 'license: MIT', '---', ''].join('\n'),

    // No block at all: one finding, and the two absent fields are not
    // enumerated on a file that has nowhere to put them.
    '.claude/skills/blockless/SKILL.md': ['# Blockless', '', 'It has no frontmatter.', ''].join(
      '\n',
    ),

    // The one autofixable finding in the project: the directory is the
    // identity Claude Code invokes, and there is exactly one of them.
    '.claude/skills/publish/SKILL.md': [
      '---',
      'name: release',
      'description: Publishes the built package to the registry and tags the commit',
      '---',
      '',
    ].join('\n'),

    /**
     * The same mismatch with a directory that is not kebab-case: reported, and
     * **no suggestion**. Correcting the name to `Do_It` would trade this
     * finding for the kebab-case one, and a fix whose output is a finding is
     * not a fix (SPEC § 8).
     */
    '.claude/skills/Do_It/SKILL.md': [
      '---',
      'name: do-it',
      'description: Does it, with a description long enough to pass',
      '---',
      '',
    ].join('\n'),

    /**
     * A skill legitimately called `skills` keeps the rule: the skills root is
     * recognised by the parent's whole path, not by its name. Without that,
     * this mismatch would go unreported.
     */
    '.claude/skills/skills/SKILL.md': [
      '---',
      'name: nope',
      'description: Is called skills, which is a directory name we recognise',
      '---',
      '',
    ].join('\n'),

    /**
     * A `SKILL.md` sitting in the skills root has no directory of its own, so
     * the rule that compares the two has nothing to compare and stays quiet.
     */
    '.claude/skills/SKILL.md': [
      '---',
      'name: rootless',
      'description: Sits in the skills root, with a long enough description',
      '---',
      '',
    ].join('\n'),

    /**
     * A name that is not kebab-case **and agrees with its directory**. This is
     * the only shape in which the kebab rule fires on its own: when the name
     * disagrees with the directory, the directory finding carries the fix and
     * this one would be noise about a name that is being replaced anyway.
     */
    '.claude/skills/Ship_It/SKILL.md': [
      '---',
      'name: Ship_It',
      'description: Ships the thing, with a description long enough to pass',
      '---',
      '',
    ].join('\n'),

    // Empty and too short. Separate files, because one claim yields one
    // finding — an empty value is the absence of a value, for either field.
    '.claude/skills/nameless/SKILL.md': [
      '---',
      'name:',
      'description: Does the thing, with a description long enough to pass',
      '---',
      '',
    ].join('\n'),
    '.claude/skills/unsaid/SKILL.md': ['---', 'name: unsaid', 'description:', '---', ''].join('\n'),
    '.claude/skills/terse/SKILL.md': [
      '---',
      'name: terse',
      'description: Ships it',
      '---',
      '',
    ].join('\n'),

    /**
     * Near-misses of a known key, in both shapes. The list form is the
     * commonest spelling of `allowed-tools`, and gating the rule on the value
     * being a string is how it went unreported in the first draft: this rule
     * does not read the value at all.
     */
    '.claude/skills/mistyped/SKILL.md': [
      '---',
      'name: mistyped',
      'description: Does the thing, with a description long enough to pass',
      'allowed_tools: [Read, Bash]', // 4
      'licence: MIT', // 5
      '---',
      '',
    ].join('\n'),

    // A template is not a skill. Nothing here is claimed, by any check.
    '.claude/skills/template/SKILL.md': [
      '---',
      'name: {{name}}',
      'description: {{description}}',
      '---',
      '',
    ].join('\n'),

    /**
     * The same two shapes under `.agents/skills/`, which is where `npx skills
     * add` installs by default and where the corpus keeps most of its skills.
     *
     * The rootless one is the regression guard: `skillDirectoryOf` used to
     * recognise the skills root by the literal string `.claude/skills`, so a
     * `SKILL.md` sitting in any other root had its name compared against
     * `skills` and was reported for not matching a container.
     */
    '.agents/skills/SKILL.md': [
      '---',
      'name: rootless-elsewhere',
      "description: Sits in a skills root that is not Claude Code's, and is fine",
      '---',
      '',
    ].join('\n'),
    '.agents/skills/renamed/SKILL.md': [
      '---',
      'name: was-called-this',
      'description: The directory was renamed and the frontmatter was not, which is drift',
      '---',
      '',
    ].join('\n'),

    // The block does not parse: one finding, and it is `frontmatter/invalid`'s.
    // There is no structure to read, so this check stays silent.
    '.claude/skills/unparseable/SKILL.md': ['---', 'name: [unclosed', '---', ''].join('\n'),

    // Same shapes in the kinds this check knows nothing about: a name that
    // matches no directory, and a description of four characters.
    '.claude/agents/reviewer.md': [
      '---',
      'name: someone-else',
      'description: Revs',
      '---',
      '',
    ].join('\n'),
    '.claude/commands/ship.md': ['---', 'description: Go', '---', ''].join('\n'),
  },
  expected: [
    {
      check: 'skill/frontmatter',
      severity: 'error',
      file: '.agents/skills/renamed/SKILL.md',
      line: 2,
      column: 1,
      text: 'name',
      message: 'name does not match the directory',
      suggestion: { value: 'renamed', confidence: 1, fixable: true },
    },
    {
      check: 'skill/frontmatter',
      severity: 'error',
      file: '.claude/skills/bare/SKILL.md',
      line: 1,
      column: 1,
      text: '---',
      message: 'frontmatter has no name or description',
    },
    {
      check: 'skill/frontmatter',
      severity: 'error',
      file: '.claude/skills/blockless/SKILL.md',
      line: 1,
      column: 1,
      text: '# Blockless',
      message: 'frontmatter is missing',
    },
    {
      check: 'skill/frontmatter',
      severity: 'error',
      file: '.claude/skills/Do_It/SKILL.md',
      line: 2,
      column: 1,
      text: 'name',
      message: 'name does not match the directory',
    },
    {
      check: 'skill/frontmatter',
      severity: 'error',
      file: '.claude/skills/mistyped/SKILL.md',
      line: 4,
      column: 1,
      text: 'allowed_tools',
      message: 'unknown key',
      suggestion: { value: 'allowed-tools', confidence: 0.6, fixable: false },
    },
    {
      check: 'skill/frontmatter',
      severity: 'error',
      file: '.claude/skills/mistyped/SKILL.md',
      line: 5,
      column: 1,
      text: 'licence',
      message: 'unknown key',
      suggestion: { value: 'license', confidence: 0.6, fixable: false },
    },
    {
      check: 'skill/frontmatter',
      severity: 'error',
      file: '.claude/skills/nameless/SKILL.md',
      line: 2,
      column: 1,
      text: 'name',
      message: 'name is empty',
    },
    {
      check: 'skill/frontmatter',
      severity: 'error',
      file: '.claude/skills/publish/SKILL.md',
      line: 2,
      column: 1,
      text: 'name',
      message: 'name does not match the directory',
      suggestion: { value: 'publish', confidence: 1, fixable: true },
    },
    {
      check: 'skill/frontmatter',
      severity: 'error',
      file: '.claude/skills/Ship_It/SKILL.md',
      line: 2,
      column: 1,
      text: 'name',
      message: 'name is not kebab-case',
    },
    {
      check: 'skill/frontmatter',
      severity: 'error',
      file: '.claude/skills/skills/SKILL.md',
      line: 2,
      column: 1,
      text: 'name',
      message: 'name does not match the directory',
      suggestion: { value: 'skills', confidence: 1, fixable: true },
    },
    {
      check: 'skill/frontmatter',
      severity: 'error',
      file: '.claude/skills/terse/SKILL.md',
      line: 3,
      column: 1,
      text: 'description',
      message: 'description is shorter than 20 characters',
    },
    {
      check: 'skill/frontmatter',
      severity: 'error',
      file: '.claude/skills/undescribed/SKILL.md',
      line: 1,
      column: 1,
      text: '---',
      message: 'frontmatter has no description',
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
    {
      check: 'skill/frontmatter',
      severity: 'error',
      file: '.claude/skills/unsaid/SKILL.md',
      line: 3,
      column: 1,
      text: 'description',
      message: 'description is empty',
    },
  ],
}
