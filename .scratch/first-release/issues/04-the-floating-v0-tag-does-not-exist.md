# 04: The floating `v0` tag the release procedure maintains does not exist

**What to decide:** whether to create the floating tag the documented release procedure
requires, or to drop the step.

**Type:** task

**Blocked by:** nothing

**Status:** open — found 2026-09-19 while bumping to 0.4.0

## The contradiction

[`ROADMAP.md`](../../../docs/spec/ROADMAP.md) § "What a release is, by hand" ends with:

> Then **move the floating action tag**, which nothing automates:
>
> ```
> git tag -f v0 v<x.y.z> && git push -f origin v0
> ```

Three facts against it:

- **`v0` does not exist.** `git tag -l` lists `v0.1.1` and nothing else.
- **Nothing references it.** Every documented `uses:` pins an exact release —
  `abr4xas/driftwatch@v0.4.0` — across the README, `action.yml`, the CI guide and the
  ROADMAP itself.
- **A test enforces that pinning.** `docs-links.test.ts` § "the documented action ref"
  asserts every `abr4xas/driftwatch@vX.Y.Z` in the documentation matches `package.json`, and
  its comment calls the exact pin "the honest trade — a reader sees which version their
  workflow runs".

So the procedure maintains a tag that the project's own design decision says not to use, and
has never maintained it.

## Why it matters more than it looks

This is drift in the repository whose product reports drift, in the file that tells a human
what to do at the moment they are least likely to question it. The 0.4.0 release will follow
these steps; if it follows all of them it creates a floating tag pointing at a release nobody
consumes that way, and if it skips the last one the document is wrong again.

It is also the failure mode `action.yml`'s own comment names: *"Forgetting one leaves a
documented `uses:` pointing at the previous release, which is drift in a repository whose
product reports drift."*

## The two answers

**Drop the step.** Consistent with the exact-pin decision, with the test that enforces it,
and with the comment in `action.yml` explaining why floating tags were rejected. Costs
nothing, because nothing uses `v0`.

**Create and maintain it.** Some consumers prefer `@v0` and expect it from an action; GitHub's
own convention is a floating major tag. But adopting it means a second thing to keep in step
by hand at every release, and the project already decided against that trade in writing.

**Probably drop**, and say why in the same paragraph, so the next person does not re-derive
the question. If it is kept instead, the test should be extended to cover it, because a step
nothing verifies is a step that will be forgotten — which is what happened here.

## What is not in question

Exact pins in the documentation stay. That decision is argued, tested and correct; this
ticket is only about the vestigial line at the end of the procedure.
