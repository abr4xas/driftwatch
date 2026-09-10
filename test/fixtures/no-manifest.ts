import type { Fixture } from '../helpers/fixture.ts'

/**
 * The other half of `script/missing`'s "no manifest means silence" rule: a repo
 * with no `package.json`, `Makefile` or `deno.json` at all has nothing to
 * verify a command against, so the check says nothing rather than reporting
 * every command in the document.
 *
 * It is a fixture of its own because the `scripts` one has three manifests, and
 * this rule is only visible where there are none.
 */
export const noManifest: Fixture = {
  name: 'no-manifest',
  files: {
    'CLAUDE.md': [
      '# No manifest',
      '',
      'Build with `pnpm run build`, or `make all`, or `deno task check`.',
      '',
      'There is nothing to verify any of that against.',
      '',
    ].join('\n'),
    'src/index.ts': '',
  },
  expected: [],
}
