# 08: driftwatch does not look where skills live

**What to decide:** whether `classifySource` should recognise a `SKILL.md` outside
`.claude/skills/`, and at what false-positive cost.

**Type:** research

**Blocked by:** nothing

**Status: in progress.** Discovery widened to three roots 2026-09-19; the corpus diff is
saved and unadjudicated. Originally **REOPENED 2026-09-18**. It was resolved the same day with a decision not to widen,
and that decision was wrong. The reasoning is kept in §"Answer" and overturned in
§"Correction", because the way it failed is worth more than the conclusion was.

## The measurement

[`classifySource`](../../../src/core/discover.ts) classifies a file as a `skill` only when
its path carries the `.claude` + `skills` pair. Across 70 repositories sampled from the
skills.sh index — every one of them a repo that publishes at least one skill:

| Where the `SKILL.md` lives | Repos | |
|---|---|---|
| somewhere else (`skill/`, `.github/plugins/*/skills/`, nested) | 31 | 44.3% |
| `skills/` at the repo root | 27 | 38.6% |
| repo root | 8 | 11.4% |
| **`.claude/skills/`** | **4** | **5.7%** |

**94% of published skills are invisible to driftwatch.** Not mis-audited — never classified
as a source, so no check reaches them.

## Why this was not obvious

`test/corpus/` has 31 skill sources across 66 repositories and they are all under
`.claude/skills/`, because the corpus was assembled from repos that use Claude Code. The
sampling frame and the blind spot line up exactly: a corpus of Claude Code repositories
cannot show you that the wider ecosystem puts skills somewhere else.

Round eleven of [`CLASSIFICATION.md`](../../../test/corpus/CLASSIFICATION.md) read 30 real
skills and found nothing, and concluded the check is silent because published skills are well
formed. That conclusion survives — 244 real skills, correctly placed, produced zero genuine
findings, which is the same result at eight times the mass. But it was only ever half the
story, and the corpus could not have shown the other half.

## The decision, and why it is not obvious either

**For:** a check that runs on 6% of its subject matter is close to not shipping. `skills/` at
the root is `npx skills`'s convention and it is 38.6% on its own — one extra pattern would
take coverage from 5.7% to 44.3%.

**Against:** `skills/` is an ordinary English word and an ordinary directory name. Matching
any `skills/` in any repository is a rule about somebody else's vocabulary, applied to repos
that never heard of Claude Code, and the five `skill/frontmatter` rules would then fire on
files that are not agent skills at all. [ADR-0008](../../../docs/adr/0008-a-specification-is-not-an-agent-context-file.md)
rejected `docs/` for this exact shape of reason, and the project's rule — one false positive
costs more than ten false negatives — points the same way.

**The middle, and probably the answer:** gate it the way
[`foreign-tools.ts`](../../../src/verify/foreign-tools.ts) gates its list. That module only
suppresses when the root is *absent*, because presence is evidence. Here the evidence
available is the file's own content: a `SKILL.md` with frontmatter carrying `name` and
`description` is an agent skill wherever it sits, and a `skills/` directory full of anything
else is not. A rule keyed on "file named `SKILL.md` **and** frontmatter with the required
keys" would be about the thing itself rather than about a directory name.

That has a cost worth naming before anyone likes it too much: `skill/frontmatter`'s first
rule is **`name` matches its directory**, and it is the rule most likely to fire. Under a
widened `classifySource` the "directory" would sometimes be a plugin folder or a repo root,
where that rule means nothing. Widening discovery and keeping all five rules is not one
decision, it is two.

## What to do

1. Widen the sample. 70 repos from one registry is a frame with its own bias; the population
   that matters for `04` is repos that never published. Confirm the ratio holds there.
2. Decide the rule shape — path pattern, content gate, or both — and price it against the
   `false-positive-traps` fixture.
3. Decide, separately, which of the five `skill/frontmatter` rules still apply to a skill
   found outside `.claude/skills/`.
4. If anything changes in `classifySource`, the corpus snapshots move and every diff needs
   the usual hand review. That is the real cost of this ticket and it is not small.

## What is not in question

This does not touch the two-corpus split, and it needs no discovery corpus to act on: the
measurement above took 70 API calls. It is the cheapest open ticket in this directory and
the only one whose subject is the shipped tool rather than the research around it.

## Answer

### The sample was widened first, as step 1 asked, and it moved the number

The 70-repo figure in the body came from repos that publish to skills.sh, one row per
publisher. A second sample — 1000 code search results, **780 unique repos, 771 of them not in
the skills.sh index** — is both larger and independent of the registry:

| Where the `SKILL.md` lives | Repos | |
|---|---|---|
| `skills/` nested (`.agents/skills/`, `plugins/*/skills/`, `src/skills/`, …) | 344 | 44.6% |
| `skills/` at the repo root | 122 | 15.8% |
| no `skills` segment at all | 110 | 14.3% |
| repo root | 105 | 13.6% |
| **`.claude/skills/`** | **88** | **11.4%** |

So the direction holds and the magnitude does not: **11.4%, not 5.7%.** The first sample was
biased by being per-publisher over a registry. Recorded rather than quietly replaced, because
the 5.7% has already been cited in `02` and in a commit message.

### What the candidate rules would actually cover

| Rule | Coverage |
|---|---|
| A — `.claude/skills/` (today) | 11.5% |
| B — `<tool-root>/skills/`, reusing `foreign-tools.ts`'s list | 19.0% |
| C — any `skills/<dir>/SKILL.md` | 71.2% |
| D — any file named `SKILL.md` | 97.7% |

B is the tempting one, because the list already exists and `.agents/skills/` and
`.cursor/skills/` do show up in the data. It buys 7.5 points.

### The measurement that decides it

125 real `SKILL.md` files were fetched across the five layouts, 25 each, and parsed **with
driftwatch's own `parseFrontmatter`** rather than with a hand-rolled reader. That choice
mattered: a naive parser reported 15 descriptions under the 20-character floor, and the real
one reports **zero** — all fifteen were block scalars (`description: >`) that the naive
regex read as empty. Round eleven's 50-character margin stands.

The rule that decides is the first one, `name` matches its directory:

| bucket | comparable | mismatch | rate |
|---|---|---|---|
| `.claude/skills/` | 23 | 2 | **9%** |
| `skills/` at root | 22 | 1 | 5% |
| `skills/` nested | 23 | 4 | 17% |
| elsewhere | 22 | 4 | 18% |
| repo root | 0 | — | 22 files with no directory to compare against |

And reading all eleven mismatches, **eight are not drift**:

```
Sales Pipeline Tracker     dir=sales-pipeline-tracker     title case vs kebab
Hook Development           dir=hook-development           title case vs kebab
Bankr Dev - Portfolio      dir=bankr-dev-portfolio        title case vs kebab
Writing for Developers     dir=writing-for-developer      title case, and a plural
Agent Browser              dir=sakaen736jih_agent-...     directory is generated
graph                      dir=2026-08-24T09-20-09-850Z   directory is a timestamp
new-skill                  dir=skills                     no skill directory at all
skill-name                 dir=skill                      a template's placeholder
```

Three are plausibly real: `inov8-orthopedics-design` vs `inov8-orthopedics`,
`flutter-animating-apps` vs `animations`, `testbench-package-testing` vs `testbench-docs`.

**So widening `classifySource` to layout D would add roughly one false positive for every
eleven skills found.** ADR-0006's conditions 3 through 6 count repos with *zero* false
positives, and a repo with thirty skills would trip them on its own. The answer to step 2 is
that no path pattern is safe, and a content gate does not save it either: the gate is about
whether the file is a skill, and the false positives here are skills — it is the **rule**
that does not travel, not the classification.

### Decision

**`classifySource` does not widen.** `docs/spec/ROADMAP.md` provides for exactly this
outcome: tune the heuristics, or accept that the check does not get there and say so. This is
saying so, with a number attached.

What the check covers is 11.4% of the `SKILL.md` files in the world, and that is the honest
figure to cite for `skill/frontmatter` from now on — not as a defect to fix, but as the scope
of what it claims.

### Two things this turned up that are not about widening

**1. A fixable false positive in the check as it ships today.** Reproduced against real
driftwatch:

```
.claude/skills/bankr-dev-portfolio/SKILL.md
  ✗ 2  name  name does not match the directory  → bankr-dev-portfolio?
1 fixable with --fix
```

`name: Bankr Dev - Portfolio` is a human-readable title; the directory is its kebab-case
form. driftwatch offers to **rewrite the title into the slug**. ADR-0006 condition 2 admits
no false positive among the fixable findings at any rate, and this one is one — if a
title-cased `name` is legitimate. That is the part this ticket cannot settle: whether Claude
Code requires `name` to equal the directory is a question about Claude Code's contract, not
about driftwatch, and it has to be answered from that specification before anything changes.
It appeared in **1 of 23** real `.claude/skills/` skills sampled, which is not rare.

**2. The container case is already handled.** `.claude/skills/SKILL.md`, with no skill
directory of its own, produces no finding — checked, not assumed. Comparing `name` against
`skills` would have been meaningless and the code already declines to.

### What was not done, and why

No code changed. Step 4 of this ticket priced a `classifySource` change at "the corpus
snapshots move and every diff needs hand review", and the measurement says the change should
not happen. Paying that cost for a rule that adds a false positive every eleven skills would
be the treadmill of rounds 13-16 with the direction reversed.

## Correction

The decision above is withdrawn. It rested on a claim I made up.

### The specification exists, and it says the opposite

<https://agentskills.io/specification.md> — linked from `abr4xas/skills`'s own
`validate-skills.sh`, which quotes it line by line. It was one fetch away and I did not make
it.

On `name`:

> * Must be 1-64 characters
> * May only contain unicode lowercase alphanumeric characters (`a-z`, `0-9`) and hyphens
> * Must not start or end with a hyphen
> * Must not contain consecutive hyphens
> * **Must match the parent directory name**
>
> ```yaml
> name: PDF-Processing  # uppercase not allowed
> ```

And on layout:

> A skill is a directory containing, at minimum, a `SKILL.md` file:
> ```
> skill-name/
> ├── SKILL.md
> ```

**`.claude/skills/` appears nowhere in the specification.** It is where Claude Code
*installs* skills, which is a different fact from where skills *are*. driftwatch's
`classifySource` encodes the installation path as if it were the format.

### The false positives were not false

Re-measured against the spec instead of against my assumption — 114 files with a parseable
`name`:

| | |
|---|---|
| `name` violates the character rule | 8 (7%) |
| `name` does not match its parent directory | 13 (11%) |
| **either** | **14 (12%)** |

Every one of the "title case is legitimate" cases breaks the character rule *as well as* the
directory rule:

```
CHARS DIR  Sales Pipeline Tracker     dir=sales-pipeline-tracker
CHARS DIR  Hook Development           dir=hook-development
CHARS DIR  Bankr Dev - Portfolio      dir=bankr-dev-portfolio
CHARS DIR  Writing for Developers     dir=writing-for-developer
CHARS DIR  Agent Browser              dir=sakaen736jih_agent-browser-...
CHARS DIR  APIExpert                  dir=api
CHARS DIR  Builder                    dir=builder-knowledgeforge-civil-eng
CHARS      public.com                 dir=(repo root)
```

Two of those — `APIExpert`, `Builder` — I had not even found, because I was reading the
eleven mismatches for whether *I* thought they looked like drift.

So "eight of eleven are not drift" was backwards: **roughly twelve of fourteen are real
violations of the published format**. The rule does travel. It is the specification's own
rule, not a heuristic of ours, and `skill/frontmatter` reporting `Bankr Dev - Portfolio`
is the check working.

The three that remain genuinely doubtful are small and have nothing to do with location:
a directory that is a generated timestamp (`graph` / `2026-08-24T09-20-09-850Z-0017`), a
template's placeholder (`skill-name` / `skill`), and `new-skill` / `skills`, which driftwatch
already declines to report.

### What the shipped tool costs its own author

`abr4xas/skills` has five skills, laid out exactly as the specification prescribes —
`answer-reviewers/SKILL.md`, `pdf-to-markdown/SKILL.md`, and so on at the repository root.
driftwatch classifies **none** of them as skills. The repo carries a `driftwatch.config.yaml`
whose comment is the bug report:

> Discovery finds SKILL.md under `.claude/skills/`, and these skills live at the repo root
> instead — so without this file driftwatch audits nothing here and reports
> `0 files · no drift`, **which is the green run this repo least wants**.

The workaround — `sources: ['**/*.md']` — buys back `path/missing`, `link/broken` and
`frontmatter/invalid`, and **cannot** buy back `skill/frontmatter`, because a `configured`
source is not classified as a skill. So the repo also carries `validate-skills.sh`, 200 lines
of bash reimplementing the check against the spec, and a CI workflow running both.

The author of the tool had to write a second validator to check his own skills. That is the
argument, and no percentage outweighs it.

### Two repositories settle it, and they are the two that matter most

**`mattpocock/skills`** — 38 `SKILL.md` files, **none** under `.claude/skills/`. The layout is
`skills/<category>/<skill>/SKILL.md`, two levels deep. By the skills.sh index it is the
largest thing in the ecosystem after Vercel's own: **54 skills, 23,346,040 installs**, and
four of the five most-installed skills in the world.

Running `skill/frontmatter` over all 38, with the real directory names preserved:

```
✓ 39 files · no drift · 180ms
```

**Zero findings.** That is the experiment the "do not widen" decision needed and never ran.
The rule does not fire on a well-kept repository merely because it sits somewhere other than
`.claude/skills/` — it compares against the *immediate* parent directory, which is what the
specification asks for and which works at any depth.

Set beside the random GitHub sample, where 12% of skills violate the format, that is the
profile a check should have: **silent where the work is good, loud where it is not**. The
current `classifySource` inverts it — silent everywhere, because it never looks.

**`abr4xas/skills`** — five skills at the repository root, the layout the specification
prescribes, audited by nothing. Covered above.

Between them: the tool cannot audit its author's skills, and it cannot audit the most
installed skills in existence. Every skill this very session used — `/implement`,
`/code-review` — is one of Matt's 38.

### Where the reasoning went wrong

Not laziness in the sense of doing too little — the measurement was real and the sample was
widened as the ticket asked. The failure was upstream of the effort: **I invented the
convention I was measuring against.** Having decided that a human-readable `name` was
legitimate, every title-cased entry became evidence for not widening, and the number came out
backwards with four decimal places of confidence.

It is the same mistake as the anchored-link hole earlier in the same directory — reasoning
from what a component *could* do instead of checking what the system *does* — made twice in
one day, in opposite directions. There it invented a defect that did not exist; here it
invented a licence for one that did.

The tell was available both times: a claim about someone else's format, asserted without
reading their format.

### What the decision should be

Not settled here — this is a correction, not a redesign — but the shape is now clear, and
the ticket's original middle option was right:

- **Classify on the file, not its path.** A `SKILL.md` whose frontmatter carries `name` and
  `description` is a skill wherever it sits. Measured at **91% of sampled `SKILL.md` files,
  and uniformly across layouts** — the gate does not care where the file is, which is exactly
  what makes it the right gate. Files like `SkillBank/ConvSkill/.../SKILL.md`, which are not
  agent skills, fail it.
- **The `name` rules travel unchanged**, because they are the specification's.
- **Only one rule needs a location-dependent answer**: a `SKILL.md` at the repository root
  has no parent directory inside the repo to match against. 22 of 125 sampled files are in
  that position. That is a real edge case and a small one.
- **Cost stands**: corpus snapshots move and every diff needs hand review. Ticket `08` priced
  that honestly and it does not change. What changed is that the benefit was mismeasured.

The open question that is genuinely open: whether `classifySource` should also carry the
character rules, or whether those belong in `skill/frontmatter` where the directory rule
already lives.

## Second correction: `.claude/skills/` was never the location either

Both the decision and its correction still assumed `.claude/skills/` was the canonical place
and everything else was an exception. That is also wrong, and the installer says so. `npx
skills add` presents:

```
── Universal (.agents/skills) ── always included ────────────
  • Amp • Cline • Codex • Cursor • Droid • Gemini CLI
  • GitHub Copilot • Kilo Code • Kimi Code CLI • OpenCode • Warp • Zed
  …and 8 more

── Additional agents ─────────────────────────────
  ○ AiderDesk (.aider-desk/skills)    ○ AstrBot (data/skills)
  ○ Autohand Code CLI (.autohand/skills)  ○ Augment (.augment/skills)
  ○ IBM Bob (.bob/skills)             ● Claude Code (.claude/skills)
  ○ OpenClaw (skills)                 ○ CodeArts Agent (.codeartsdoer/skills)
  ↓ 48 more
```

**`.agents/skills/` is the default and the universal one**; `.claude/skills/` is one entry in
a picker of fifty-six. The corpus had been saying it all along and it was read as noise:

| root | `SKILL.md` | repos |
|---|---|---|
| **`.agents/skills/`** | **83** | 9 |
| `.claude/skills/` | 32 | 8 |
| `.flue/skills/` | 11 | |
| `.codex/skills/` | 11 | |
| `.github/skills/` | 7 | |
| `.opencode/skills/` | 3 | |
| `.cursor/skills/` | 1 | 1 |

Reading our own installer as the format is the same error as inventing the `name` convention,
one level up: both times the specification of somebody else's thing was assumed rather than
looked at.

## What was built (steps 1 and 2)

`SKILL_ROOTS = ['.claude', '.agents', '.cursor']` in `discover.ts`, and `skillDirectoryOf` in
`skill-frontmatter.ts` generalised to match — it recognised the skills root by the literal
string `.claude/skills`, so a `SKILL.md` in the root of `.agents/skills/` had its name
compared against `skills` and was reported for not matching a container. Tests cover each
root, nesting below a root, the monorepo case, and the roots deliberately left out.

Three roots rather than fifty-six, and that is the point rather than a shortcut: each root
audits more files in every repository that has one, which moves snapshots and costs hand
review. They get taken one at a time with a measurement in hand.

### The corpus diff, which is step 2's whole output

| | before | after |
|---|---|---|
| sources | 236 | **320** |
| findings | 26 | **74** |
| calibration / validation | 14 / 12 | **62 / 12** |
| fixable | 1 | **3** |
| snapshots changed | — | 10 of 66 |

**Validation did not move.** All 48 new findings landed in calibration, so ADR-0006's
conditions measured over the validation group are untouched by this change. `edgecrab`, the
repo this was expected to hurt most, did not change at all: its skills are under `plugins/`,
which is not a root being read.

The new findings are **46 `path/missing` and 2 `link/broken`** — and **zero
`skill/frontmatter`**. Two things follow, and neither was predicted:

1. **Widening did not wake the check it was aimed at.** The corpus's skills are well formed,
   wherever they live. That is round eleven's finding again, now across `.agents/` too.
2. **`link/broken` produced its first findings ever.** The check has read zero since it
   landed. It reads two now.

### The class waiting in the diff

Most of the new `path/missing` in `vercel/next.js` are one shape:

```
/docs/app/glossary#static-shell   [path/missing] inline-code
/docs/app/glossary                [path/missing] link
/docs/app/                        [path/missing] inline-code
```

Absolute paths that are **URLs on a documentation site**, not files in the repo. Not a defect
of widening — a false-positive class that existed and was invisible because these files were
never read. Also visible: `emdash` carries the same skill in nine `templates/*/` copies, so
one drifted path becomes nine findings, which is the template problem the spec predicted,
arriving in the corpus.

### Why the snapshots are not committed

Regenerating them turns three bookkeeping tests red, and correctly: `CLASSIFICATION.md` cites
26 findings and 1 fixable, and those numbers are the human record. Accepting a corpus diff
means adjudicating it, which is exactly what ADR-0007 says a person does.

The diff is saved at [`skill-roots-corpus.diff`](../skill-roots-corpus.diff), 340 lines, so
the work is not lost. The code and its tests are committed; the corpus is deliberately left
showing `CHANGED`.

**Step 3 is the open work:** rule on 48 findings, close the absolute-path class if it is one,
and check the two new fixable findings against ADR-0006 condition 2, which admits no false
positive among them at any rate.
