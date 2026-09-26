# 28: A verdict nothing produces

**What to decide:** whether `Verdict` is a residue to delete or an intention still owed, given
that `CONTEXT.md`, `AGENTS.md` and `SPEC.md` all describe a type no module constructs.

**Type:** research

**Blocked by:** nothing.

**Status: new.** Raised 2026-09-20 while reading `src/verify/` for ticket `27`.

## The discrepancy

`CONTEXT.md` defines the word with care. It is one of the three that were all called `verdict`
until somebody told them apart, and `AGENTS.md` closes on it: *"Any code that blurs them is a
bug, whatever it typechecks as."*

> **Verdict**: The result of verifying one claim: `ok`, `broken`, `suspect` or `skipped`.

`docs/spec/SPEC.md` says the same, and so does `AGENTS.md`.

In the code, `Verdict` is declared in `src/core/types.ts` and **no module in `src/` reads it or
constructs it**. `suspect` is produced by nothing, anywhere. What exists instead is
`PathVerdict` in `src/verify/path-claim.ts`, with three different values —
`unanswerable | satisfied | missing` — and `unanswerable` is the real analogue of `suspect`,
carrying seven named arms, each consumed only as silence.

`skipped` is real but lives outside the type entirely, as `SkipReason` in `core/types.ts`, and
the comment there is explicit that it is *"split by what was observed rather than by what is
suspected"* — which is a different design from the one the glossary describes.

So the documents describe a four-value vocabulary the code does not speak, while the
three-way judgement the code does make has another name and other values.

## Why it is a ticket and not an edit

`AGENTS.md`: *"`docs/spec/` is primary source. If the code and the spec disagree, decide which
one is wrong before touching anything; do not adjust the document reflexively to make it
fit."*

And `Verdict` is an exported name, so removing it is a change to the frozen surface of
`1.0.0` — a diff somebody accepts, per ADR-0014, not something that lands in a research
branch on the way past.

## The options

1. **The code is right.** Delete `Verdict`, and rewrite the glossary and `SPEC.md` around
   `PathVerdict`, which is what actually happens.
2. **The spec is right.** `suspect` is an unimplemented intention and `Verdict` is the hole
   reserved for it; leave both and record that it is owed.
3. **Neither.** `Verdict` is design vocabulary the code never needed: delete the type, and let
   the glossary keep the word describing what the code does.
4. Defer.

## Where the evidence points

Option 1. A type nobody constructs in 7850 lines is a residue, not a pending intention, and
`suspect` appears in neither the ROADMAP nor ADR-0014 — there is no milestone that would
produce one. But the decision is the user's, because of the frozen surface.

## What is not at stake

No finding, no snapshot, and no condition of ADR-0006. This is vocabulary and a dead export.
