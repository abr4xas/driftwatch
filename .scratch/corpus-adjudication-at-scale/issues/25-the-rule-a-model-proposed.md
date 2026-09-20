# 25: The rule a model proposed, and the corpus that refused it

**What to decide:** whether a bare file name may be claimed against a directory the same
sentence names.

**Type:** research

**Blocked by:** nothing; it reads the discard table `07` produced

**Status: resolved 2026-09-20. No.** The rule was built and measured. It takes the corpus from
37 findings to 118. See §"Answer".

## Where the proposal came from

`pnpm discovery claims` asks, of 800 `bare-word` discards that resolve nowhere, whether the
sentence puts the word forward as a path in this repository. It is a Noul over one candidate
and its own sentence — deliberately not a comparison between two candidates, which is the
question that had just failed twice in `discovery findings`.

| P(the sentence claims a path) | candidates |
|---|---|
| 0.00–0.20 | 606 (76%) |
| 0.20–0.60 | 93 (12%) |
| 0.60–0.80 | 37 (5%) |
| **0.80–1.00** | **64 (8%)** |

[ADR-0003](../../../docs/adr/0003-a-path-needs-a-slash.md) says a bare `foo.ts` is "almost
never" a claim about a concrete path. That is the first number anyone has put on the phrase:
**right 92% of the time.**

The 8% had a shape. 61 of the 64 carry a file extension, and **33 sit in a sentence that
already names a directory**:

    `lib/` holds the HLS library, organized under `lib/hls/`
    (core modules like `packager.ex`, `tracker.ex`)

    `scripts/` – Developer utilities: `format.sh`, `test_mcp_server.py`

    `config/` — agent definitions (`agents.json`) and the skills list

`packager.ex` is not an ambiguous name there. So: claim a bare name with a known extension
against the nearest directory the sentence gave it, before it, never after.

## Answer

Resolved 2026-09-20. **The 66 refused it.**

| | findings |
|---|---|
| before | **37** |
| the rule as proposed | **118** |
| narrowed — no suffix patterns, no base with a hole | **104** |

67 new findings over 66 repositories that four-and-twenty rounds of adjudication had left at
37. Narrowing recovered 14 of them and the remaining two failures are structural, not tuning:

### The directory usually has no trailing slash

`unjs/nitro`'s `AGENTS.md`:

    - `src/config/` — Config defaults (`src/config/defaults.ts`) ...
    - `src/dev` — Development server logic (`app.ts`, `server.ts`, `vfs.ts`).

The directory this item is about is `src/dev`, with no slash, so a rule looking for a token
ending in `/` cannot see it — and finds `src/config/` in the item **above**, because the prose
window deliberately carries the lead-in. Three findings, all claiming `src/*.ts` for files that
live in `src/dev/`. Nobody wrote that claim.

Relaxing "ends in a slash" to "contains one" does not save it: then `src/config/defaults.ts` on
the line above is a candidate base too, and the rule is guessing between three tokens rather
than two.

### A bare name in a document that teaches a convention belongs to the reader

`remix-run/react-router`'s `AGENTS.md`:

    - `about.tsx` → `/about`

That is the routing convention, written for somebody else's `app/routes/`. It is
`readers-project`, a class [`CLASSIFICATION.md`](../../../test/corpus/CLASSIFICATION.md)
already names and `24` found in 19% of wild documents. Any rule that reaches a bare name in a
tutorial reaches this, and there is no directory test that separates them — the sentence names
a real directory in both cases.

### What survives

**ADR-0003 stands, and now it has a number.** "Almost never" is 92%, measured over 800
candidates in 2533 repositories rather than argued. That is worth more than the phrase was.

The gate is pinned shut by `test/discards.test.ts` § "a bare name the sentence seems to
locate", with the `unjs/nitro` shape as a test of its own, so the next person to have this idea
finds the measurement rather than repeating it.

### What it says about the method

This is the first rule in the branch that came from a model rather than from a person reading,
and the pipeline worked exactly as designed: Jev found a population nobody would have found by
hand, a person wrote the rule, and **the 66 killed it before it shipped**. Nothing here
adjudicated anything.

Worth being plain about the cost: the proposal was real and the examples exist, and the rule
still does not survive. A measurement that says no is the pipeline working, not the pipeline
failing — but it means the branch's Jev work has produced no line of `src/` yet, and that is
the honest state of it.
