# 05: The README a stranger reads, and `docs/guide/` for everyone else

**What to build:** a README that meets the M4 acceptance criterion, and a new `docs/guide/` holding what it stops saying.

**Blocked by:** 02, 03, 04 — the guide documents the formats, so it is written once they exist rather than twice.

**Status:** done

## The problem with the README today

It is 213 lines and fourteen sections, and it is *good*: the precision argument, the eleven false-positive classes, what a fix never does, why the aggregate ratio was withdrawn. None of that is padding, and none of it belongs in the first thing a stranger reads.

The acceptance criterion for M4 is **"someone who has never seen the project understands what it does in under 15 seconds, looking only at the README"**. Fifteen seconds is roughly the first screen. Today the first screen is the tagline, the console block and the install — which is right — and then it keeps going for another 180 lines, and the reader who wanted to know whether to try it has to decide, unaided, where to stop.

## What has to change

- [ ] **`docs/guide/`**, new, with its own `README.md` as the index:
  - `usage.md` — the CLI: flags, exit codes, config file, `--only`/`--skip`, the ignore directives, running from source.
  - `fixing.md` — `--fix`, `--dry-run`, what a fix never does, the nested-source refusal, the dirty-tree warning, idempotence.
  - `output.md` — the four formats, with the JSON contract and what CI consumes.
  - `precision.md` — the rule, what it does not report, the eleven closed classes, the corpus figures and the two bars.
- [ ] **The README keeps only:** the tagline, the console example, install, the problem, what it checks today, a three-line honest status, and a "learn more" table pointing at `docs/guide/`, `docs/spec/`, `docs/adr/` and `test/corpus/`.
- [ ] **Nothing is deleted.** Every paragraph that leaves the README lands in a guide page. The precision argument in particular is the most valuable writing in the repo and the least suited to a first screen.
- [ ] `docs/spec/`, `docs/adr/` and `docs/agents/` **do not move.** They are primary source (ADR-0001) and `AGENTS.md` orders its reader through them by path; `docs/guide/` is documentation *of* the tool, which is a different thing and a different audience.
- [ ] Fix the links. The README's relative links into `docs/` and `test/` change depth when the text moves into `docs/guide/`. Check them all mechanically; a guide full of 404s is worse than the long README.
- [ ] The status section stops saying the output is `pretty` and nothing else.

## Tests

- [ ] Whatever link check the repo can run without a network: every relative link in `README.md` and `docs/**` resolves to a file that exists. If nothing like it exists, this ticket adds the small one — it is ten lines and it is the only way the split does not rot.

## What this ticket cannot do

Certify the acceptance criterion. A reader who has spent four milestones in this repo cannot measure fifteen seconds of a stranger's attention. What it can do is make the claim falsifiable and hand it to someone who has not seen the project.

## Out of scope

- The GIF that goes above all of it. Next batch, and it will displace the console example rather than the tagline.
- Rewriting the spec documents. They are for a different reader and they are fine.

## Comments

Closed. The README went from 213 lines to 82, and nothing in it was deleted — `docs/guide/` has five documents and the precision argument survived whole.

`docs/guide/checks.md` was not in the ticket's list and had to be written anyway: `04`'s `helpUri` points at it, and a SARIF rule linking to a 404 is the exact failure this tool exists to catch.

`test/docs-links.test.ts` is the link check the ticket asked for, and writing it produced one finding immediately — two links that live **inside inline code**, in `SPEC.md` and ADR-0008, quoted as examples of the shape of a link. Both were false positives of the first draft, and the fix is the rule the extractor already applies to paths: the document is not asserting that the target exists. The test strips fences and inline spans before it looks.

Three config keys are documented as accepted-but-inert — `ignore`, `knownPaths`, `staleThreshold` — which is what the code does and what `SPEC.md` § 7 does not say.
