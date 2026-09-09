# 05: `path/missing` end-to-end (tracer bullet)

**What to build:** the first real finding. A `CLAUDE.md` mentioning `` `src/lib/auth.ts` `` in inline code, when that file does not exist, produces an error line with the right file, line and column, and the process exits 1. It is the full vertical slice: discover, parse, extract, verify, report.

Deliberately minimal on heuristics: here we only extract from inline code and apply the shape rules of `docs/spec/SPEC.md` § 3 (`path/missing`) to decide what *is* a path. The seven discard rules are ticket 06.

**Blocked by:** 02, 04

**Status:** done

- [x] Parsing uses mdast (`remark-parse` + `unist-util-visit`), never regex over raw text, for the reason in `docs/spec/ARCHITECTURE.md` § "Markdown parsing": we need the node's context
- [x] The `Source`, `Claim`, `Finding` and `Verdict` types match `docs/spec/ARCHITECTURE.md` § "Data model", including `offset`, which is what will enable `--fix` later
- [x] Every `Claim` records its `context` (`inline-code`, `code-fence`, `link`, `frontmatter`, `prose`)
- [x] Raw prose is not scanned
- [x] A finding renders with the exact format from `docs/spec/SPEC.md` § 5, with the fragment truncated to 40 characters with `…`
- [x] `line` and `column` are 1-indexed and point at the fragment, verified in a fixture with exact positions
- [x] The `happy-path` fixture exists with zero findings and the `broken-paths` fixture with its expected findings
- [x] The check is registered with the `Check` shape from `docs/spec/ARCHITECTURE.md` § Extensibility, in a static registry

## Comments

**The first real run over this repo, exactly as it came out:**

```
AGENTS.md
  ✗ 23  .scratch/<feature>/issues/  path does not exist
  ✗ 46  scripts/corpus.ts           path does not exist
  ✗ 70  .scratch/<feature>/         path does not exist

1 file · 3 problems (3 errors) · 36ms
```

One of the three is a real problem: `scripts/corpus.ts` does not exist yet, ticket 10 creates it. **The other two are false positives**, from `<feature>` placeholders the corresponding discard rule does not filter yet. That is exactly ticket 06, and it is the evidence of why it exists.

Three decisions that were not in the plan:

- **The fixtures are declared as data, not as committed files.** `ARCHITECTURE.md` § Testing said `test/fixtures/<scenario>/` with a real mini-repo and an `expected.json`. If the fixtures lived in the tree, driftwatch run over its own repo would discover them as sources and report the paths that are broken on purpose, and the "driftwatch on driftwatch" CI step would exit 1 forever. Now a fixture is a `.ts` declaring the file map and the expected findings, and a helper materializes it in a temporary directory. `ARCHITECTURE.md` was updated.
- **The pipeline is loaded with a dynamic import.** When `remark-parse` landed, the cold start of `--version` jumped from 30 ms to between 50 and 90, against an 80 ms ceiling. `main()` now imports `run`, the reporter and the colors dynamically, after resolving `--help` and `--version`. It went back to 30 ms. This is reservation #2 of ticket 01, closed out of necessity rather than tidiness.
- **The known-extensions list is explicit.** A `/\.\w+$/` would have accepted `v1.2` and `node.js` as files. The allowlist costs maintenance and avoids that whole class of false positive.

**The "driftwatch on driftwatch" CI step was left as `continue-on-error`,** because this repo has known drift. It becomes blocking once the run comes out clean.

Resolution against `baseDir` ended up implemented here because it was the obvious implementation of `resolveInRepo`. Ticket 09 is not left empty: it takes the edge cases (leading slash, escaping the root) and the monorepo fixture that demonstrates them.
