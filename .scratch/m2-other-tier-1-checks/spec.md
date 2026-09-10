# M2 — The other tier 1 checks

The full specification lives in `docs/spec/`. This file only delimits the scope of this batch of tickets and records what was decided before writing them.

M1 was a gate: it had to prove the tool can stay quiet on repositories nobody wrote for us. It did ([ADR-0006](../../docs/adr/0006-the-m1-precision-criterion.md), certified 2026-09-09). M2 is the first milestone that is not a gate, which changes the risk: from here on, every new check is a new way to be wrong on a repo that used to be silent.

## Scope

The six deliverables of `docs/spec/ROADMAP.md` § M2, split into eight tickets.

**Infrastructure first**, because every check needs it:

- `01` — config file, `sources` key first (`docs/spec/SPEC.md` § 7). **Done**, and it produced [ADR-0008](../../docs/adr/0008-a-specification-is-not-an-agent-context-file.md).
- `03` — `--only` / `--skip` / `--no-tier2`. Today they parse and throw `notYetImplemented`.
- `04` — inline ignore directives (`<!-- driftwatch-ignore -->`, `-ignore-next-line`, `-ignore-file`, with or without a check id).

**Then the checks**, cheapest in new machinery first:

- `05` — `link/broken`, which in practice means **anchors**. See the note below; the file half is already done. **Done**, and it produced [ADR-0010](../../docs/adr/0010-anchors-match-on-a-canonical-key.md).
- `06` — `frontmatter/invalid`: YAML that does not parse, or fields with the wrong type.
- `07` — `skill/frontmatter`: the five structural rules in SPEC § 3.
- `08` — `script/missing`: `npm run X` and friends against the nearest `package.json`, `Makefile` or `deno.json`.

`02` is not M2 work. It is the lint rule audit, deferred to release preparation, and it lives here because the first release happens when M2 closes.

## Why the ignores land before the checks

Ticket `04` blocks `05` through `08`, and the order is not cosmetic.

Each new check produces findings over the 34-repo corpus. Without an escape hatch, the only available response to a false positive is to weaken the heuristic that produced it — which is how a tool ends up with rules nobody can explain. An inline ignore lets a repo say "this one is fine" without the tool having to become less precise for everyone.

It also means the corpus stays honest: an ignore in *someone else's* repo is not something we can add, so a false positive there still has to be fixed properly. The escape hatch is for users, not for us.

## `link/broken` is narrower than it looks

Verified before writing the ticket, on a scratch repo:

```
AGENTS.md
  ✗ 3  docs/guide.md  path does not exist
```

from a source containing `[the guide](./docs/guide.md)` and `[the anchor](./README.md#nope)`. `path/missing` **already reports a relative link to a missing file**, because SPEC § 3 has it extracting from relative Markdown links and ticket 08 implemented that. The broken anchor is reported by nothing.

So ticket `05` has two jobs, and neither is "check that link targets exist":

1. Anchor resolution: parse the target file's headings, apply GitHub's slug rules, and report `#section` when no heading produces that slug. Same-file anchors (`#section` with no path) included.
2. **Do not double-report.** A link to a missing file must produce one finding, not two. Decide whether that means `link/broken` skips targets that do not exist — leaving them to `path/missing`, which already suggests a candidate — or whether it claims them and `path/missing` yields. The first is less work and keeps the suggestion; take it unless the ticket finds a reason not to.

This check is also what finally verifies the links inside `docs/spec/` and `docs/adr/`, which ADR-0008 established `path/missing` cannot. It arrives as a **second invocation** with its own config, because `sources` and the check filter are both global:

```
driftwatch                                        # sources: docs/agents/**
driftwatch --config driftwatch.docs.config.ts --only link/broken
```

Which means ticket `05` depends on `03` (`--only`), not just on `04`.

## What has to change in the code

Checked against the current implementation, so no ticket rediscovers it:

- **`CheckContext` grows.** It is `{ index, ignoredByGit }` today. `docs/spec/ARCHITECTURE.md` § Extensibility already promises `ctx` exposes `index`, `manifests`, `git` and `config`; `script/missing` needs `manifests` and everything needs `config`. Extend it once, in ticket `01`, rather than per check.
- **`ClaimKind` needs nothing.** It is already `'path' | 'script' | 'dep' | 'symbol' | 'link' | 'frontmatter'`. Do not "add" kinds that exist.
- **The registry stays static.** `CHECKS` in `src/verify/checks/index.ts` is an array; a check is a file plus an entry, and no ticket should introduce dynamic loading (ARCHITECTURE § Extensibility, v1).
- **Two fixtures in ARCHITECTURE do not exist yet.** § Testing lists `skills` and `ignores`; `test/fixtures/` has neither. Tickets `04` and `07` create them. The document was written ahead of the code, which is allowed — it is the specification — but it means those names are a to-do, not a reference.

## The obligation nobody should skip

ADR-0006's conditions were met **with one check**. They are not a certificate that carries over.

- Every new check runs over the same corpus, and the conditions have to hold **again, aggregate**: zero false positives among `fixable`, median 0 false positives per repo, 90th percentile ≤ 1, none above 2, `false-positive-traps` at zero.
- The corpus snapshots will change for every check that lands. Each diff is reviewed by hand before it is accepted ([ADR-0007](../../docs/adr/0007-the-corpus-does-not-run-in-ci.md)); it does not run in CI and nothing will remind you.
- **Condition 6 gets re-measured.** It passed with 3 findings from a single root cause, which `test/corpus/CLASSIFICATION.md` records as too small a sample to carry a percentage. M2 is what adds finding mass to the validation group. Once it reaches ~10 findings, re-measure and write the result down, whatever it is.
- The contamination rule still applies (ADR-0006 condition 9). Tuning a new check while looking at a validation repo's discards burns that repo, and a replacement has to be added.

If a check cannot reach the bar, the honest outcome is to ship M2 without it and say so — `AGENTS.md` § Verification asks for exactly that, and one excellent check already beats eight noisy ones.

## Acceptance

From `docs/spec/ROADMAP.md` § M2: the `monorepo` fixture passes, and all four checks have their own fixture with positive **and negative** cases. The negative cases are the ones that matter.

Plus: the corpus conditions above, and condition 6 re-measured rather than inherited.

## Out of scope in this batch

- `--fix` and everything about applying edits (M3).
- `--json`, `--github`, `--sarif`, the GIF, the Action, the site, publishing (M4).
- The four tier 2 checks (M5), and `--watch` (M6).
- `--init`. It writes a commented config, so it depends on ticket `01`, but ROADMAP's M2 line does not ask for it. Leave it out unless `01` makes it nearly free, and give it its own ticket if it lands.

## Decisions taken

- [ADR-0005](../../docs/adr/0005-a-path-that-exists-somewhere-is-not-drift.md): a path whose shape exists somewhere in the repo is not reported. It constrains anything path-shaped that M2 adds, and the loss it accepts — a file that moved between packages goes undetected — is **not** reopened here. Recovering it is a separate tier 2 check with its own severity, not a loosening of this rule.
- [ADR-0007](../../docs/adr/0007-the-corpus-does-not-run-in-ci.md): the corpus is a local gate with named triggers in `AGENTS.md` § Verification. Touching a heuristic means running it before and after.
