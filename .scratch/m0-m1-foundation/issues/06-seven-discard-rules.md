# 06: The seven discard rules of the path extractor

**What to build:** the ticket that decides whether the project is worth it. A context file full of traps —URLs, globs, placeholders, version numbers, `node.js`, paths inside example blocks, quoted text— produces **zero findings**. This is what separates a tool that gets used every day from one that gets uninstalled on first use.

**Blocked by:** 05

**Status:** done

- [x] The seven rules are implemented in the exact order of `docs/spec/ARCHITECTURE.md` § "Path extraction: the detail that defines quality"
- [x] Every discard rule carries a one-line comment explaining **which concrete false positive it prevents** (`AGENTS.md` § Conventions)
- [x] Every discard rule has its own case in the `false-positive-traps` fixture, which is the contract against regression
- [x] **The `false-positive-traps` fixture closes with zero findings.** A single finding there means the ticket is not closed
- [x] Normalization strips a leading `./`, a trailing `:line`, leftover backticks and trailing punctuation
- [x] The blocklist of words that look like files and are not (`node.js`, `next.js`, `nuxt.js`, `vue.js`, a bare `d.ts`) is covered
- [x] When torn between reporting and letting through, the implementation lets through, and the test that pins it says explicitly that this is the intended behaviour

## Comments

**The `false-positive-traps` fixture closes at zero findings.** It covers the four discard rules with their cases, plus three classes of trap that are not rules but consequences of the design: paths inside example code blocks (fences are not scanned), paths in prose without backticks (prose is not scanned), and paths that escape above the repo root.

**Measured effect on this repo.** Before the ticket the run reported three problems, two of them false:

```
✗ 23  .scratch/<feature>/issues/  path does not exist     <- false positive
✗ 46  scripts/corpus.ts           path does not exist     <- true
✗ 70  .scratch/<feature>/         path does not exist     <- false positive
```

After:

```
✗ 46  scripts/corpus.ts  path does not exist
```

The two false positives were `<feature>` placeholders, which now fall under rule 2. The remaining one is true: `scripts/corpus.ts` is created by ticket 10.

**A spec contradiction had to be resolved to implement rule 3.** `SPEC.md` § 3 requires a path to contain a slash; `ARCHITECTURE.md` rule 3 said in a parenthetical that a bare `` `foo.ts` `` was a path. SPEC wins, being the reading with fewer false positives, and it was recorded in **ADR-0003** because it is hard to reverse once corpus snapshots exist. The `ARCHITECTURE.md` parenthetical was corrected.

The cost is a real false negative: a `` `tsconfig.json` `` that does not exist at the root is not reported. That is the trade the project declared it prefers.

**A case I found writing the tests:** normalization can leave something that is no longer path-shaped. `` `a/b:1` `` normalizes to `a/b`, which has no known extension and does not start with a marker, so it is discarded with the reason `not-path-shaped`. Shape is evaluated **after** normalizing, not before.
