# 31: `external-root` scoped from the marker instead of the heading

**What to decide:** whether a section that establishes an external root should suppress the
paths written **above** the root as well as below it.

**Type:** research

**Blocked by:** nothing. Third of ticket `27`'s three experiments.

**Status: resolved 2026-09-20. No — the section stays whole.** The narrowing breaks the
construction the gate is for. See §"Answer".

## The proposal

`externalRootSections` marks a whole heading-to-heading section as external the moment it
contains a backticked `~/…/` directory, and `27` gave it 29 claims and 11 over-reaches on 73
candidates.

The narrowing looked principled rather than merely tighter: a path written *before* the `~/`
cannot be referring to a root the document has not established yet. Start the range at the
marker's offset, keep the section end.

## Answer

Built, one line. **Certification unchanged: 66 · 341 · 37, calibration 21 · validation 16.**
Discovery: **+123 findings, 0 removed, 0 fixable.**

The count is not the argument. Two things in it are.

**95 of the 123 come from one repository.** `willhama/md-file-study` holds
`corpus_full/Kilo-Org__kilocode/files/…` — a study corpus of other people's markdown — and 13
more come from `modem-dev/ossrules`, which serves third-party rule files out of
`public/files/`. 108 of 123 are two documents-about-other-projects, which is ticket `24`'s
`aboutThisRepo` class and not evidence about this gate at all. The diverse tail is 15
findings across 11 repositories.

**The tail says the premise is wrong.** The reasoning was that a path above the root cannot be
governed by it. Real documents disagree, and they disagree in a fixed shape:

```
NeelakshSaxena/Vayu  .agents/skills/command-creator/SKILL.md:10
  Slash commands are markdown files stored in `.claude/commands/` (project-level)
  or `~/.claude/commands/` (global/user-level)

Kensan196948G/Construction-Enterprise-Operating-Platform  .claude/CLAUDE.md:433
  `s` | スクリプトをコマンドとして保存（`.claude/workflows/` または `~/.claude/workflows/`）
```

**"X or `~/X`"**, and it writes the local form first every time, in two languages. The pairing
is the entire point of the sentence, and a rule anchored on the marker's position cannot see
it — it releases the left half of every one of them. That is a systematic defect in the
proposal rather than a rate.

Of the 15 in the tail, three or four are genuine over-reach and worth naming, because they are
what `27`'s row was pointing at: `caidish/KlayoutClaw` asserting
`instrmcp/config/metadata_baseline.yaml` under `## Configuration` as "single source of truth",
and two table rows in `retif/claudecode-linter` listing config files. Real claims, silenced by
a `~/` elsewhere in a long section. One more, `haacked/dotfiles` naming `scripts/foo.sh`, is a
metasyntactic false positive that a different rule should have caught.

Reverted. `src/extract/` is unchanged by this ticket.

## What it leaves

`elsewhereSections`'s stated risk — "a long section with one aside in it, and a document with
no `#` heading is one section" — is confirmed as real by the three or four genuine cases, and
this ticket rules out the cheapest fix for it. Anything that reaches them has to keep "X or
`~/X`" intact, which position alone cannot do.
