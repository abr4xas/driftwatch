# 02: Tag `v0.1.0`, then publish by hand

**What to do:** create the package on npm, once, manually.

**Blocked by:** `01`

**Status:** ready-for-human

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

- `npm view driftwatch` shows `0.1.0` and the file list is 14 files.
- `npx driftwatch@0.1.0 --help` works from a directory that is not this repo — the `bin` path is the one thing no unit test can prove.
- `npx driftwatch@0.1.0` inside some other repo says something sensible.
