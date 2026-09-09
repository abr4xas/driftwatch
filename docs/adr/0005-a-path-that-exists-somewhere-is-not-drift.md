# ADR-0005 — A path whose shape exists somewhere in the repo is not reported

- **Status:** accepted
- **Date:** 2026-09-09

## Context

Across the corpus of 13 real repos, after applying the generated-artifact discard, command detection, link decoding and the root fallback, **one dominant class** of false positive remained: paths written relative to a directory the prose mentions and that only a human infers.

Examples, all with the suggestion the tool itself computed:

| Document | Claims | Actually exists |
|---|---|---|
| `vercel/next.js` `AGENTS.md:30` | `src/cli/next-dev.ts` | `packages/next/src/cli/next-dev.ts` |
| `remix-run/react-router` `AGENTS.md:33` | `lib/components.tsx` | `packages/react-router/lib/components.tsx` |
| `sst/opencode` `packages/llm/AGENTS.md:87` | `route/auth-options.ts` | `packages/llm/src/route/auth-options.ts` |
| `BerriAI/litellm` `ui/.../chat/AGENTS.md:14` | `src/app/globals.css` | `ui/litellm-dashboard/src/app/globals.css` |
| `withastro/astro` `AGENTS.md:78` | `core/errors/errors-data.ts` | `packages/astro/src/core/errors/errors-data.ts` |

In every one, the document says earlier, in prose, "inside `packages/next`" or "in the `llm` package", and then writes the paths relative to that. There is no syntactic signal telling that case apart from a path that broke: neither the source's `baseDir` nor the repo root resolves them.

## Decision

Before reporting, we check whether **any** path in the repo ends with the claimed path, taking whole segments. If one does, it is not reported.

`src/cli/next-dev.ts` is not reported because `packages/next/src/cli/next-dev.ts` exists. `src/cli/next-made-up.ts` is reported, because that sequence of segments is nowhere.

The search starts from the last segment, so it only compares against the namesakes and never scans the index: it stays amortised O(1) per claim.

## Why

It was the last large class, and without resolving it the false positive rate would not drop below the 5% that `ROADMAP.md` § M1 then required to advance.

The rule that orders the project says one false positive costs more than ten false negatives. Here the trade is explicit and has to be stated plainly.

## What is lost

**A file that moved between packages stops being detected.** If `packages/web/CLAUDE.md` says `` `src/db.ts` `` and that file today lives only in `packages/api/src/db.ts`, driftwatch stays silent, because it cannot tell "the web doc went stale" apart from "the web doc is speaking relatively about the api package".

It is a real loss and the most expensive of all the ones we accept. The `monorepo` fixture documents the exact case.

## Consequences

- `path/missing` now reports only paths whose **shape** appears nowhere in the repo. It is a narrower and much stronger signal: across the corpus it went from 231 findings to 24.
- Recovering what is lost is not loosening this rule, it is a new check with its own identity and its own severity, of the kind "this path exists but not where the document says". It would be tier 2 and emit a warning, not an error. It is not in M1's scope.
- The `monorepo` fixture was rewritten to test resolution against the `baseDir` with a path that exists in no form, and to keep the no-longer-reported case on the record.
