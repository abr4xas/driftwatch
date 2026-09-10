# ADR-0012 — A bare `pnpm X` is not a script claim

- **Status:** accepted
- **Date:** 2026-09-10

## Context

`SPEC.md` § 3 specifies `script/missing` by listing the forms to detect: `npm run X`, `pnpm run X`, **`pnpm X`**, **`yarn X`**, `bun run X`, `deno task X`, `make X`.

Two of those are written without a keyword, and the specification treated that as a spelling difference. It is not. `pnpm X` resolves in two steps: a script named `X` in the nearest `package.json`, and **failing that, a binary named `X` in `node_modules/.bin`**. Yarn does the same. So `pnpm vitest run test/x.test.ts` is not a claim about a script at all — it is a claim about a dependency's binary, which this tool does not index and cannot verify.

The first run of the check over the corpus said so immediately. Nine findings, eight false, and four of the eight were this form:

```
unjs/h3         pnpm vitest run <path>      -> suggested `pnpm test run <path>`, fixable
vercel/next.js  pnpm prettier --write <file>
calcom/cal.com  yarn biome check --write .
emdash-cms      pnpm wrangler types
```

Three of them were **`fixable`**. `vitest` is one edit from the `test` script, so the tool offered to rewrite a command that works into one that does not. [ADR-0006](0006-the-m1-precision-criterion.md) condition 2 admits zero false positives in that class, with no rate modulating it, and this is the failure it was written for.

The obvious repairs both fail. A list of subcommands (`install`, `add`, `dlx`, …) does not help: `vitest` and `prettier` are not subcommands, they are binaries. Matching the name against the manifest's dependencies does not either: `calcom/cal.com` depends on `@biomejs/biome` and the binary is `biome`, so the names do not agree, and a check that has to know every package's `bin` map is a package registry.

## Decision

The bare form of the npm family is **not a script claim**. Only the explicit keyword is read: `npm run`, `npm run-script`, `pnpm run`, `yarn run`, `bun run`, `deno task`.

`make X` keeps its bare form, because make has no second resolution step: its argument is a target in a `Makefile` or it is an error.

`SPEC.md` § 3 was corrected rather than the heuristic weakened. The specification is primary source (`AGENTS.md`), and what it said here was wrong about how the managers work.

## Why

The ambiguity is **in the grammar, not in our reading of it**. `pnpm build` and `pnpm prettier` are the same sentence; only the contents of `node_modules/.bin` tell them apart, and that directory is deliberately outside the repo index — `NEVER_WALK` in `repo-index.ts` — because indexing it would cost the cold-start budget the product is built on.

So there is no version of this rule that reads the bare form correctly without either indexing dependencies' binaries or guessing. Guessing is what produced a `fixable` false positive on the first try.

## What is lost

**`pnpm build` and `yarn build` go undetected**, and they are common. A repo whose `AGENTS.md` says `pnpm build` after the script was renamed to `compile` gets no finding.

That is the largest single detection loss in the check, and it is accepted for the reason `AGENTS.md` § "The rule that orders every decision" gives: one false positive costs more than ten false negatives. The explicit forms still cover the common documentation habit of writing `pnpm run build`, and `make` — 45 of the corpus's 93 claims — is unaffected.

**A residual risk stays recorded, and it is not only Yarn's.** `yarn run X` and `bun run X` both fall back to `node_modules/.bin` when no script matches; `npm run` and `pnpm run` do not. So two of the explicit forms carry a weaker version of the ambiguity this ADR removes from the bare one: the keyword says a script is *intended*, but the manager will still find a binary.

<!-- driftwatch-ignore-next-line script/missing -->
They are kept, for two reasons. The keyword is an authored statement of intent — somebody who writes `bun run vitest` to invoke a binary is writing it the long way round — and the corpus contributed zero `yarn` claims and five `bun` ones, all of which resolved.

That example is itself the evidence: the line above needs a `driftwatch-ignore` directive, because the check reads it as a claim that this repo has a `bun` script called `vitest` and offers to correct it to `test`. A document *about* a command is not a document that runs it, and the inline directive is the mechanism for saying so. But the evidence is thin, and if either form ever produces a false positive the response is to drop it on the same principle as this ADR, not to special-case the repo that found it: condition 9 would cost a replacement.

## Consequences

- The extractor keeps no subcommand lists. The first draft carried ~100 lines of `pnpm` and `yarn` subcommands to make the bare form safe; the whole apparatus is gone, and with it the maintenance risk of a list that falls one release behind and starts reading a new subcommand as a script name.
- `SPEC.md` § 3's list of forms is now the code's list of forms, `npm run-script` included, with no divergence to remember.
- The check's precision no longer depends on anything about `node_modules`, so it stays correct in a repo that has never been installed.
