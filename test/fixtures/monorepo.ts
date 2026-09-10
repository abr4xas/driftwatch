import type { Fixture } from '../helpers/fixture.ts'

/**
 * Resolution in a monorepo, with nested `CLAUDE.md` files.
 *
 * This fixture changed when ticket 10 closed. The original version proved that
 * the **same string** (`src/db.ts`) was reported in `packages/web` and not in
 * `packages/api`. That stopped being the behaviour: ADR-0005 decided that a
 * path whose shape exists somewhere in the repo is not reported, because across
 * 13 real repos that was the last large class of false positive.
 *
 * The lost case is still written below, with no expected finding, so that what
 * stopped being detected stays on the record and does not look like an
 * oversight.
 */
export const monorepo: Fixture = {
  name: 'monorepo',
  files: {
    'CLAUDE.md': [
      '# Monorepo',
      '',
      'The shared entrypoint is `src/index.ts`.', // 3: exists at the root
      '',
    ].join('\n'),
    'packages/api/CLAUDE.md': [
      '# api',
      '',
      'The database is `src/db.ts`.', // 3: exists in packages/api
      '',
      'The shared entrypoint is `/src/index.ts`.', // 5: leading slash = repo root
      '',
      'The web app is at `../web/app.ts`.', // 7: exists, one level up
      '',
      'The system config is `/etc/hosts`.', // 9: filesystem path, let through
      '',
      'My local notes: `/Users/someone/notes.md`.', // 11: same
      '',
      'The cache lives in `src/cache/redis.ts`.', // 13: exists in no form
      '',
      // 15: the nearest manifest is `packages/api/package.json` and it has the
      // script, so nothing is reported.
      'Migrate with `pnpm run migrate`.',
      '',
      // 17: a near-miss of that same manifest, which is what proves the
      // resolution is the nearest one and not the root's: `migrate` is defined
      // here only.
      'And seed with `pnpm run migrat`.',
      '',
    ].join('\n'),
    'packages/web/CLAUDE.md': [
      '# web',
      '',
      // ADR-0005: `packages/api/src/db.ts` ends with `/src/db.ts`, so this
      // line produces NO finding. It is the case that stopped being detected:
      // a file that moved between packages. It cannot be told apart from a
      // document speaking relatively about the other package.
      'The database is `src/db.ts`.', // 7
      '',
      'The app is `app.ts` and lives next door.', // 9: bare word, discarded
      '',
    ].join('\n'),
    'src/index.ts': '',
    'packages/api/src/db.ts': '',
    'packages/web/app.ts': '',
    'package.json': JSON.stringify({ name: 'root', scripts: { build: 'tsdown' } }),
    'packages/api/package.json': JSON.stringify({ name: 'api', scripts: { migrate: 'tsx x.ts' } }),
  },
  expected: [
    {
      check: 'path/missing',
      severity: 'error',
      file: 'packages/api/CLAUDE.md',
      line: 13,
      column: 21,
      text: 'src/cache/redis.ts',
      message: 'path does not exist',
      // No suggestion: there is no `redis.ts` anywhere in the repo.
    },
    {
      check: 'script/missing',
      severity: 'error',
      file: 'packages/api/CLAUDE.md',
      line: 17,
      column: 16,
      text: 'pnpm run migrat',
      message: 'script not in packages/api/package.json',
      suggestion: { value: 'pnpm run migrate', confidence: 1, fixable: true },
    },
  ],
}
