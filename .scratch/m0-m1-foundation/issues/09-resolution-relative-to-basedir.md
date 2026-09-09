# 09: Resolution relative to each source's `baseDir`

**What to build:** a nested `CLAUDE.md` talks about its own directory, not the root. A `packages/api/CLAUDE.md` mentioning `` `src/db.ts` `` is verified against `packages/api/src/db.ts`, and therefore **not** reported when that file exists. Without this, any monorepo generates an avalanche of false positives.

**Blocked by:** 05

**Status:** done

- [x] Every path claim resolves against its source's `baseDir`, per `docs/spec/SPEC.md` § 2
- [x] Paths starting with `/` are treated as relative to the repo root, not to the filesystem
- [x] An absolute path outside the repo is discarded
- [x] There is a fixture with nested `CLAUDE.md` files where the same text string is valid in one directory and invalid in another
- [x] The `file` in the JSON and `pretty` output stays relative to the repo root, not to the `baseDir`

## Comments

`monorepo` fixture with three nested `CLAUDE.md` files, where **the same string** (`` `src/db.ts` ``) is true in `packages/api` and false in `packages/web`. A `no-git` fixture was added too, exercising the glob fallback.

**The fixture uncovered a real precision problem in ticket 07's scoring.** The suggestion for `packages/web/src/db.ts` was `packages/api/src/db.ts` with **confidence 1 and `fixable: true`**, that is: `--fix` would have rewritten the `web` package's document to point at a file in the `api` package. A wrong autofix.

The cause was that `parentSimilarity` measured segment overlap **as a set**: `packages/web/src` and `packages/api/src` share two of three, so it gave 0.667. But the segment that differs is exactly the one identifying the package. It was changed to **common prefix** — how far they agree before diverging — which gives 0.333 and leaves the suggestion at 0.6, not fixable. The ticket 07 cases still give the same results.

This is what the monorepo fixture was there to find, and it found it.

**A leading slash is ambiguous and is settled by looking at the first segment.** `` `/src/index.ts` `` almost always means "from the repo root", but `` `/etc/hosts` `` or `` `/Users/someone/notes.md` `` are filesystem paths belonging to whoever wrote the document. If the first segment exists at the repo root, it is verified; otherwise, it is let through. The cost is a false negative (`/new-dir/x.ts` is not reported); the benefit is never reporting another machine's absolute path, which would be guaranteed noise in any document written by a person.

## Two things that went wrong and stay on the record

1. **The monorepo fixture was imported but never ran, and the suite stayed green.** Prettier had reformatted the registry array across several lines and my edit did not match, so the `import` landed and the array entry did not. The registry was changed to `test/fixtures/index.ts` with a test comparing the list against the files in the directory: a fixture someone forgets to register now fails the suite.

2. **`no-git` pins a known false positive as current behaviour.** A `generated/output.js` that exists on disk but is gitignored does not enter the index, so it is reported as missing. `SPEC.md` § 7 solves it with `knownPaths`, which is M2. The fixture documents it as what happens today, not as what should happen.
