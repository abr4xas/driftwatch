# 34: Condition 6 measures the corpus, and the corpus is small on purpose

**What to decide:** what to do about a condition that has not held since round eighteen, now
that growing the corpus is shown to make it worse rather than better.

**Type:** research

**Blocked by:** nothing. Reads clones already on disk.

**Status: new 2026-09-21.** Measured. Three of the five options are closed by the measurement;
the decision between the other two is Angel's.

## What condition 6 is

Not what it was. [ADR-0006](../../../docs/adr/0006-the-m1-precision-criterion.md) set it as
*aggregate precision ≥ 80% over the validation group*, and
[ADR-0009](../../../docs/adr/0009-precision-is-counted-in-quiet-repos.md) withdrew it after
four measurements, on a sentence worth keeping:

> A criterion that cannot be met by improving the tool is measuring the wrong thing.

What replaced it:

> **At least 90% of the corpus repos produce zero false positives**, over the whole corpus
> **and** over the validation group taken alone.

It counts **repos**, not findings, which is what makes it robust to one reclassification.

## Where it stands

| | measured | |
|---|---|---|
| whole corpus | **58 of 66 = 87.9%** | **not met** |
| validation alone | 29 of 32 = 90.6% | met |

Not met since round eighteen, found in ticket `20`, resolved there as "recorded, not chased".
Round twenty-seven moved nothing: every finding it withdrew was true.

Eight repositories carry a false positive. **Five of the eight are calibration**, so closing
them costs nothing under condition 9:

| repository | FPs | class | group |
|---|---|---|---|
| `vercel/next.js` | 2 | `placeholder` (`#anchor-a`, `#anchor-b`) | calibration |
| `raphaelmansuy/edgecrab` | 2 | `crate-nickname`, `foreign-project` | **validation** |
| `block/goose` | 1 | `runtime-log` | calibration |
| `fancy1108/Clutch` | 1 | `comma-separated-globs` | **validation** |
| `northword/zotero-format-metadata` | 1 | `generated-bundle` | **validation** |
| `remix-run/react-router` | 1 | `readers-project` | calibration |
| `saubakirov/KZ-IT-telegram-list` | 1 | `another-tools-layout` (`.tfw/`) | calibration |
| `vercel-labs/marketing-team-eve-template` | 1 | `third-party-convention` | calibration |

Closing **two** repositories reaches 60 of 66 = 90.9%.

## The measurement: thirty repositories, chosen blind

Pre-registered before looking, because the whole question is whether the corpus is selected on
its own output:

- **Population:** the 2533 audited discovery repositories.
- **Selection:** even stride through `repos.txt`, whose order cycles the twelve acquisition
  facets, so a long prefix is balanced across filename and size band. Deterministic.
- **Exclusions:** none based on findings. Not on count, not on cleanliness, not on being a
  skill farm.
- **What is computable without rulings:** a repository with **zero findings** has zero false
  positives by construction. That count is an honest lower bound. The rest need a person.

| | certification (66) | blind 30 |
|---|---|---|
| zero findings | 47 = **71%** | 20 = **66%** |
| with findings | 19 | 10 |
| findings in total | **32** | **306** |
| the worst repository | **4** | **247** |

The rate of repositories with findings is close. **The magnitude is two orders of magnitude
apart.** `BuilderIO/agent-native` has 768 sources and 247 findings — more than seven times the
whole certification corpus, in one repository.

### Why that breaks the condition

Condition 6 counts repositories, so a repository with 247 findings weighs the same as one with
1 — while having 247 chances to contain a false positive. At the corpus's own false rate of
about 31% (10 of 32), a 247-finding repository is dirty with practical certainty.

Projecting on that basis — **and it is a projection; nobody has ruled on those 306** — the
blind thirty come in around **25 clean of 30 = 83%**, which combines to (58+25)/96 = **86.5%**,
*below* the 87.9% it was meant to rescue.

**Adding repositories blind makes condition 6 worse, and not because the tool got worse.**

### The deferred plan's arithmetic was wrong by more than an order of magnitude

The 300-repo plan assumed **0.39 findings per repo**, taken from this corpus, and predicted
~118 findings at 300. A blind sample yields **10.2 per repo**; excluding the one outlier, 2.0.
Three hundred repositories is not 118 findings to adjudicate, it is on the order of **3000**.
Thirty already ask for 306, which is ten times the adjudication of twenty-seven rounds.

## Why the corpus looks the way it does, and it is written down

`scripts/corpus/repos.ts` says it plainly:

> Cloning them all costs ~2.7 GB, so the list is kept deliberately short and **new additions
> are chosen small**. `oven-sh/bun` and `supabase/supabase` have good context files but add
> ~1.5 GB between them, and are not needed.

So the corpus is a sample of **small repositories, selected for disk cost**. That is honest and
it was recorded. What was never recorded is that the selection has a measurement consequence:
small repositories hold small documents, small documents make few claims, and few claims cap a
repository at four findings where the wild reaches 247.

The corpus does two jobs and only one of them is hurt by this.

- **Finding false-positive classes to close.** Representativeness barely matters; any real
  repository that exposes a class is useful. Twenty-seven rounds of this have worked.
- **Producing a rate.** Representativeness is the whole thing. "58 of 66 real repositories",
  in the README and on the site, reads as a statement about repositories. It is a statement
  about small ones.

**And the constraint that shaped it is obsolete.** Ticket `06` built the blobless sparse clone
and measured 66 of 66 producing byte-identical conclusions at **2.8 MB per repository against
52.7**. `supabase` no longer costs 1.5 GB. The wall that remains is not disk, it is a person
reading 247 findings, and that one has not moved.

## The options

1. **Accept 87.9% and say which population it describes.** Free, honest, and leaves a
   condition unmet inside an ADR whose other eight hold.
2. **Close two calibration classes.** Cheap and legal under condition 9 — and none of the five
   has evidence outside the corpus itself: `.tfw` appears **0 times** in 2599 discovery
   repositories, and no placeholder-shaped anchor appears in the discovery corpus's
   `link/broken` findings at all. Writing a rule for a class with one instance is tuning to the
   exam, on the cheap side of it.
3. **Grow the corpus blind.** It lowers the rate — that half stands. It does **not** cost 306
   adjudications; see §"The cost was wrong" below. Thirty repositories cost about **31
   rulings**.
4. **Rewrite the condition to normalise by size.** ADR-0006 rejected rates over findings and
   ADR-0009 rejected them again; this would need an argument for why this time is different.
5. **Cap what one repository contributes.** Arbitrary, and the only option that addresses the
   actual cause: a per-repository binary over repositories of incomparable size.

1, 2 and 3 are all available today; 4 and 5 amend an accepted ADR and are Angel's call. The
interesting combination is 3 **with** 5: growing the corpus is affordable now, and what growth
exposes is precisely that a per-repository binary over repositories of incomparable size is
the wrong shape.

## What is not claimed

The 83% projection is a projection. No one has ruled on the 306 findings, the discovery corpus
carries no rulings, and none of these numbers is a precision or enters `CLASSIFICATION.md`.
What **is** measured is the shape: 71% against 66% clean, 4 against 247 at the worst
repository, 32 against 306 in total.


## The cost was wrong, and the correction is the useful part

Added 2026-09-21, after Angel pushed back on it twice.

This ticket first said thirty repositories cost **306 adjudications** and used that to close
option 3. That number assumed a person reads findings in whatever order they come out in, and
nothing forces that.

**Condition 6 counts repositories with zero false positives.** Declaring a repository *dirty*
costs exactly one ruling — the first false positive found. Only declaring it *clean* costs all
of them. So the cost is not the number of findings, it is the number of findings a person has
to read **before a repository is decided**, and that depends entirely on the order.

`pnpm discovery queue` produces that order. It asks the frozen `CLAIMS_A_PATH` of each
finding's own prose and sorts worst-first, repositories by their most doubtful finding. It
**orders and does not adjudicate** — the spec permits confidence to sequence work and never to
decide it, and no row means anything until a person opens the repository.

Over the same blind thirty, 301 `path/missing` findings in 9 repositories:

| repository | findings | lowest | readings to settle it |
|---|---|---|---|
| `MuLTiAcidi/claudeos` | 27 | **0.02** | 1 |
| `BuilderIO/agent-native` | 245 | **0.07** | 1 |
| `hecateq/hecateq-openagent` | 4 | 0.42 | 4 |
| `eggjs/egg` | 6 | 0.52 | 6 |
| `imarshallwidjaja/data-etl-dagster` | 4 | 0.53 | 4 |
| `CamilleScholtz/swmpc` | 9 | 0.74 | 9 |
| `TommyLike/KnowledgeBase` | 3 | 0.88 | 3 |
| `bmad-labs/skills` | 1 | 0.91 | 1 |
| `BetterSEQTA/DesQTA` | 2 | 0.93 | 2 |

**301 readings in arbitrary order, about 31 worst-first.** Twenty-one of the thirty
repositories need none at all.

And the head of the queue is why it works. `MuLTiAcidi/claudeos` is a security-research
repository whose most doubtful findings are `AAEAAAD/////`, `....//` and `././././etc/passwd`
— a base64 magic number and two path-traversal payloads, sitting in Markdown tables.
`BuilderIO/agent-native`'s is `feat/`, a branch prefix, then `.vscode/mcp.json` inside a
sentence listing *other* tools' config locations. One reading settles each.

**What is assumed and is not free.** That the lowest-scored finding really is a false
positive. Where it is not, the reading continues down the list, and the true cost sits between
31 and 301. For these two it is visibly 1; in general it is an ordering, not a guarantee.

**What does not change.** The rate. Those two repositories are almost certainly dirty, so the
blind thirty still land below the corpus's 87.9%, and growing blind still lowers the number.
What changes is that it is no longer expensive to find that out — and at roughly a ruling per
repository, the deferred 300-repo plan costs on the order of **310 rulings** rather than the
3000 findings this ticket first quoted.

The bottleneck the spec named — *"adjudication that stays cheap without losing the authority
of the measurement"* — is the thing `queue` addresses, and it is job 1 of § "Where the model
goes" arriving three days late.


## The queue was measured against the rulings, and the first signal did not work

Added 2026-09-21, the same day, after running it on the one labelled set that exists.

The section above claimed 301 readings become 31, on the strength of two repositories whose
most doubtful finding I read myself and called false. Nobody ruled on them. The certification
corpus has 28 ruled `path/missing` findings, so the claim can be checked properly.

| ordering | readings to settle all 18 repositories |
|---|---|
| worst-first, by `CLAIMS_A_PATH` | **25** |
| arbitrary order, mean of 2000 shuffles | **26.0** |
| reading every finding | 28 |

**One reading saved in twenty-six.** The ordering is worth nothing here.

### Why, and this is the part worth keeping

`CLAIMS_A_PATH` asks whether the sentence puts the candidate forward as a path in this
repository. For a true positive the answer is yes — it is a real claim about a path that has
gone. For **this corpus's false positives the answer is also yes**:

| p | ruling | finding | why it is false |
|---|---|---|---|
| 0.85 | false | `gateway/run.rs` | a crate's nickname |
| 0.89 | false | `agent/goose.txt` | a runtime log |
| 0.91 | false | `content/scripts/linter.js` | a generated bundle |
| 0.81 | false | `app/entry.server.tsx` | a path in the reader's project |

Every one of those sentences does put a path forward. They are absent for reasons that have
nothing to do with the sentence. The distributions overlap almost completely — false
positives mean 0.77, true positives 0.86, and the second most doubtful finding in the whole
corpus is **true**.

So ordering adjudication needs a question about **why a path might legitimately be missing**
— generated, foreign, a log, the reader's own tree — and that question does not exist. It is
not `CLAIMS_A_PATH` with the sign flipped.

### What survives

- The **arithmetic** stands: declaring a repository dirty costs one ruling, not all of them,
  so the cost of growing the corpus is bounded by repositories rather than by findings. That
  was the correction worth making and it is unaffected.
- The **9× on the blind thirty** does not stand as a measurement. It rests on two findings
  nobody ruled, in repositories with 27 and 245 findings — a regime the certification corpus
  cannot speak to at all, since its largest repository has four.
- `pnpm discovery queue` is committed with the negative result written into its own header,
  because the next person to reach for `CLAIMS_A_PATH` for this should find out here rather
  than by re-running it.

This is the second question this session to fail its control — the first was
`REWRITE_IS_RIGHT` in ticket `32` — and the failure has the same shape both times: an existing
instrument reached for because it was there, rather than a question designed for what was
actually being asked.


## The signal that does work, and it already existed

Added 2026-09-21, third revision of this section in a day. The previous one is left standing
because it is true of the question it tested.

`CLAIMS_A_PATH` fails here because it asks the wrong thing: a true positive and a
`generated-bundle` both have sentences that put a path forward. The question that separates
them asks **which known kind of misreading this is**, with "none of the above" on the list —
and it did not need writing, because `classify.ts` has asked it since the corpus-classify
pass and its answers for all 32 ruled findings were already on disk.

### Scored against the rulings

| | result |
|---|---|
| true positives answering `new` | **21 of 22** |
| false positives answering with a class | **9 of 10** |
| rule "a class was named ⟹ read it first" | **94%** accurate, against 69% for assuming everything is true |
| the `isReal` Noul beside it | true mean 0.51, false mean 0.43 — **separates nothing** |

And the classes it names are the ones the person named, one for one: `placeholder` →
`placeholder`, `runtime-log` → `runtime-log`, `crate-nickname` → `crate-nickname`,
`readers-project` → `readers-project`, `generated-bundle` → `generated-bundle`,
`foreign-project` → `foreign-project`, `comma-separated-globs` → `comma-separated-globs`,
`another-tools-layout` → `another-tools-layout`. The one it missed is
`third-party-convention`, which it called `new`.

**The leakage caveat, stated rather than buried.** The class list was written by reading these
very findings, so naming one of them is partly recognition and the 9-of-10 is an upper bound.
What is *not* leakage is the other column: 22 true positives answering `new` to a list that
was never fitted to them. That half is what the ordering rests on.

### On this corpus it still saves nothing, and that is the corpus

| ordering | readings to settle 19 repositories |
|---|---|
| reading everything | 32 |
| arbitrary, mean of 2000 shuffles | 28.3 |
| by `isReal` | 27 |
| by "a class was named" | **27** — the theoretical optimum |

The ordering is provably perfect here and buys 1.3 readings, because this corpus averages
**1.7 findings per repository** and there is nothing to skip. The value of an ordering scales
with findings per repository, and the certification corpus has none of the size where it
matters.

### On the blind thirty, where the size exists

301 `path/missing` findings in 9 repositories, 131 of them (43%) carrying a named class:

| repository | findings | with a class | first class named |
|---|---|---|---|
| `BuilderIO/agent-native` | 245 | 107 | `placeholder` |
| `MuLTiAcidi/claudeos` | 27 | 17 | `readers-project` |
| `eggjs/egg` | 6 | 3 | `readers-project` |
| `hecateq/hecateq-openagent` | 4 | 2 | `another-tools-layout` |
| `CamilleScholtz/swmpc` | 9 | 1 | `placeholder` |
| `bmad-labs/skills` | 1 | 1 | `another-tools-layout` |
| `BetterSEQTA/DesQTA` | 2 | 0 | — |
| `TommyLike/KnowledgeBase` | 3 | 0 | — |
| `imarshallwidjaja/data-etl-dagster` | 4 | 0 | — |

Six of nine repositories settle on their first reading; three have no named class and cost all
of theirs. **About 15 readings for thirty repositories**, against 301 read in full.

Still a projection — the first named finding has to actually be false, which held 9 times in
10 on the labelled set — but it rests on a measured instrument rather than on somebody's
glance at two rows.

`readers-project` is the most named class at 59 of 131, which is ticket `33` arriving from a
second direction: 19% of findings sit in documents about somebody else's project, measured
there by a different question over a different population.

### What this does to the options

Option 3 — grow the corpus — costs on the order of **half a reading per repository** *for
condition 6*. That turned out not to be the binding cost: conditions 3, 4 and 5 count false
positives per repository rather than asking whether there are any, and proving a ceiling
requires reading everything. Ticket `35` hit that wall with the thirty repositories selected
and nine of their findings ruled, and it is the demonstration option 5 was waiting for. That is a week of somebody's evenings, not an impossibility, and
the reason the plan was deferred in 2026-09-12 does not survive it.

What does survive is the other half, unchanged through all three revisions: **growing blind
lowers the rate.** The measurement is now cheap enough to stop arguing about and just do.
