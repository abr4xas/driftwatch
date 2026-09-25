# 37: Which false-positive classes carry mass in the wild

**What to decide:** which of the classes a person has already named are worth writing a discard
rule for, measured over the discovery corpus instead of chosen by intuition.

**Type:** research

**Blocked by:** nothing. Ticket `36` is resolved and this is what it points at.

**Status: resolved 2026-09-24.** Pre-registered, then run. The control passes and the table is below; no rule is written here. See §"Answer".

## Why this question and not another

Ticket `36` scored six questions against a person and the split came out clean:

| works | fails |
|---|---|
| `classify.className`, a Choice over classes a person named — 94% against 69% | `CLAIMS_A_PATH`, 25 readings against 26 |
| `DIRECTORY_IS_A_NAME`, a concrete Choice | `isReal`, 0.51 against 0.43 |
| `repoKind`, a Choice | `aboutThisRepo`, -31 points |
| | `REWRITE_IS_RIGHT`, flat between 0.20 and 0.58 |

**A Choice over a vocabulary a person wrote separates; a probability over an abstract property
does not.** Six for six in each direction. So this ticket asks the shape that works, and asks
it of the population the project has never asked it of.

`classify.ts` scores 94% and has only ever run over the 338 findings of the certification
corpus. `queue.ts` puts the same question to discovery findings and then throws the class away
to sort a reading order. Nobody has tabulated it. The spec names exactly this as the point of
the second corpus: *not having to read two thousand repos by hand in order to find the shape of
a rule*.

The alternative was me naming candidate classes by intuition — `.github/instructions/`, a host
with a TLD, a branch prefix — which is how the last three rounds picked their experiments, and
two of the three came back "no measured reason to change anything".

## The population, pre-registered

- Every `path/missing` finding in `test/discovery/results.jsonl`: **32 209 in 736
  repositories**. `path/missing` only, for `queue.ts`'s reason — a `link/broken` anchor and a
  `script/missing` command are answered by the target document and the manifest, not by the
  prose around them.
- **Cap of 2 per repository**, which leaves **1262 items**. The cap is the whole design
  decision and it is declared here with its cost: 42 repositories carry 33% of this check's
  output (ticket `33`), so an uncapped run would measure a dozen hoarders and call it the wild.
  A capped run measures **repositories**, which is also what condition 6 counts. `claims.ts`
  caps for this reason and says so.
- No exclusion on repository, class, confidence or size. Nothing is looked at before the
  population is fixed.

## What comes back, and what it is not

A table: for each class a person named in `CLASSIFICATION.md`, how many of the 1262 items Jev
assigns to it, in how many repositories, with examples.

Three things it is **not**:

- **Not a precision, and not a false-positive count.** Nobody has ruled on one of these 1262.
  `AGENTS.md` § "The discovery corpus is not a corpus in the same sense" governs every number.
- **Not a decision to write a rule.** A large group is a place to *look*. The rule is written by
  hand in `src/`, measured with `pnpm discovery diff` before and after, and every added and
  removed finding is read — the method ticket `16` established and the `@` rule followed.
- **Not a ranking of what to fix first.** Mass is not cost. Ticket `27` produced a table whose
  top row was the one nobody should act on, because `16` had already tried that scope, audited
  700 repositories and reverted.

## The control, pre-registered

`new` — "none of the above" — must come back carrying real mass. Round thirty measured 21 of 22
true positives answering `new` against a class list that was never fitted to them, and that is
the half of `classify.ts`'s 94% that is not leakage. If almost nothing in 1262 wild findings
answers `new`, the question is agreeing with itself over a list that has grown too permissive,
and the table should be read as a distribution of one class rather than of nine.

## The leakage, stated before the number

The class list was written by reading the certification corpus's false positives, so a class
named here is partly recognition. Round thirty said so and it is not weaker at this scale: what
the table can show is **where mass sits among distinctions a person already drew**, not that
those are the right distinctions. A class the list does not have cannot appear, and
`classes.ts` exists for that other question.

## Comments

Opened 2026-09-24. Angel, after ticket `36` came back negative: *"honestamente siento que a Jev
lo subutilizamos y en algunos casos lo usamos mal o no lo usamos para nada cuando
deberíamos."* The measured version of that is the table at the top of this ticket — the
instrument that scores 94% has never been pointed at the corpus it was built for.

## Answer

1262 items asked, **1244 answered**, 18 requests failed and are counted as nothing.

| class | items | repos | share |
|---|---|---|---|
| **`new`** | 909 | 589 | **73.1%** |
| `foreign-project` | 92 | 74 | 7.4% |
| `placeholder` | 73 | 57 | 5.9% |
| `runtime-log` | 42 | 36 | 3.4% |
| `generated-bundle` | 36 | 31 | 2.9% |
| `readers-project` | 33 | 29 | 2.7% |
| `another-tools-layout` | 28 | 23 | 2.3% |
| `comma-separated-globs` | 15 | 14 | 1.2% |
| `third-party-convention` | 14 | 11 | 1.1% |
| `crate-nickname` | 2 | 2 | 0.2% |

**The control passes.** `new` carries 73% across 589 repositories, so the question is not
agreeing with itself over a list that has grown permissive: most of what the wild produces
fits none of the distinctions a person has drawn here. That is also the honest headline — the
named classes together account for a quarter of what a capped sample of the population looks
like.

### What this says that intuition had wrong

The conversation that opened this ticket proposed four candidate rules by eye —
`.github/instructions/`, a host with a TLD, a branch prefix, placeholder anchors — and ranked
them by how many **certification** repositories each would clean. Against the wild, that
ranking was wrong in both directions:

- `foreign-project` is the largest named class by a factor of two over the next, in **74
  repositories**. It was proposed third.
- `runtime-log` (36 repos) and `generated-bundle` (31 repos) are each larger than
  `another-tools-layout` (23), and neither was proposed at all — both look like one repository
  when read off the certification corpus.
- `crate-nickname` is **2 repositories, and they are one document**: `openharmony/arkcompiler_runtime_core`
  and its Eclipse mirror, same path, same line 338. In the corpus it is a false positive in a
  validation repository; in the wild it barely exists.

That is the difference between counting the corpus and counting the population, and it is what
this pass was for.

### One pattern crosses three classes

The examples show the same shape under three different names:

```
foreign-project          nextjs.org/docs/messages/
placeholder              teams.microsoft.com/l/message/
third-party-convention   claude.ai/code/
```

Measured directly over all 32 209 `path/missing` findings, with no model involved: a first
segment that is a hostname with a TLD is **48 findings in 29 repositories, 38 distinct texts** —
`linkedin.com/in/`, `airflow.apache.org/registry/`, `ctbk.s3.amazonaws.com/index.html`,
`domain.com/locations/city-name/`. In the certification corpus it is `MuLTiAcidi/claudeos`'s
`herokucdn.com/error-pages/no-such-app.html`, one of the fifteen repositories keeping condition
6 below its bar.

This is the shape the `@` rule had: a first segment that names something a resolver turns into
a location, not a location.

### What is deliberately not done here

**No rule is written.** What this ticket produces is a place to look, and the half that decides
whether a rule is worth writing is the one the `@` rule measured and this has not: **the cost**
— how many candidates of that shape resolve to a real file. That is a scan of `discards.jsonl`
and it belongs to the ticket that proposes the rule, together with `pnpm discovery diff` before
and after and a hand reading of every finding added and removed.

Nothing here is a precision, nothing here is a false-positive count, nobody has ruled on one of
these 1244 findings, and none of it enters `CLASSIFICATION.md`.

## What the table produced, recorded here so it is not read cold again

Tickets `39` to `43` worked the top five rows in order.

```
foreign-project    74 repos  ->   53 findings   two clauses
placeholder        57 repos  ->  261 findings   two clauses, one shape refused
runtime-log        36 repos  ->   16 findings   class refused
generated-bundle   31 repos  ->    0 findings   class refused
readers-project    29 repos  ->    0 findings   answered by `ignore`, not by a rule
```

330 findings removed. The ranking predicted the yield **once in five**: the second row produced
five times what the first did, and rows three to five produced almost nothing between them.

This ticket said, before any of it, that a row is a place to look and that mass is not cost.
That was the right caveat and it was too quiet. Anyone reading this table should read the class
first — three of these five refused a rule, each for a reason the table could not show.
