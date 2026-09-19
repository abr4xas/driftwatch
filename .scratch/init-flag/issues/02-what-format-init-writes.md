# 02: What `--init` writes, and why a `.ts` in a Go repo is wrong

**What to build:** `--init` stops assuming the repo is a TypeScript one. The direction is a language-neutral config by default — JSON was the first proposal, YAML is the one that survives the objections — and what it costs is what this ticket weighs.

**Blocked by:** nothing. Ticket `01` shipped the flag and the template.

**Status: done.** `src/cli/init.ts` writes `driftwatch.config.yaml`, and ADR-0013 later
withdrew the `.ts` and `.js` loaders entirely, so the format this ticket argued against is
no longer loadable at all. The status line said `ready-for-agent` until 2026-09-19, which was
stale bookkeeping: the work shipped with the config-format change and nobody came back to the
file.

**Decided 2026-09-12: YAML.**

## The problem

`--init` writes `driftwatch.config.ts`, always. `SPEC.md` § 4 says so literally, so the implementation is not wrong against the specification — the specification is what is being questioned.

driftwatch audits `AGENTS.md` in Go, Rust and Python repos exactly as well as in Node ones; nothing in discovery or in the checks needs a `package.json`. So the tool is language-neutral and its own config scaffolding is not. A `.ts` file at the root of a Cargo workspace is an artefact nobody there can explain, and in a repo that *does* use TypeScript it is worse than odd: it can land inside the `tsconfig` include, the lint glob and the build.

`loadConfig` already accepts `.json` and the `driftwatch` key in `package.json`. The formats exist; `--init` just never offers them.

## What makes this more than a file extension

**JSON has no comments, and the template is mostly comments.** Ticket `01`'s ordering decision was that `ignore`, `knownPaths` and `staleThreshold` get written **commented out, each naming what makes it real**, so the generated file cannot promise more than the code delivers. Strict JSON cannot express that. Whatever this ticket decides, it decides what happens to that guarantee — dropping it silently is not one of the options.

**`$schema` is currently a fatal error.** Unknown keys fail the run by design, and `$schema` is unknown, so the one mechanism that would give a JSON config editor completion and inline documentation is rejected by the loader today. A JSON default without it is a config with no comments *and* no editor help, which is worse than what it replaces.

## What to decide

Five shapes, and the ticket picks one with reasons rather than by taste:

- [ ] **JSON with `$schema` allowed and a schema published.** The loader learns to accept and ignore `$schema`; the template carries a URL; the editor does the documenting the comments used to do. Best result, most work, and it adds a published artefact that has to stay in sync with `KNOWN_KEYS`.
- [ ] **JSONC.** Keeps the comments, keeps one format. Costs a parser — `JSON.parse` throws on a comment — and the cold-start budget is 80 ms with a 40-line rule before any dependency (`AGENTS.md` § Dependencies). It also makes `driftwatch.config.json` mean something slightly different from what every other tool means by that filename.
- [ ] **Detect.** `package.json` present, so a `.ts` is native there; absent, so write `.json`. Right answer per repo, and two templates to keep honest instead of one.
- [x] **YAML.** ← chosen Comments survive, so ticket `01`'s guarantee survives with them, and it is as language-neutral as JSON — a `.yaml` at the root of a Cargo workspace surprises nobody. **The parser is already a runtime dependency:** `src/parse/frontmatter.ts` imports `yaml` for `frontmatter/invalid` and `skill/frontmatter`, so `AGENTS.md` § Dependencies has nothing to object to. Editor completion comes from `# yaml-language-server: $schema=...`, which is a *comment* rather than a key, so the validator keeps rejecting unknown keys with no exception carved out for `$schema`.
- [ ] **Strict JSON, comments dropped.** Cheapest, and it gives up ticket `01`'s guarantee. If this wins, the inert keys must be **absent** rather than silently present-and-dead, because a key that looks live and does nothing is exactly the drift this tool reports.

### If it is YAML, three things to settle in the ticket

- **`off` is a severity and a YAML 1.1 boolean.** `'dep/missing': off` reads as the string `"off"` under YAML 1.2, which is what `yaml` v2 implements, and as `false` under 1.1. It works, and it works for a reason a reader cannot see. The template quotes it, and the ticket records why — including what the loader should do with a `checks` value that arrives as a boolean, since a clear error beats a silent miss.
- **The lookup order grows by two.** `.yaml` and `.yml` both have to be findable or the one nobody picked becomes a config that is silently ignored, which is the failure `CONFIG_FILENAMES` is ordered to avoid. `findConfig` is the single place that decides, and `--init`'s refusal follows it for free.
- **The import stays lazy.** `yaml` is loaded by the frontmatter parser today, on a path that only runs when a document has frontmatter. A config loader that imports it unconditionally puts it in front of every run, against an 80 ms cold-start budget. Load it when a YAML config actually exists, the way the `.ts` branch already does.

## What has to change either way

- [ ] `SPEC.md` § 4 names `driftwatch.config.ts` explicitly. It is primary source, so it gets corrected as part of this, not routed around.
- [ ] `docs/guide/usage.md` describes what `--init` writes.
- [ ] The refusal already covers every shape the loader finds, so writing a different extension does not widen the overwrite risk. Keep it that way: `--init` twice must still refuse the second time, whatever it wrote the first.

## Tests

- [ ] Whatever it writes is valid input to the loader, unedited — the test that caught the `defineConfig` bug in ticket `01`. It must survive this change intact.
- [ ] A repo with no `package.json` gets a config it can actually use.
- [ ] If comments survive in any form, the test that asserts the inert keys are commented out survives with them. If they do not, that test is replaced by one asserting the inert keys are absent — not deleted.

## Comments

Opened 2026-09-12, after the question "does `--init` create a `.ts` file?". It does, and the answer to *should it* is no for any repo that is not a Node one.

Angel's read: JSON is the more standard choice because it works for a repo in any language. That is the direction — the config should not assume the repo speaks TypeScript. The obstacle is that ticket `01`'s whole argument lives in comments JSON cannot hold, so this ticket is `needs-triage` rather than `ready-for-agent` until the options above are decided: an agent picking one on its own would be choosing a specification change unsupervised.

**Added the same day, after "can we use YAML instead":** yes, and it is the strongest of the five. It keeps the language-neutrality that motivated JSON, keeps the comments that motivated the objection to JSON, and costs no new dependency, because `yaml` is already a runtime dependency of the frontmatter checks. It is also the only option where editor completion needs nothing from the validator, since a YAML schema is attached with a comment. The `off`/boolean footgun is the price, and it is one line of quoting plus a sentence of explanation.
