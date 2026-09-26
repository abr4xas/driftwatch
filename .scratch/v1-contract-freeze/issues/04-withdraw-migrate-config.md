# 04: `--migrate-config` is withdrawn, with the route written down

**What to build:** the flag comes off the frozen surface, and the way off a module config gets
documented in its place.

This is separate from the other withdrawals because of what it undoes. ADR-0013 withdrew `.ts`,
`.js` and `.mjs` configs **and shipped this flag in the same commit**, on the stated argument
that a withdrawn format with no route off it moves a cost onto users. That flag has existed in
exactly one published release. Removing it without saying anything recreates the cost that ADR
paid to avoid, and a future reader who finds ADR-0013 promising a route and then finds no flag
will reasonably conclude it was lost.

So the route survives the flag: install the last `0.x`, migrate there, then upgrade. It is
recorded where someone hitting the wall will look — the loader already fails loudly on a module
config, and that failure is the right place to say where to go.

**Blocked by:** 01 (the frozen surface)

**Status:** done 2026-09-20. Flag, module and tests gone; the route moved into the loader's
refusal and into ADR-0013. See §"What was built".

- [x] The flag is gone from the help text, the parser and the specification
- [x] A module config still fails loudly, and the failure now names the route off it
- [x] The route is written somewhere a reader of ADR-0013 will find it
- [x] The frozen surface shrinks by that flag and nothing else
- [x] The tests that covered the flag are removed rather than left asserting a hole

## What was built

`src/cli/migrate.ts` and `test/migrate-config.test.ts` are deleted, and the flag is out of
`OPTIONS`, `CliArgs`, the help text, `SPEC.md` § 4 and the guide's options table. Passing it now
gets `unknown option: --migrate-config`, which is what "we do not have this flag" means.

**The route became a version.** The loader's refusal used to say "Run `driftwatch
--migrate-config`", which after this ticket would have been advice to run a flag that does not
exist — worse than saying nothing. It now says `npx @abr4xas/driftwatch@0.5.0 --migrate-config`.
Naming an exact version inside an error message is usually a thing that rots; this one cannot,
because `0.5.0` is the last `0.x` there will ever be, and `npx` needs no install, which is the
same reason the tool is advertised that way in the first place.

ADR-0013 carries the amendment, because that is the document a reader arrives at when they find
a promise of a converter and no converter. Its status line points at the note, and the note says
plainly that they have not found a lost feature.

**One internal went with it.** `findConfig`'s `skip` option existed only so the migration could
ask what the loader would read once the module config was gone. Its single caller is deleted, so
it is deleted — a parameter whose docstring explains it in terms of a withdrawn flag is drift of
exactly the kind this tool reports.

The four assertions in `test/config.test.ts` that matched `/--migrate-config/` now match the
route, through one named constant, so the next time it moves there is one place to edit.

The frozen surface lost one line and nothing else.
