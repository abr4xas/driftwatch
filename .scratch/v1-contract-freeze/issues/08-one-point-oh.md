# 08: 1.0.0

**What to build:** the release itself. The surface is honest, the contract is written down, and
the artifact that pins it is committed and passing — so this ticket is the version bump and
whatever the repository's own guards drag along with it.

They will drag a fair amount, and that is the design. The guard that holds every file
advertising a release to the version in the manifest will go red across six documents including
the one-page site, because a previous release taught it to. The site's figures are generated and
tested, so the page follows. Let the tests name the work rather than hunting for it.

This is one release and not two: the cleanup and the freeze ship together, because `0.x` is the
last time removing something is free and a release whose whole changelog is removals followed by
one whose changelog is "the number changed" tells the story in halves.

Merging, tagging and publishing are Angel's. This ticket stops at a commit.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07

**Status:** ready-for-agent

- [ ] The manifest reads `1.0.0`
- [ ] Every document advertising the action's ref names the new tag
- [ ] The site advertises the new version
- [ ] The full gate passes: lint, typecheck, tests, build, help, driftwatch on itself and on its
      own documentation, and the packaging check
- [ ] The corpus check runs over the whole corpus and no snapshot moves
- [ ] Nothing is tagged, pushed or published
