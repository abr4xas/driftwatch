# 35: The corpus cannot grow under its own conditions

**What to decide:** whether ADR-0006's conditions 3, 4 and 5 are rewritten, given that they
are unstatable over a repository the size of a real one.

**Type:** research

**Blocked by:** nothing. It has the measurement and the wall.

**Status: resolved 2026-09-21 by [ADR-0015](../../../docs/adr/0015-the-tail-conditions-are-two-tautologies-and-one-impossibility.md).**
Thirty repositories were selected, pinned and queued; nine findings were ruled by hand; the
growth hit the wall below; and the wall was then removed by withdrawing the three conditions
that made it. Conditions 3 and 4 turned out to be arithmetic consequences of condition 6 and
condition 5 unstatable over a repository of real size. The thirty are affordable again — about
sixteen readings — and the selection survives in [`35-packet.md`](./35-packet.md).

## What was done

Ticket `34` established that growing the corpus is affordable — about half a reading per
repository — and Angel asked for it. The selection was pre-registered before anything was
looked at:

- **Population:** the 2533 audited discovery repositories.
- **Selection:** even stride through `test/discovery/repos.txt`, whose order cycles the twelve
  acquisition facets. Deterministic and reproducible.
- **Exclusions:** none based on findings — not count, not cleanliness, not skill farms.
- **Group:** calibration, not validation. The `@` rule of round twenty-nine was derived from a
  frequency over all 2533, these included, so none of them can honestly be held out.

Thirty repositories, each pinned to the sha its discovery clone sits on. Twenty produce no
finding. Ten produce **306** between them, and [`35-packet.md`](./35-packet.md) is the reading
order `pnpm discovery queue` put them in.

## The nine rulings, which stand

Angel read the top finding of each of the nine `path/missing` repositories. They are recorded
here rather than in `CLASSIFICATION.md`, because these repositories are not in the corpus:
**a ruling on a repository the corpus does not hold measures nothing**, and putting it there
would make the bookkeeping test agree with a file that describes 96 repositories where 66
exist.

| repository | finding | ruling | why |
|---|---|---|---|
| `hecateq/hecateq-openagent` | `.github/instructions/` | **false** | another tool's layout |
| `eggjs/egg` | `src/global.d.ts` | **false** | no `src/` at the root; it is a monorepo of `packages/` |
| `CamilleScholtz/swmpc` | `metadata/version/` | **false** | the real tree is `Store/ios/version/` |
| `MuLTiAcidi/claudeos` | `herokucdn.com/error-pages/no-such-app.html` | **false** | a host in a subdomain-takeover table |
| `BuilderIO/agent-native` | `feat/` | **false** | a branch prefix |
| `bmad-labs/skills` | `.claude/commands/` | **true** | `.claude/` is there, `commands/` is not |
| `BetterSEQTA/DesQTA` | `../../docs/…-analysis.md` | **true** | the file exists; the link is one level short |
| `TommyLike/KnowledgeBase` | `repo/CHANGELOG.md` | **false** | line 81 of the same file: "if the repo is not cloned, `git clone --depth 1` first" |
| `imarshallwidjaja/data-etl-dagster` | `data-lake/blobs/` | **false** | `services/minio/AGENTS.md`: "MinIO storage … users write to `landing-zone`, the pipeline writes to `data-lake`" |

**Jev was wrong on two of nine**, and both in the same way. It called `repo/CHANGELOG.md` and
`data-lake/blobs/` genuine, and the evidence that they are not sits **58 lines above** in one
case and **in a sibling document** in the other — outside the two-line window the question is
asked over. The instrument scored 94% against the 32 already-ruled findings; two wrong in nine
is worse than that and the sample is too small to say more than "as expected, roughly".

## The wall

Condition 6 asks *does this repository have a false positive*, and one reading settles it.
Conditions 3, 4 and 5 ask **how many**:

> 3. Median false positives per repo: 0
> 4. 90th percentile ≤ 1
> 5. **No repo above 2**

Proving `BuilderIO/agent-native` is not above 2 requires reading all **244** of its findings.
There is no short cut: a ceiling is only demonstrable by exhaustion. And
`corpus-bookkeeping.test.ts` encodes it — *"records every finding the snapshots carry, and
invents none"* — so every one of the 306 needs a row and a ruling.

So the cost of these thirty repositories is **306 readings, not 16**. Ticket `34`'s estimate
was right about condition 6 and wrong about ADR-0006.

### And that is the finding

**Conditions 3 to 5 were written for small repositories and are unstatable over real ones.**
"No repo above 2 false positives" is a sentence with content when the largest repository in
the corpus produces four findings. Over one that produces 244 it is not merely expensive to
check — it is almost certainly false, because 244 findings at the corpus's own false rate is
tens of false positives in a single repository.

The corpus cannot grow under its own conditions. Not because adjudicating a repository is
expensive, but because three of the nine conditions are **per finding** and were written when
no repository produced more than four.

This is ticket `34` option 5 arriving with a demonstration instead of an intuition.

## What was not done, deliberately

- **Adding the thirty with 297 unruled findings.** The bookkeeping test would go red and stay
  red, and a corpus with unruled findings in it is not a certification corpus.
- **Adding only the twenty that produce nothing.** That is selecting on the tool's output,
  which [`spec.md`](../spec.md) § "The one place they touch" names as choosing the exam
  questions after seeing the answers.

Both were available and both are worse than stopping.

## What would unblock it

Rewriting conditions 3 to 5 so they do not depend on repository size — false positives per
hundred sources, or a cap on what one repository contributes, or dropping them in favour of
condition 6 alone, which is already the quiet-repo rate ADR-0009 argued for. That amends an
accepted ADR and is Angel's call; nothing here does it.

The thirty repositories, their shas and the reading order survive in
[`35-packet.md`](./35-packet.md), so whoever takes the decision does not repeat the selection.
