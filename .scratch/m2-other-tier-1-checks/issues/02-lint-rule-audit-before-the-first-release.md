# 02: Audit the lint rules before the first release

**What to build:** a decision, not code. Every `pedantic` warning oxlint reports is either fixed or silenced with a written reason, so that a run's annotations are worth reading.

**Blocked by:** nothing, but **deliberately deferred**: this is done as part of preparing the first release, not before. `docs/spec/ROADMAP.md` § "Suggested release order" puts that at the close of M2.

**Status:** ready-for-human

The decision is the user's, and it was postponed on purpose — the analysis below is already done so it does not have to be redone.

## Why it is worth doing at all

Eight warnings that nobody acts on train everyone to ignore the annotations, including the ninth one, the day it matters. Either they mean something or they should not be printed.

They do not fail the build: `.oxlintrc.json` sets `categories.pedantic` to `warn` on purpose, while `correctness` and `suspicious` are `error`. That split is right and is not what this ticket reopens.

## The eight, already classified

**`eslint(max-lines-per-function)` — 3 warnings, limit 50**

| Function | Lines |
|---|---|
| `parseMarkdown` (`src/parse/markdown.ts:58`) | 68 |
| `run` (`src/verify/checks/path-missing.ts:43`) | 64 |
| `extractPathClaims` (`src/extract/paths.ts:181`) | 54 |

A legitimate signal, and the one to keep visible. But note before splitting anything: much of `path-missing`'s length is the comments explaining each net before it reports, which `AGENTS.md` § Code conventions explicitly asks for. Splitting to get under 50 could easily make it harder to read. Tests already have this rule off via an override.

**`unicorn(no-array-callback-reference)` — 3 warnings**

`src/verify/repo-index.ts:218` and `:219` (both `.some(matches)`), `src/extract/context-prose.ts:209` (`.some(isCreateInstruction)`).

The rule guards a real trap: array callbacks receive `(element, index, array)`, so `['1','2','3'].map(parseInt)` returns `[1, NaN, NaN]` — `parseInt` reads the index as its radix. Verified.

It does not apply here: `matches` and `isCreateInstruction` both take exactly one parameter, so the extra arguments are ignored. The rule cannot see that without checking the signature.

**`unicorn(no-object-as-default-parameter)` — 2 warnings**

`src/extract/discard.ts:187` (`options: DiscardOptions = { couldBeCommand: true }`), `src/extract/context-prose.ts:203` (`ctx: ProseContext = { origin: undefined }`).

The rule fears a partial override: a default object is replaced whole, not merged, so `discardReason('x', {})` would leave `couldBeCommand` as `undefined` and silently change behaviour.

Strict TypeScript already closes that. The keys are required, not optional, and the call was tried:

```
error TS2741: Property 'couldBeCommand' is missing in type '{}'
              but required in type 'DiscardOptions'.
```

This is expected overlap: `eslint-plugin-unicorn` was written for a codebase without types.

## The options

1. Turn the two `unicorn` rules off in `.oxlintrc.json`, each with the reason above written next to it, and leave the three `max-lines-per-function` visible. Takes the count from 8 to 3 without disabling anything that protects against a real risk. **Recommended in the discussion that opened this ticket.**
2. Fix the code instead: wrap the callbacks in arrow functions, split the three long functions.
3. Raise `max-lines-per-function` to a limit this codebase actually respects, if the three long functions are judged fine as they are.

Whatever is chosen, do not leave a rule silenced without a stated reason. A silenced rule with no reason is indistinguishable from an accident, and the next person to read the config will either restore it or lose an hour deciding.

### Added 2026-09-10: a ninth warning

`eslint(max-lines)` on `src/extract/context-prose.ts`, now 328 lines.

It is mostly prose. `AGENTS.md` § Code conventions requires every discard rule to carry the false positive it prevents, and five rounds of corpus measurement added five such explanations, each citing the repo and line it came from. Cutting them to satisfy a line count would delete the reason the rules exist.

The defensible move, if any, is a **split**: the marker lists (`EXAMPLE`, `HEDGED`, `CREATE_IMPERATIVES`, `CONDITIONAL`) into their own module, leaving the window and sentence logic behind. That is a structural decision, not a lint fix, which is why it is recorded here rather than done in the middle of a measurement.

## Comments

Opened 2026-09-10, after the first real CI run (34422155013) surfaced the eight as GitHub annotations, which is far more visible than the local run and is what made them worth a decision.

Also worth checking here, in the same pass: `pnpm lint` runs `oxlint src test`, so `scripts/` is not linted at all. Either include it or record why not.
