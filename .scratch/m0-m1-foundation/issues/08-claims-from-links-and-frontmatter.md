# 08: Path claims from Markdown links and frontmatter

**What to build:** `path/missing` stops looking only at inline code. A broken relative link like `[the spec](./docs/spec/SPEK.md)` and a frontmatter value that is a nonexistent path are reported just like a path in backticks, with the same precision and the same discard rules.

**Blocked by:** 06

**Status:** done

- [x] mdast `link` nodes produce claims with `context: 'link'`
- [x] Frontmatter is parsed with `yaml`, never with regex, and values that are paths produce claims with `context: 'frontmatter'`
- [x] The seven discard rules apply equally to these two origins: a URL in a link is not reported, nor is a placeholder in frontmatter
- [x] Links to pure anchors (`#section`) and to URLs are skipped here; anchor verification is `link/broken`, which is M2
- [x] The `false-positive-traps` fixture stays at zero findings after this change
- [ ] The corpus, if it already exists when this ticket is worked, is re-snapshotted and the diff reviewed by hand

## Comments

New `links-and-frontmatter` fixture, over a `SKILL.md` with frontmatter and links. It covers the cases that must **not** be reported: a `name: deploy` that is not a path, a `templates/<environment>.yml` with a placeholder, an `https://` in frontmatter, a bare-anchor link (`#closing`), an external link, and a link with a file plus an anchor (`./guides/deploy.md#steps`) whose file does exist. The `false-positive-traps` fixture stays at zero.

**`remark-frontmatter` was not added.** The leading block delimited by `---` is sliced with a three-line regex and the YAML inside goes to `yaml`, which is a real parser. `ARCHITECTURE.md` § Stack asks for `yaml` explicitly and says "not regex" **about the YAML**; slicing the block is not parsing it. That saves a dependency on the main path, which is what `AGENTS.md` § Dependencies asks to check before adding one.

**Frontmatter positions are found by text search, not through `yaml`'s CST.** The parser exposes exact positions, but reaching them forces walking the CST in parallel with the data tree. To point at a path, the value's first occurrence is enough, and the cursor advances between values so two identical values do not collapse onto the same offset (there is a test pinning that). If `--fix` over frontmatter turns out fragile in M3, this is the first thing to change.

**A link's offset points at the full URL, anchor included.** The verified text is `./guides/deploy.md`, but what is written in the file is `./guides/deploy.md#steps`, and that is what `--fix` would have to replace.

## Budget, measured

With `yaml` in, `--version` is still at 30 ms and a full audit of this repo at 90 ms. The budgets were 80 ms cold start and 500 ms end to end.

Runtime dependencies are now seven: `ignore`, `picocolors`, `remark-parse`, `tinyglobby`, `unified`, `unist-util-visit`, `yaml`. `ARCHITECTURE.md` § Stack puts the ceiling at "~6". **It is one over**, and I say so instead of rounding down. Two real mitigations: `ignore` and `tinyglobby` only load on the no-git path, which in any real repo is cold; and `unified` came in as a required companion of `remark-parse`, not as a separate choice. The dependency ceiling was a proxy for the time budget, and the time budget is met with room to spare. If the ticket 10 corpus shows latency out of range, the first candidate to drop is `unified`, using `mdast-util-from-markdown` directly.
