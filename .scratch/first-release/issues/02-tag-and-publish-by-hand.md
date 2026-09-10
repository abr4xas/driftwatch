# 02: Tag `v0.1.0`, then publish by hand

**What to do:** create the package on npm, once, manually.

**Blocked by:** `01`

**Status:** done

## The package is `@abr4xas/driftwatch`, and the reason is not ours

The first attempt at `driftwatch` was refused:

```
npm error 403 Package name too similar to existing package drift-watch
```

`drift-watch` is real and it is not a squat: published 2026-03-08, three versions, ten downloads in the last month, and its own niche — it scans **Claude Code, Codex and Gemini CLI conversations** for behavioural patterns, stores them in a Dolt database and asks Claude for corrective strategies. It watches *the agent*; this watches *the document*, offline and with no inference at all. Nothing overlaps except the word.

npm normalises punctuation, so `driftwatch` and `drift-watch` are one name to that check, and the check runs at publish time — a name showing as free in the registry is not a name that can be published.

**Scoping is the only guaranteed answer**, because scoped packages skip the similarity check entirely. What it costs is one longer `npx` invocation; what it does not touch is the command, which `bin` fixes at `driftwatch` regardless of the package name. The repository, the CLI and every document stay as they are.

`publishConfig.access` is `public` in `package.json`, so `npm publish` alone does the right thing — a scoped package is private by default and that default is a footgun on the manual path.

## The tag first, publishing second

```
git tag v0.1.0
git push --tags
```

The release workflow runs on that tag with `NPM_PUBLISH` unset, so it publishes nothing. What it does is prove the tag is releasable: the whole gate again — because a tag can point at a commit CI never saw — the tarball check, and the guard that the tag agrees with `package.json`. It also creates the GitHub Release with notes generated from the commits since the previous tag.

If any of that fails, the tag is wrong and no package was created, which is the point of the order.

## Then, by hand

```
pnpm build
npm publish --access public
```

`prepublishOnly` runs lint, typecheck, tests and build before npm sends anything, so the laptop path has the same gate the workflow does.

**Without `--provenance`.** It needs a supported CI with OIDC and fails locally. The first publish is the only one that ships without it.

## What to check afterwards

- `npm view @abr4xas/driftwatch` shows `0.1.0` and the file list is 14 files.
- `npx @abr4xas/driftwatch@0.1.0 --help` works from a directory that is not this repo — the `bin` path is the one thing no unit test can prove.
- `npx @abr4xas/driftwatch@0.1.0` inside some other repo says something sensible.

## Comments

Closed 2026-09-10. **`@abr4xas/driftwatch@0.1.0` is on npm**, published by hand, without provenance — which is the one thing the first release cannot have.

The `driftwatch` attempt is what produced this ticket's section above:

```
npm error 403 Package name too similar to existing package drift-watch
```

Verified afterwards from a directory that is not this repo, which is the check no unit test can stand in for:

```
$ npx @abr4xas/driftwatch@0.1.0 --version
0.1.0
$ npm view @abr4xas/driftwatch dist.fileCount dist.unpackedSize
14
156432
```

Fourteen files and 156 kB unpacked, matching what `pack:check` had been asserting locally all along. The `bin` resolves, so `driftwatch` is the command a user types no matter what the package is called.
