# 32: `skill/frontmatter`'s autofix, measured where it actually fires

**What to decide:** whether the `name` rewrite may stay `fixable`, given that it fires 670
times in 58 repositories and the certification corpus has never produced one.

**Type:** bug

**Blocked by:** nothing.

**Status: superseded 2026-09-21 by round twenty-seven.** The recommendation here was to drop
`fixable` from the `name` rewrite. Angel went further and withdrew the check: driftwatch does
not rename a skill, and `name` against a directory is format validation whose right-hand side
happens to live on disk. Nothing in this ticket is actionable any more — it is kept as the
measurement that produced the decision, and `CLASSIFICATION.md` round twenty-seven is where
the decision is recorded.

## Why nobody saw this

Round eleven of `CLASSIFICATION.md` read **30 real skills and produced 0 findings**, and the
[spec](../spec.md) concluded the check is silent because "skills people publish are well
formed". Ticket `04` was opened to find the stratum that would wake it.

The stratum was never missing. Over the discovery corpus `skill/frontmatter` produces **1884
findings in 1792 documents**, and 670 of them are the one autofix this check has:

| class | findings | repos | fixable |
|---|---|---|---|
| `---` (frontmatter absent or unparseable) | 867 | 17 | no |
| **`name` does not match its directory** | **683** | **60** | **yes** |
| no frontmatter at all, file opens on a heading | ~180 | few | no |

ADR-0006 condition 2 admits **no** false positive among the fixable at any rate. 670 of them
have never been looked at.

## Answer

### Half of it needs no model

Of the 646 rewrites under a recognised skills root, **256 (40%) sit on a `SKILL.md` nested
deeper than `<root>/skills/<name>/`.** `classifySource` takes the last path segment as the
skill's directory, and one level down that segment is a grouping rather than a name:

```
.agents/skills/meta/orchestration/spawn/SKILL.md
  name: meta-agent-spawn   ->   spawn
.agents/skills/playwright-skill/core/SKILL.md
  name: playwright-core    ->   core
.claude/skills/cfn-memory-persistence/lib/management/SKILL.md
  name: cfn-memory-management -> management
.claude/skills/posthog/error-tracking/skills/all/SKILL.md
  name: omnibus-instrument-error-tracking -> all
```

The authors are encoding the path *into* the name, which is the sensible thing to do when
skills nest. driftwatch proposes to delete the namespace and leave `spawn`, `core`, `all`.
This is arithmetic over two strings and needs nothing asked of anybody.

### The model's half, and the first question of it failed

`pnpm discovery names` asks two questions over all 670. The first one was wrong and is
recorded here rather than quietly replaced.

**`REWRITE_IS_RIGHT`** asked whether a maintainer would accept the edit. The answers came back
flat — 670 rewrites between **0.20 and 0.58**, nothing above 0.6, nothing below 0.04 — and the
control killed it: the 229 rewrites whose two strings are within two characters of each other
score a mean of **0.29**, the same as the population, and

```
0.51  'g-connect'   -> 'g-conect'      (the typo is in the directory)
0.49  'team-create' -> 'team-creator'  (the typo is in the name)
```

score the same. The question asked which of two strings is the newer one, and **nothing in the
state can answer that** — it is the one fact nobody wrote down. A flat distribution with no
mass at either end is what that looks like.

**`DIRECTORY_IS_A_NAME`** replaced it and asks something the description can settle: taken
alone, does the directory name the skill this description describes? It discriminates — mean
0.62, **151 above 0.8 and 82 below 0.2** — and its refusals are the nested cases above.

**`WHY_THEY_DIFFER`**, a Choice, worked from the start and carries most of the result:

| class | n | share |
|---|---|---|
| `human-title` — a title beside a slug | 515 | 77% |
| `directory-namespace` — the directory files it, the name is it | 123 | 18% |
| `directory-renamed` — the case the check was written for | 29 | **4%** |
| `lifecycle-marker` — `deprecated`, a date | 3 | — |

**Twenty-nine of 670.** Ninety-six per cent of what this autofix would rewrite is not the
thing it was built to fix.

`human-title` is ticket `14` with a number on it: `Memory Palace -> memory-palace`,
`Security & Threat Intelligence -> security`,
`Hook Lab — 10 scroll-stopping opening lines for any topic -> hook-lab`. Whether a skill's
`name` must be kebab-case is a **format** question, and this project checks whether a document
is *true*, not whether it is *well formed*.

### What is not claimed

No ruling. Nobody has read these 670 against their repositories, the discovery corpus carries
no verdicts, and none of these numbers is a precision or enters `CLASSIFICATION.md`. The
deterministic 40% stands without the model; the 77% is a model's grouping of a population a
person has read twelve of.

## The recommendation

1. **Drop `fixable` from the `name` finding.** Keep reporting it, keep the suggestion, stop
   offering to apply it unread. Condition 2 is about exactly this and 29 of 670 is not a rate
   that survives it.
2. **Do not treat the leaf of a nested path as the skill directory.** Either check only a
   `SKILL.md` directly under a skills root, or compare against the path from that root. 256 of
   646 findings depend on which.
3. Ticket `14` — whether format validation belongs in this check at all — now has 515
   instances behind it instead of an argument.

Both 1 and 2 change shipped behaviour and are `src/` changes with a corpus gate on either
side. The corpus will not move: 30 of 30 skills there match their directory, which is how this
went unseen.

## Note on ticket `10`

`10` asked whether this autofix is offered on a non-drift finding and resolved **no**. That was
decided against `skills-ref`, in the certification corpus, where the check never fires. It is
not contradicted on its own terms and it does not survive contact with this population; `10`
should be read as scoped to the corpus it was answered in.
