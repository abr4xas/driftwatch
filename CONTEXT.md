# driftwatch

A tool that reads the agent context files in a repository and reports the parts of them that
have stopped being true. Everything below is the language this project uses; when a word here
has a definition, code, documents and tickets use it that way and not another.

The specification in [`docs/spec/`](docs/spec/) is the source of truth for behaviour, and
[`docs/adr/`](docs/adr/) for decisions. This file is a glossary and nothing else.

## What the tool reads

**Source**:
An agent context file: a `CLAUDE.md`, an `AGENTS.md`, a `SKILL.md`, a Cursor rule. It is the
unit that gets audited.
_Avoid_: document, context file, instruction file.

**Claim**:
A fragment of a source that asserts something verifiable about the repository — that a path
exists, that a link resolves, that a script is defined.
_Avoid_: reference, mention, assertion.

**Check**:
A named test with a stable id, like `path/missing` or `link/broken`. The id is what config and
ignores address, so it does not change once shipped.
_Avoid_: rule, lint rule, validator.

**Finding**:
A claim a check reports as no longer true. The thing a user reads.
_Avoid_: error, issue, warning, violation.

**Drift**:
The condition the tool exists to find: a source says something about the repository that has
stopped being so. Not the same as a document being badly written.
_Avoid_: staleness, rot, decay.

**Suggestion**:
The replacement a finding could be rewritten to, with a confidence. A suggestion confident
enough to be applied without a person reading it is **fixable**, and `--fix` applies only
those.
_Avoid_: fix, correction, autofix (the *flag* is `fixable`; the *command* is `--fix`).

## What the tool refuses to report

**Discard**:
A candidate the extractor refused to turn into a claim, kept with the rule that refused it and
the prose that rule read. Most of a document is discards, and that is the design: one false
positive costs more than ten false negatives.
_Avoid_: rejection, filtered candidate, skipped claim.

**Cause**:
The named reason a candidate was discarded — `bare-word`, `metasyntactic`, `module-specifier`,
`not-path-shaped`. Every cause carries a comment saying which false positive it prevents.
_Avoid_: reason, discard type, rule name.

## The two corpora

They are never one thing, and the distinction is load-bearing. One certifies, the other
supplies material; held together they trade against each other, which is what
[`.scratch/corpus-adjudication-at-scale/spec.md`](.scratch/corpus-adjudication-at-scale/spec.md)
§ "Two corpora, not one" is about.

**Certification corpus**:
`test/corpus/`: public repositories pinned to a commit, with every finding ruled on by a
person. The only false-positive measurement this project has.
_Avoid_: the corpus, the test corpus, the golden corpus.

**Discovery corpus**:
`test/discovery/`: thousands of unpinned, disposable clones carrying no human rulings. It
produces material to read — kinds of finding, kinds of discard — and never a measurement.
_Avoid_: the big corpus, the wild corpus, the sample.

**Calibration** / **Validation**:
The two halves of the certification corpus. Validation is out of sample: a repository whose
findings were used to change a rule moves to calibration and another one takes its place.
_Avoid_: train and test, holdout (except as the name of the field that records it).

**Precision**:
Measured over the certification corpus and nowhere else. No number computed over the discovery
corpus is a precision, however it was arrived at.
_Avoid_: accuracy, hit rate, quality.

**Snapshot**:
The stored output for one certification repository. It does not claim to be correct; it claims
not to change without intent, which is why every change to one is read by hand.
_Avoid_: baseline, golden file, expected output.

**Round**:
One hand adjudication of the whole certification corpus, numbered and recorded in
`CLASSIFICATION.md`. Rounds are how the corpus's history is cited.
_Avoid_: pass (a pass is a different thing — see below), review, iteration.

**Ruling**:
A person's decision that a finding is a true or a false positive. It is the measurement: no
tool and no model produces one.
_Avoid_: judgement, adjudication, label.

**Class**:
The named kind a false positive belongs to — `placeholder`, `generated-bundle`,
`crate-nickname`. A class is drawn by a person, and a class with a rule shape is a candidate
for a discard rule.
_Avoid_: category, cluster, group, type.

**Verdict**:
The result of verifying one claim: `ok`, `broken`, `suspect` or `skipped`. It belongs to the
tool and appears nowhere in the corpora.
_Avoid_: using it for a person's decision about a finding — that is a **Ruling** — or for what
a pass got back from Jev — that is an **Answer**. The word used to mean all three.

## What a release promises

**Frozen surface**:
Everything `1.0.0` promises not to remove or reshape without a major version: the exit codes,
the check ids, the CLI flags, the `--json` contract, the other output formats, the config
format, the package's exported names, and the Node floor. It is generated and committed, so
that changing it is a diff somebody accepts rather than a thing somebody notices.
_Avoid_: public API, the contract, the interface.

**Tier**:
Whether a check reports an error or a warning by default. Tier 1 defaults to error and can fail
a build; tier 2 defaults to warning and cannot, unless the caller asks for it. It is a fact
about the contract, not only about the roadmap: adding a tier 2 check is a minor and adding a
tier 1 check is a major, because only one of them can turn a green run red.
_Avoid_: level, severity (a **severity** is what one finding carries; a tier is what a check
defaults to), priority.

## Asking a model

Jev is a research instrument for the corpora and never a component of the tool. Nothing under
`src/` imports any of this, and nothing that ships does either — see
[`PRODUCT.md`](PRODUCT.md).

**Jev**:
The evaluation model this project puts questions to. It answers with typed values and
probabilities rather than prose, and it never rules on anything.
_Avoid_: the model, the LLM, the classifier, the AI.

**Pass**:
One question asked of one corpus, end to end: choose what to ask about, ask it, write down
what came back, print the distribution. Named after what it asks — the families pass, the
claims pass.
_Avoid_: job, run, script, round.

**Question**:
The statement and criteria a pass puts to Jev. The wording *is* the instrument: a number is
the number that exact wording produced, so a question two passes share is one object rather
than two that match today.
_Avoid_: prompt, query.

**Answer**:
What a pass got back from Jev about one item: a probability, or a choice with its confidence.
Not a ruling — no person saw it — and nothing downstream may treat it as one.
_Avoid_: verdict, judgement, result, score.

**Family**:
A set of documents across different repositories that are one document, copied. A third of the
discovery corpus is families, so a count that treats them as separate observations is counting
one document many times.
_Avoid_: duplicate, cluster, template group.
