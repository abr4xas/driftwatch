import type { Fixture } from '../helpers/fixture.ts'

/**
 * The other two sources of path claims: relative Markdown links and frontmatter
 * values. The discard rules apply just as they do to inline code, so the traps
 * in this document produce no findings either.
 */
export const linksAndFrontmatter: Fixture = {
  name: 'links-and-frontmatter',
  files: {
    '.claude/skills/deploy/SKILL.md': [
      '---',
      'name: deploy', // 2: not a path
      'description: ships the current branch to production',
      'script: ./scripts/release.sh', // 4: does not exist
      'reference: guides/deploy.md', // 5: exists, relative to the baseDir
      'template: templates/<environment>.yml', // 6: placeholder, discarded
      'site: https://example.com/deploy.html', // 7: URL, discarded
      '---',
      '', // 9
      '# Deploy', // 10
      '', // 11
      'See [the guide](./guides/deploy.md) and [the runbook](./guides/runbook.md).', // 12
      '', // 13
      'A bare anchor claims no path: [at the end](#closing).', // 14
      '', // 15
      'With an anchor and a file: [the section](./guides/deploy.md#steps).', // 16
      '', // 17
      'External: [the docs](https://example.com/a.md).', // 18
      '', // 19
      '## Closing', // 20
      '',
    ].join('\n'),
    '.claude/skills/deploy/guides/deploy.md': '# guide\n',
  },
  expected: [
    {
      check: 'path/missing',
      severity: 'error',
      file: '.claude/skills/deploy/SKILL.md',
      line: 4,
      column: 9,
      text: 'scripts/release.sh',
      message: 'path does not exist',
    },
    {
      check: 'path/missing',
      severity: 'error',
      file: '.claude/skills/deploy/SKILL.md',
      line: 12,
      column: 55,
      text: 'guides/runbook.md',
      message: 'path does not exist',
      // No suggestion: there is no `runbook.md` anywhere in the repo.
      // `deploy.md` is not a candidate because the search starts from the
      // basename, not from resemblance.
    },
    {
      // Broken since this fixture was written, and nothing reported it until
      // `link/broken` existed: `guides/deploy.md` holds one heading, `# guide`.
      // No suggestion, because `guide` is four edits away from `steps`.
      check: 'link/broken',
      severity: 'error',
      file: '.claude/skills/deploy/SKILL.md',
      line: 16,
      column: 42,
      text: './guides/deploy.md#steps',
      message: 'anchor does not exist',
    },
  ],
}
