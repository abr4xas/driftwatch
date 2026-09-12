# 02: What `--init` writes, and why a `.ts` in a Go repo is wrong

**What to build:** `--init` stops assuming the repo is a TypeScript one. The direction is a `.json` config by default; what it costs is the comments, and that is the ticket.

**Blocked by:** nothing. Ticket `01` shipped the flag and the template.

**Status:** needs-triage

## The problem

`--init` writes `driftwatch.config.ts`, always. `SPEC.md` § 4 says so literally, so the implementation is not wrong against the specification — the specification is what is being questioned.

driftwatch audits `AGENTS.md` in Go, Rust and Python repos exactly as well as in Node ones; nothing in discovery or in the checks needs a `package.json`. So the tool is language-neutral and its own config scaffolding is not. A `.ts` file at the root of a Cargo workspace is an artefact nobody there can explain, and in a repo that *does* use TypeScript it is worse than odd: it can land inside the `tsconfig` include, the lint glob and the build.

`loadConfig` already accepts `.json` and the `driftwatch` key in `package.json`. The formats exist; `--init` just never offers them.

## What makes this more than a file extension

**JSON has no comments, and the template is mostly comments.** Ticket `01`'s ordering decision was that `ignore`, `knownPaths` and `staleThreshold` get written **commented out, each naming what makes it real**, so the generated file cannot promise more than the code delivers. Strict JSON cannot express that. Whatever this ticket decides, it decides what happens to that guarantee — dropping it silently is not one of the options.

**`$schema` is currently a fatal error.** Unknown keys fail the run by design, and `$schema` is unknown, so the one mechanism that would give a JSON config editor completion and inline documentation is rejected by the loader today. A JSON default without it is a config with no comments *and* no editor help, which is worse than what it replaces.

## What to decide

Four shapes, and the ticket picks one with reasons rather than by taste:

- [ ] **JSON with `$schema` allowed and a schema published.** The loader learns to accept and ignore `$schema`; the template carries a URL; the editor does the documenting the comments used to do. Best result, most work, and it adds a published artefact that has to stay in sync with `KNOWN_KEYS`.
- [ ] **JSONC.** Keeps the comments, keeps one format. Costs a parser — `JSON.parse` throws on a comment — and the cold-start budget is 80 ms with a 40-line rule before any dependency (`AGENTS.md` § Dependencies). It also makes `driftwatch.config.json` mean something slightly different from what every other tool means by that filename.
- [ ] **Detect.** `package.json` present, so a `.ts` is native there; absent, so write `.json`. Right answer per repo, and two templates to keep honest instead of one.
- [ ] **Strict JSON, comments dropped.** Cheapest, and it gives up ticket `01`'s guarantee. If this wins, the inert keys must be **absent** rather than silently present-and-dead, because a key that looks live and does nothing is exactly the drift this tool reports.

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

Angel's read: JSON is the more standard choice because it works for a repo in any language. That is the direction. The obstacle is that ticket `01`'s whole argument lives in comments JSON cannot hold, so this ticket is `needs-triage` rather than `ready-for-agent` until the four options above are decided — an agent picking one on its own would be choosing a specification change unsupervised.
