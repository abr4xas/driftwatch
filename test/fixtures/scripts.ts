import type { Fixture } from '../helpers/fixture.ts'

/**
 * `script/missing`: a command whose script the manifest does not offer, one
 * case per runner, and the refusals that keep the check quiet.
 *
 * The negative half is the one that matters. Every "no finding" comment below
 * is a shape a naive parser reports: a subcommand read as a script name, a
 * filtered command resolved against the wrong package, a script defined one
 * directory up.
 */
export const scripts: Fixture = {
  name: 'scripts',
  files: {
    'package.json': JSON.stringify({
      name: 'root',
      scripts: { build: 'tsdown', lint: 'oxlint', 'test:e2e': 'playwright test' },
    }),

    Makefile: ['.PHONY: release docs', 'release:', '\techo shipping', 'docs:', '\techo docs'].join(
      '\n',
    ),

    'deno.json': JSON.stringify({ tasks: { check: 'deno check', fmt: 'deno fmt' } }),

    'CLAUDE.md': [
      '# Root',
      '',
      // 3: a near-miss of `build`, which is the second autofixable finding in
      // the project.
      'Build it with `pnpm run buld`.',
      '',
      // 5: nothing within two edits of `deploy`, so a finding with no suggestion.
      'Ship it with `pnpm run deploy`.',
      '',
      '```bash',
      'pnpm install', // 8: a subcommand, not a script
      'pnpm run lint', // 9: exists
      'make relase', // 10: a near-miss of the Makefile target
      'deno task chek', // 11: a near-miss of the deno task
      'deno task lint', // 12: `deno task` also runs package.json scripts
      'pnpm run relase # a comment is not part of the command', // 13
      '```',
      '',
      // The other three managers, so every form SPEC § 3 lists has a case
      // that fires and not only a unit test.
      'Lint it with `yarn run lnt`.', // 15
      '',
      'Check it with `npm run-script bild`.', // 17
      '',
      'And `bun run tes:e2e`.', // 19
      '',
      '## What the parser refuses to read',
      '',
      'A filtered command names a script in a package we cannot identify, and',
      'the flag counts wherever it sits: `pnpm -F api build`, `pnpm --filter api nope`,',
      '`make -C docs html`, `npm run nope -w api`, `npm run nope --workspace=api`.',
      '',
      'The lifecycle aliases are given up on purpose: `pnpm test`, `npm start`.',
      '',
      'A hole is not a name: `npm run <script>`, `pnpm run {{task}}`.',
      '',
      'A manager we do not know is not ours: `cargo build`, `just nope`.',
      '',
      'And a file being run is not a script: `bun run ./scripts/nope.ts`.',
      '',
      '```python',
      'subprocess.run(["pnpm", "run", "nope"])', // not a shell fence
      '```',
      '',
      '```',
      '$ pnpm run build && pnpm run lint', // a prompt, two commands, both real
      '```',
      '',
    ].join('\n'),

    // The nearest manifest is this one, and it is where the suggestion comes
    // from: `dev` exists nowhere else.
    'packages/api/package.json': JSON.stringify({ name: 'api', scripts: { dev: 'tsx watch' } }),
    'packages/api/CLAUDE.md': [
      '# api',
      '',
      'Run it with `pnpm run dv`.', // 3: near-miss of the nearest manifest
      '',
      // ADR-0005 applied to scripts: `test:e2e` is defined at the root, not
      // here, and a context file written from the root is not drift.
      'Test it with `pnpm run test:e2e`.',
      '',
      'And migrate with `pnpm run migrate`.', // 7: in no manifest at all
      '',
    ].join('\n'),

    // A Makefile with an `include` cannot be enumerated, so every `make` claim
    // resolving to it is dropped.
    'docs/Makefile': ['include ../Makefile', 'html:', '\techo html'].join('\n'),
    'docs/CLAUDE.md': ['# docs', '', 'Build them with `make nope`.', ''].join('\n'),

    // No manifest of any kind in this subtree... except that the root has one,
    // which is exactly why the "nothing to verify against" case needs its own
    // fixture: see `no-manifest` below.
    'src/index.ts': '',
    'scripts/nope.ts': '',
  },
  expected: [
    {
      check: 'script/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 3,
      column: 16,
      text: 'pnpm run buld',
      message: 'script not in package.json',
      suggestion: { value: 'pnpm run build', confidence: 1, fixable: true },
    },
    {
      check: 'script/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 5,
      column: 15,
      text: 'pnpm run deploy',
      message: 'script not in package.json',
    },
    {
      check: 'script/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 10,
      column: 1,
      text: 'make relase',
      message: 'target not in Makefile',
      suggestion: { value: 'make release', confidence: 1, fixable: true },
    },
    {
      check: 'script/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 11,
      column: 1,
      text: 'deno task chek',
      message: 'task not in deno.json',
      suggestion: { value: 'deno task check', confidence: 1, fixable: true },
    },
    {
      check: 'script/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 13,
      column: 1,
      text: 'pnpm run relase',
      message: 'script not in package.json',
    },
    {
      check: 'script/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 16,
      column: 15,
      text: 'yarn run lnt',
      message: 'script not in package.json',
      suggestion: { value: 'yarn run lint', confidence: 1, fixable: true },
    },
    {
      check: 'script/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 18,
      column: 16,
      text: 'npm run-script bild',
      message: 'script not in package.json',
      suggestion: { value: 'npm run-script build', confidence: 1, fixable: true },
    },
    {
      check: 'script/missing',
      severity: 'error',
      file: 'CLAUDE.md',
      line: 20,
      column: 6,
      text: 'bun run tes:e2e',
      message: 'script not in package.json',
      suggestion: { value: 'bun run test:e2e', confidence: 1, fixable: true },
    },
    {
      check: 'script/missing',
      severity: 'error',
      file: 'packages/api/CLAUDE.md',
      line: 3,
      column: 14,
      text: 'pnpm run dv',
      message: 'script not in packages/api/package.json',
      suggestion: { value: 'pnpm run dev', confidence: 1, fixable: true },
    },
    {
      check: 'script/missing',
      severity: 'error',
      file: 'packages/api/CLAUDE.md',
      line: 7,
      column: 19,
      text: 'pnpm run migrate',
      message: 'script not in packages/api/package.json',
    },
  ],
}
