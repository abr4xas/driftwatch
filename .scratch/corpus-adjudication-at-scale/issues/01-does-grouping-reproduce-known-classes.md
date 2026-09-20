# 01: Does grouping reproduce the classes we already named by hand?

**What to find out:** whether automatic grouping can reproduce false-positive classes a
person already drew — which is the only prerequisite for letting it propose new ones.

**Type:** research

**Blocked by:** nothing

**Status: resolved 2026-09-19.** Yes for grouping, no for verdicts, and the split is clean.
See §"Answer". Originally **reframed 2026-09-18**, see §"What this ticket used to ask".

## What this ticket used to ask

It asked whether Jev is *calibrated against the 26 verdicts*, and it gated every other
research ticket in this directory. That framing came from the single-corpus design, where a
model's output would have fed the certification and therefore had to be trustworthy enough
to depend on.

Under §"Two corpora, not one" in the [spec](../spec.md) **no model output is ever a
verdict**, so there is nothing to calibrate and nothing to gate. What is left is a much
smaller and more useful question: is the grouping in job 1 good enough to be worth running
over 780 findings nobody will read individually?

The verdict half of the old ticket is withdrawn along with `03`.

## The setup

The corpus produces **26 findings, 20 true and 6 false**, every one classified by hand
against the real repository across 17 rounds, with the round recorded per repo in
[`CLASSIFICATION.md`](../../../test/corpus/CLASSIFICATION.md). Eleven false-positive classes
have been named and closed; five were open as of round seventeen.

Feed each finding — rule id, the claimed string, the sentence around it, and the context it
sat in (link / inline code / table / prose) — and ask for the class it belongs to, from the
named list, or "new". Compare against what a person wrote.

Note that this does not contaminate anything, by the project's own rule: classifying a
finding *is* the measurement. It is opening the repo to inspect discards that contaminates,
and this ticket does not do that. `07` does, and only in the discovery corpus.

## What would count as a pass

- **It reproduces the named classes.** The closed classes are sharply defined — an index
  placeholder, a dependency protocol specifier, a version-or-date metavariable, another
  agent tool's configuration root. If it cannot recover distinctions a person already drew
  and wrote down, it will not propose useful new ones over unlabelled material.
- **The five open classes group together rather than scattering.** The three at
  `CLASSIFICATION.md` line 1058 — a crate nickname, a foreign project's file, a generated
  bundle described without a generation word — are the ones job 1 exists to crack. Watch
  whether they land in one bucket, three buckets, or eleven.
- **Confidence orders the work sensibly.** The only use for confidence in this design is
  putting the ambiguous rows at the top of a table a person reads. Low confidence on the
  genuinely ambiguous findings is a pass; high confidence spread evenly is a warning that
  the signal is not there.

## What this cannot establish

**26 is a small sample**, and the six false positives are a very small one. Nothing here
generalises; at best it rules the approach out cheaply. Do not quote a percentage —
[ADR-0009](../../../docs/adr/0009-precision-is-counted-in-quiet-repos.md) is the record of
what this project already paid for treating a ratio over a small numerator as a criterion.

There is also a contamination risk of a different kind worth naming: these repos are public
and `CLASSIFICATION.md` is public. A model that has seen this repository is not being tested
on held-out data. It cannot be ruled out, only noted.

## The bookkeeping this needs

The findings have to be machine-readable to be fed to anything, and today they are prose
across 1120 lines mixing a 17-round narrative with its data tables. The deferred plan
already flagged splitting the two; this ticket is the first thing that actually requires it.

Whatever shape the table takes has to keep `test/corpus-bookkeeping.test.ts` meaningful —
it asserts that the totals cited in the document match the snapshots, and that assertion is
worth more than the convenience of any particular format.

This is the honest cost of the ticket, and it is larger than the experiment itself.

## Practical

Confirm early access to a System One model is actually obtainable before planning around it.
If it is not, nothing here is blocked: the design in the spec survives the model being
swapped for any classifier with calibrated output, and `06` and `07` do not need one at all.

## Comments

The result of this ticket is *not* a decision to use a model. It is a decision about whether
job 1 is worth building — and, because `06` and `07` no longer depend on it, a negative
result costs this directory much less than it would have under the old framing.

## Answer

Resolved 2026-09-19. **It reproduces 10 of the 11 classes a person drew, and it cannot tell a
true finding from a false one.** Both halves are the result; the second is not a failure.

`pnpm jev:classify`. Two questions per finding over one shared state, evaluated in
parallel in one request — a `Noul` for "is this real" and a `Choice` over the nine named
classes plus `new`. The class answer is the speculative one: it is asked for every finding and
consumed only when the verdict says false.

### Grouping: 10 of 11

| hand | Jev | confidence |
|---|---|---|
| `foreign-project` | ✓ | 0.98 |
| `placeholder` ×3 | ✓ ✓ ✓ | 0.98, 0.96, 0.61 |
| `comma-separated-globs` | ✓ | 0.91 |
| `generated-bundle` | ✓ | 0.84 |
| `another-tools-layout` | ✓ | 0.79 |
| `crate-nickname` | ✓ | 0.71 |
| `readers-project` | ✓ | 0.46 |
| `runtime-log` | ✓ | 0.41 |
| `third-party-convention` | **`new`** | 0.75 |

The one miss is the class with the thinnest definition — a convention of some other community
that this repository never adopted — and calling it `new` is not an unreasonable reading of a
label that has one example.

**The control is what makes this convincing.** Asked to class the 28 **true** findings anyway,
Jev answered `new` for **27 of them**. The Choice is not matching labels to prose; it is
declining to apply the taxonomy where the taxonomy does not belong. The single exception is
`openai/codex`'s `v2.rs` at confidence 0.31 — the lowest in the run.

**Confidence orders the work the way the ticket hoped.** The two least confident answers,
0.41 and 0.46, are `runtime-log` and `readers-project` — the two the ticket itself names as
the open, ambiguous ones. Confidence is not tracking class size: six of the nine classes have
one example and their confidence runs from 0.41 to 0.98.

### Verdicts: it cannot, and it is not supposed to

| | min | median | max |
|---|---|---|---|
| the 28 true | 0.08 | 0.50 | 0.67 |
| the 11 false | 0.32 | 0.40 | 0.56 |

Threshold-free, the ordering is **AUC 0.620** against 0.5 for a coin flip. The distributions
overlap almost entirely, and no threshold is useful: at `p >= 0.5` it agrees on 22 of 39; at
`p >= 0.6` it catches all 11 false ones and throws away 25 of the 28 true ones.

Under §"Two corpora, not one" no model output is ever a verdict, so this costs nothing. It is
worth stating plainly anyway: **the thing a person does when they open a repository and decide
whether a path is really missing is not reproduced here at all.** What is reproduced is the
step after it — the one that sorts a pile of already-judged findings into shapes.

### What this does and does not license

It licenses job 1: grouping over the discovery corpus is worth building, because grouping is
the part that works. It licenses nothing about verdicts, and the AUC above is the number to
quote at anybody who proposes otherwise.

**Do not read a percentage into 10 of 11.** Six of the nine classes have a single example, and
ADR-0009 is the record of what this project already paid for treating a ratio over a small
numerator as a criterion. What the run rules out is the cheap negative: a grouping that could
not recover distinctions already written down. That was the only thing this ticket could
establish and it establishes it.

### The contamination caveat, larger than when it was written

The ticket noted that these repositories and `CLASSIFICATION.md` are public, so a model that
has seen this repository is not being tested on held-out data. That is now **more** true, not
less: building the per-finding table this ticket required put all 39 verdicts in one clean,
parseable place in that same public document. It cannot be ruled out, only noted — and noted
more loudly than before.

### What a scoring bug looked like from the outside

The first run reported every class matching. The row carried the hand-drawn class as
`className` and the answer carried Jev's as `className` too, and one spread overwrote the
other, so each finding was compared against itself. A perfect score is what that looks like
from the outside, which is the argument for having a control question in the first place.
