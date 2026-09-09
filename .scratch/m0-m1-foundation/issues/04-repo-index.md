# 04: `RepoIndex` with `git ls-files` and a glob fallback

**What to build:** the piece the whole performance budget depends on. It is built once per run and from then on every verification is an in-memory lookup. It can be demonstrated with a command that prints the index size and how long it took to build.

**Blocked by:** 01

**Status:** done

- [x] `RepoIndex` has the shape from `docs/spec/ARCHITECTURE.md` § "The repo index": `files`, `dirs`, `byBasename`, `manifests`
- [x] It is built with `git ls-files` when there is a repo, because that already respects the ignores and is faster
- [x] There is a `tinyglobby` fallback when there is no `.git`, honouring `.gitignore` by hand; covered by the `no-git` fixture
- [x] It is a struct with functions, not a class (`AGENTS.md` § Conventions)
- [x] `byBasename` is a `Map` of arrays; the fuzzy search never runs over the whole index
- [x] No `fs.stat` call on the hot path: lookups are O(1)
- [x] `manifests` maps a directory to a parsed `package.json`, resolving the nearest one upwards for monorepos
- [x] There is a budget test: on a synthetic repo of 5,000 files, building the index stays under 200 ms

## Comments

This was worked on before 02 despite the higher number: both were unblocked by 01, and doing source discovery first would have meant writing a file walk this ticket replaces.

Two things that changed relative to the plan:

- **`buildRepoIndex` is async.** The first version was synchronous and loaded `tinyglobby` and `ignore` with `require()`. The tests passed because vitest transforms it, but the ESM bundle would have failed at runtime. The dynamic import forces `async` and is what "pure ESM" in `AGENTS.md` really asks for.
- **The `ignore` dependency was added.** The no-git fallback has to apply `.gitignore` by hand, and writing our own gitignore matcher is exactly the class of heuristic that generates the false positives the project cannot afford. It loads only on the no-git path, which in any real repo is cold, so it does not touch the startup budget.

`NEVER_WALK` applies with and without git, not just as a glob pattern: a repo may have `dist/` committed and its contents still are not a source.
