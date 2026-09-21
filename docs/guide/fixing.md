# Fixing what it finds

```bash
driftwatch --fix --dry-run    # what it would change
driftwatch --fix              # change it
```

`--fix` applies the corrections that are **not a guess**, and only when there is exactly one candidate above 0.8 confidence.

| Check | What gets rewritten |
|---|---|
| `path/missing` | the path, when one file in the repo has that name and sits somewhere close to where the document says |
| `script/missing` | the command, when one script in the nearest manifest is within two edits of the one written |

<a id="what-is-never-rewritten"></a>

## What is never rewritten

**A broken anchor and a mistyped frontmatter value.** Both were held back deliberately. Where the correction is obvious the tool already accepts the line and reports nothing, so what is left to report is a real typo whose target would be a guess. The only frontmatter finding in 66 real repositories was an unquoted `description:` whose text already contained double quotes — quoting it would mean escaping them, and a `--fix` that escapes is a YAML serializer.

**A relative path in a document that is not at the repo root.** Such a document writes half its paths against its own directory and half against the repo root, with no syntactic signal separating them. Reporting can accept both readings, because that only costs detections; writing cannot, because picking one rewrites the path into the other. You still get the finding and the suggestion; you apply it yourself.

This is a false negative with a number attached, and the number is honest: across the 66-repo corpus, the rule refused **zero** fixes. That is the absence of evidence that it is expensive, not evidence that it is cheap.

## What a fix never does

It replaces the claim and **nothing around it**. A `./` prefix, a `#anchor`, a `:42` line reference and the backticks all survive, because they sit outside the replaced range rather than being re-applied after it. Line endings, a missing trailing newline and the alignment of a table survive for the same reason: nothing outside the replaced bytes is looked at, let alone rewritten.

Every branch checks the bytes it is about to overwrite before writing them — an offset that has drifted from the content produces no edit at all. That guard exists because the claim's range is *not* the fix range for a path claim from a Markdown link: it spans the whole url, so an edit inheriting it would delete the `#anchor`.

Two fixes that would land on the same fragment cancel each other out rather than one winning: two findings on one claim is a bug upstream, and resolving it quietly would both hide the bug and write on a guess.

It does not touch a file when there is nothing to apply — not even to identical bytes, which would make every watcher in your editor fire. And a byte-identical `CLAUDE.md` beside your `AGENTS.md` is fixed too, so the two stay copies.

## It tells you when there is no way back

If a file it is about to edit has uncommitted changes, it says so **before** editing it, and edits it anyway:

```console
$ driftwatch --fix
driftwatch: uncommitted changes in AGENTS.md
```

`git checkout -- .` is the one real way back from a fix you did not want, and it only exists if the file was clean. This is not a git tool: it does not stage, commit, refuse, or offer to stash. The warning goes to stderr, so it never lands in the middle of `--format json` output.

## Afterwards

The exit code reflects what **remains** after fixing, and that is measured by running the whole audit again rather than by subtracting what was applied. Subtracting is fast and goes wrong the moment a fix changes what another check sees.

So running `--fix` twice is a no-op: the second run finds nothing to fix and writes nothing. That is the honest reading of idempotence — not that the second write produces the same bytes, but that the first one made the claims true.

## Reading the plan from a program

`--fix --dry-run --format json` carries the byte range of every edit it would apply, and `--format sarif` carries the same thing as a native SARIF fix. See [output.md](./output.md#the-fix-plan).
