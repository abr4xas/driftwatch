# 07: What is driftwatch's false negative rate?

**What to find out:** what [`discardReason()`](../../../src/extract/discard.ts) and the prose
gates throw away that was a real claim — the one measurement this project has never been
able to take.

**Type:** research

**Blocked by:** `06`

**Status: resolved 2026-09-19.** Instrumented, run over 700 repositories, read. See
§"Answer".

## The gap

Everything the project measures is on one side of the tool. `CLASSIFICATION.md` counts
findings and rules each one true or false, so **precision** is measured to four rounds of
detail and nine conditions. Nothing counts what never became a finding.

That is not an oversight, it is structural. Discards appear in no snapshot. There is no
artifact listing them. And inspecting them in a validation repo is precisely what ADR-0006
condition 9 forbids — [`corpus-repos.ts`](../../../scripts/corpus/repos.ts) draws the line in
those words: "Classifying its findings is the measurement and does not contaminate; opening
the repo to see what the tool discarded does."

So recall has never been estimated, and there is no hand-review route to estimating it. At
66 repos the discards are already tens of thousands of strings, and unlike findings they
have no natural ordering that puts the interesting ones first.

The discovery corpus removes both obstacles at once: nothing there is validation, so nothing
is contaminated by looking, and there are hundreds of thousands of discards to look at.

## What to do

Instrument the extractor to emit every discarded candidate with its `DiscardReason`, the
surrounding prose window, and the offset — the reason string already exists and the tests
already pin each rule by it, so the taxonomy is free. Run it over the discovery corpus. Then
ask, per discard, whether the document claims that path exists, and group the answers by
`DiscardReason`.

The output is a table: **rule → how many of its discards look like real claims**. That table
is the deliverable. It is not a recall figure, and it must not be quoted as one.

## Where the suspicion already points

The source files name their own costs, which is the most useful starting point:

- **`CONDITIONAL`** in [`context-prose.ts`](../../../src/extract/context-prose.ts) — the file
  calls it "the riskiest list in the file". It was measured over a 44-repo corpus where it
  suppressed exactly one finding, and the file says plainly: "that is evidence, not proof".
  `would`, `could` and `might` are common words; the rule is scoped to the sentence for that
  reason, and whether that scoping is enough is unknown.
- **`PLACEHOLDER_INDEXED`** — `/^[a-z]+[NMKXYZ]([-+]\d+)?$/`. The comment admits what it
  gives up: "a directory genuinely named `moduleX` or `partN`, which a tutorial repo really
  might have."
- **`isBareDirectory`** and **`isBareWord`** (ADR-0003, ADR-0004) — the two broadest rules in
  the file by volume. They are almost certainly right, and "almost certainly" has never been
  given a number.
- **`CREATE_IMPERATIVES`** — scoped to the opening of a sentence precisely because `add` and
  `create` are everywhere. The scoping is an argument, not a measurement.

## The trap to avoid

**A high number here is not a bug report.** Every one of these rules exists because a false
positive was worse than a false negative — `discard.ts` opens by saying so: "one false
positive costs more than ten false negatives, so when in doubt we discard." A rule that
throws away nine real claims to prevent one false positive may be correctly tuned.

What the table is for is **finding the rule that throws away ninety and prevents none**, and
distinguishing that from the ordinary cost the project already chose to pay. The output that
would justify a code change is a `DiscardReason` with a high rate of real-looking claims
*and* no corresponding false-positive class in `CLASSIFICATION.md` that it is defending.

## Why this is blocked by `06`

It needs the discovery corpus to exist, and the discovery corpus needs to fit on a disk.

## The honest outcome to be prepared for

The most likely result is that the broad rules are boringly correct and the interesting
signal is in one or two of the narrow ones. That is still worth having: "`isBareWord`
discards 40,000 strings and 30 of them looked like claims" converts an argued design
decision into a measured one, and ADR-0003 currently rests on the argument.

## Answer

Resolved 2026-09-19. The extractor reports its discards when somebody asks, the table exists,
and the outcome is the one this ticket § "The honest outcome to be prepared for" predicted:
**the broad rules are boringly correct and the signal is in two of the narrow ones.**

### What was built

`ExtractContext` carries an optional `DiscardSink`, **absent on every ordinary run**, and the
three extractors that consult a discard rule report to it every candidate they refuse — the
rule's name, the text as written, the offset and line, and the prose window the rule read.
`scripts/discovery/discards.ts` reads it over the clones: `discards` writes one JSONL line per
candidate and prints the table, `sample` prints the windows a person then reads.

Four decisions shape whether the table means anything.

**The prose gates now say which one closed.** `disclaims(offset)` answered yes or no, which
is all any extractor needs — a disclaimed claim is not emitted either way. It is now
`disclaimedBy(offset)` and answers with the name, because "the prose suppressed forty" is not
an answer to this ticket's question. `EXAMPLE` and `HEDGED` are reported apart although
`proseDisclaims` still tests them together: the file documents them as two arguments and the
riskiest list in it cannot share a row with the safest.

**All three extractors report, because the gates are shared.** The first version wired only
`extract/paths.ts`, and a review caught what that costs: the same `conditional` that refuses a
path also refuses an anchor link and a script name, so the gate rows would have been the
gates' cost *on path candidates* while being presented as the rules' cost. Measured both ways,
the difference is 60 discards in 94,972 — and **10 of `conditional`'s 32**, which is the row
where it matters, because it is the smallest and the one the file calls riskiest. `Discard`
carries the claim kind rather than folding the three together: "does the repository have this
path" is a question about a path and nobody asks it of `pnpm build`, so `exists` is simply
absent for the other two.

**A gate is only credited with a candidate the shape rules would have let through.** The
gates run first and inline code is mostly not paths at all, so without this condition
`conditional` is charged with every backticked `true` and `pnpm test` in the corpus. A table
that blames the riskiest rule in the file for the frequency of ordinary inline code is worse
than no table, because it reads like evidence. The counterfactual is paid for only when a
sink is listening.

**A column the ticket did not ask for: `absent`.** Whether the repository has that
path anyway, resolved both ways a claim resolves. A rule that threw away four thousand
strings naming files that are right there threw away nothing, and separating those first is
what makes the reading tractable — it is the difference between 94,912 discards and the few
hundred worth a person's attention. It is **not** "would have been a finding": everything
`path-claim.ts` declines to answer — generated, absent tool, ignored by git — runs after this
and is not asked. A candidate that was never a path counts as absent, because it is one of the
ones worth reading and there are 60 of them.

`discards.jsonl` is rewritten whole on every run rather than appended to, the opposite of
`results.jsonl`. That file resumes because it is bought with rate limit and hours of network;
this pass is local and costs a minute per hundred repositories. What resuming would buy is
small and what it would cost is a file half computed by one version of `discard.ts` and half
by another — a table over which is a table about no rule that exists.

The caveat is printed **with** the table rather than left here, because a table of counts over
somebody else's repositories is the thing most likely to be pasted somewhere and it looks
exactly like a measurement of driftwatch.

### The table

Over **700 discovery repositories, 94,972 discards**. `count` is discards, `distinct` is
distinct texts, `repos` is how many repositories the rule fired in, and `absent` is the subset
not known to be satisfied — the ones a person then reads. Of the 1023 discards the prose gates
account for, 963 were path candidates, 54 script names and 6 anchor links.

| rule | count | distinct | repos | absent |
|---|---|---|---|---|
| `bare-word` | 58713 | 26161 | 631 | 54944 |
| `has-spaces` | 14678 | 9462 | 551 | 14646 |
| `glob-or-placeholder` | 6263 | 3805 | 417 | 6247 |
| `bare-directory` | 3902 | 994 | 399 | 1744 |
| `module-specifier` | 3408 | 1739 | 281 | 3373 |
| `not-path-shaped` | 2978 | 1822 | 357 | 2144 |
| `absolute-path` | 2702 | 1255 | 214 | 2555 |
| `url` | 945 | 586 | 188 | 945 |
| `hedged` | 266 | 219 | 84 | 106 |
| `create-instruction` | 232 | 196 | 82 | 97 |
| `home-path` | 225 | 161 | 60 | 225 |
| `example` | 216 | 191 | 95 | 87 |
| `creation-target` | 177 | 73 | 33 | 115 |
| `metasyntactic` | 122 | 35 | 19 | 122 |
| `external-root` | 70 | 61 | 17 | 21 |
| `conditional` | 32 | 24 | 17 | 26 |
| `another-repo` | 30 | 28 | 15 | 7 |
| `not-a-file` | 13 | 9 | 3 | 10 |

**This is not a recall figure and must not be quoted as one.** No number in it is a precision,
none of it enters `CLASSIFICATION.md`, and none of it moves a condition of ADR-0006. What it
is is a map of where to read.

### What the reading found

Samples were taken with an even stride through the file — not the head, which is one or two
documents and would be reading their habits — and restricted to the `absent` column.

**The three broadest rules are right, and now measurably so.** Fourteen `bare-word` discards
read end to end are identifiers, branch names, environment variables, CLI flags, CSS class
names and C# types; not one is a claim about a path. `has-spaces` is commands, keystrokes and
frontmatter descriptions. `glob-or-placeholder` is globs, CSS selectors, TOML table headers
and JSX. `url` and `home-path` have no doubtful case at all. **ADR-0003 and ADR-0004 were
arguments and are now measurements**, which is exactly what this ticket said would be worth
having even if nothing else came of it.

**`absolute-path` costs what `discard.ts` says it costs.** The sample is slash-commands
(`/skill-creator`, `/ship`, `/tdd`, `/exit`), HTTP routes and `/tmp`. One real claim turned up
— `first-digital-finance/pyrmq`'s "`/tests/` - Test suite" — which is the 1.6% the module
already documents, found in the wild.

**`bare-directory` is the honest cost, and most of it is not a cost.** 1744 of 3902 name
something absent, and the recurring names are `dist/`, `build/`, `node_modules/`, `.venv/` —
generated or ignored, and suppressed downstream anyway — alongside `src/`, `test/`, `specs/`
and `references/`, which are ADR-0004's actual case: a single segment that does not pin down a
location, usually written by a monorepo about one of its packages.

**`hedged` holds the one rule whose scope is wrong.** `optional` fires 87 times, a third of
the whole gate, where the next marker down fires 32. It is tested as a substring against the
**two-line window**, so a sentence about optional *parameters* silences the claims of its
neighbours — `haddocking/haddock3` asserts three files exist in three consecutive sentences
and loses all three. Dropping it leaves the certification corpus identical, finding for
finding, and `CLASSIFICATION.md` names no false positive it prevents. Ticket `16`, with the
evidence and the options; it is a change to `src/extract/`, so it was not made here.

**It was then made, measured and reverted** — see `16`, and the sentence above is left as it
was written rather than quietly corrected. "The one rule whose scope is wrong" was the reading
this table supported and it did not survive contact with the findings: scoping `optional` to
the sentence released 43 candidates and produced, over the same 700 repositories, **two new
findings and no removals, both of which I read as false positives**. The headline case silenced
three files that all resolve under `src/haddock/`, which `path-claim.ts`'s `exists-as-suffix`
rule answers whatever the gate does. In that sample, and given the rules that run after it, the
marker prevents two false positives and costs no findings.

**`conditional` fires rarely and is wrong more often than not when it fires.** 32 discards in
700 repositories, 26 absent, and reading them: roughly half are real claims where the modal
qualifies something other than the path — "components stored in `./assets/`: anything a second
lesson **could** reuse", "`store/layout.ts` restore" inside a sentence about what *would*
happen. The scoping to the sentence works as volume control, and within that volume the word
usually belongs to a different noun. The file calls this "the riskiest list" and says its
44-repo measurement was "evidence, not proof"; at 700 repositories it is still 22 discards,
which is the part that keeps it defensible.

**`create-instruction` and `creation-target` are correct.** Every sampled case is a
destination the document tells the reader to make. `example`, `external-root` and
`another-repo` behave; the `example` exceptions are the two-line window bleeding into a
neighbouring bullet, the same shape as `optional` and much rarer.

**Two small classes nobody had named.** A candidate written `./name.md` loses its one locating
signal to normalization and then dies as a bare word — 21 discards, 7 absent, and at least two
of those seven would have been false positives, so it is visible and not clean. And `NOT_FILES`
matches the last segment, so a real `dist/vue.js` is discarded as the framework `vue.js`.
Neither is worth a ticket on this evidence; both are written down here.

### What the run produced that was not a discard

**`petems/terraform-provider-extip` ended the pass with "this is a driftwatch bug".** A
`.cursor/rules/*.mdc` whose frontmatter says `globs: *.go` — an alias to an anchor that does
not exist — parses cleanly and throws in `doc.toJS()`, one line past the guard
`parseFrontmatter` was written around. Ticket `15`, fixed: 7 files in 4 of the 700
repositories, and the 4 now audit instead of exiting 2 with nothing looked at. The final pass
over 700 read **0 failed**.

### What this does to ADR-0006

Nothing, by construction. The certification corpus is unchanged through all of it — 66 repos ·
320 sources · 33 findings, calibration 21 · validation 12 — which is also the evidence that
the instrumentation is behaviour-neutral: a sink nobody attaches changes no finding anywhere.

### A second limit, and this one is an error in the reading above

The `conditional` paragraph says "roughly half are real claims", counted over occurrences. Over
700 repositories those 26 occurrences are **18 distinct texts**, and `./assets/` is counted
four times — two repositories carrying the same `.agents/skills/teach/SKILL.md`, which differ
by one byte, a comma promoted to an em dash. One document, four votes.

The direction of the paragraph survives: `conditional` fires rarely and the modal usually
qualifies something other than the path. The proportion does not, and it was reported before
it was caught.

Exact duplication is not the cause and does not need a model: over the same 700 clones, 21
document contents appear in more than one repository and **zero findings come from any of
them**. The pair that did the damage is a *near* duplicate, which no hash sees. That is ticket
`17`, and it is the thing to build before anything else reads this corpus for classes.

### The limit of this table

Every row is an **upper bound on a rule's cost, not its cost**, and that part is definitional
rather than discovered: releasing N candidates from a rule can produce at most N findings, and
usually fewer, because everything `path-claim.ts` declines to answer runs *after* the discard
rules and catches what they let through. `absent` narrows the bound and does not close it —
the column's own docstring says it is not "would have been a finding".

What `16` added is the one thing the definition does not give: **how loose the bound can get.**
43 discards released from a gate, 14 of them in the `absent` column, and zero new true
findings. That is one measurement of one gate and it is not a rate, but it is enough to stop
anybody reading a row as a cost.

So the method for arguing about a rule is: change it, audit the discovery corpus before and
after, and diff the findings. This table says where to look and nothing more.

### What is left

Nothing in this ticket. `16` is resolved — the one rule that looked worth changing was changed,
measured and left alone — and `15` is fixed. The instrumentation stays for the next rule
somebody wants to argue about.

### What a review caught

Two reviewers read this against the tickets and against `AGENTS.md`. Four things were worth
changing and one of them changed the numbers.

**Only one extractor was reporting.** The gates are shared and the table said "rule", so the
prose rows understated every gate. Fixed above, and it moved `conditional` from 22 to 32.

**A discovery-corpus count had been written into `test/frontmatter.test.ts`** — "4 of the ~700
repositories" — four lines of reasoning away from the rule that forbids it. Same mistake ticket
`09` recorded, in a new file. The provenance sentence stays and the count lives in `15`.

**`discards.jsonl` dropped the offset** the ticket asks for, keeping only the line. A line does
not locate a span; both are written now.

**The module was 250 lines of a second job inside the acquisition runner.**
`discovery-discards.ts` splits it, with `discovery-files.ts` underneath holding the on-disk
layout — which is not only tidiness: `discovery.ts` ends in a top-level `await`, so a module it
imports on demand cannot import it back without deadlocking. That deadlock happened and is why
the third file exists.

Two caveats the review raised are recorded rather than fixed, because they are properties of
the design and not defects. The table is **first-rule-wins**: a candidate both disclaimed and
declared a destination is credited to whichever gate ran first, exactly as `discardReason`'s
internal order already decides between shape rules — so a row means "what this rule was the
first to throw away". And for a frontmatter candidate the `window` is the YAML line rather
than prose any gate read, which is what that column can be there.

## The same instrumentation over 2533 repositories

Re-run on 2026-09-20. 2532 repositories read, 1 failed (`23`), **1 352 382 discards**, 534 MB.

The table above is counted per document, and over this corpus that is the wrong resolution:
**446 465 of the 1 352 382 — one in three — are the same document counted again.** Ticket `17`
measured 5.3% over 700 repositories and understated it sixfold.

Both resolutions, which `pnpm discovery table` now prints side by side:

| rule | every discard | one per family per rule | falls |
|---|---|---|---|
| `bare-word` | 875 870 | 569 016 | −35% |
| `has-spaces` | 194 197 | 134 454 | −31% |
| `glob-or-placeholder` | 74 533 | 49 723 | −33% |
| `not-path-shaped` | 67 113 | 53 486 | −20% |
| `module-specifier` | 35 846 | 25 727 | −28% |
| `bare-directory` | 35 532 | 29 404 | −17% |
| `absolute-path` | 30 972 | 21 890 | −29% |
| `url` | 15 535 | 7340 | **−53%** |
| `hedged` | 7127 | 6348 | −11% |
| `create-instruction` | 5569 | 1777 | **−68%** |
| `example` | 2695 | 1929 | −28% |
| `home-path` | 2536 | 1897 | −25% |
| `creation-target` | 1930 | 736 | **−62%** |
| `external-root` | 1501 | 1220 | −19% |
| `metasyntactic` | 748 | 440 | −41% |
| `another-repo` | 385 | 311 | −19% |
| `conditional` | 237 | 164 | −31% |
| `elsewhere` | 35 | 35 | **0%** |
| `not-a-file` | 21 | 20 | −5% |

### The spread is the finding, not the totals

A uniform third would have meant the collapse is a rescaling and nothing more. It is not.

`create-instruction` loses two thirds and `creation-target` nearly as much: they fire on
sentences a template carries — *"create a `SKILL.md` in this directory"* — copied verbatim into
thousands of repositories. Most of their apparent cost is one template, counted again.

`elsewhere` loses nothing at all, 35 and 35. It fires on a sentence somebody wrote by hand
about their own repository, which is what ticket `18` argued it was for.

So the two columns separate **rules that measure the ecosystem from rules that measure a
template**, and no amount of reading the per-document table would have shown which was which.

### And the population underneath is not what the 700-repo table assumed

| | |
|---|---|
| documents | 194 846 |
| **median per repository** | **2** |
| repositories with ≤10 | 1980 of 2599 |
| repositories with >100 | 208 |
| the 12 largest | **35% of all documents** |

`Sandeeprdy1729/skill_galaxy` alone holds 10 293 `SKILL.md`. This is not one population: it is
roughly two thousand repositories with two or three documents, plus a couple of hundred skill
farms. §"What this table is not" already says a row is an upper bound on a rule's cost rather
than its cost; this adds that the bound is computed over a population a dozen repositories
dominate.

Which is ticket `11`'s lesson — **count repositories, not files** — at a scale where it stops
being a precaution. The `repos` column was always the honest one.
