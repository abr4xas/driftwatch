# 40: The two placeholders that have a shape

**What to decide:** what rule comes out of `placeholder`, ticket `37`'s second-largest class.

**Type:** prototype

**Blocked by:** nothing.

**Status: resolved 2026-09-24.** Two rules ship at zero measured cost; a third was measured
and refused.

## The class, read

73 findings in 57 repositories, of which 60 survive the three rules shipped since. Four shapes
in them, and the interesting part is that one of the four had to be refused on evidence.

`placeholder` already has two rules — `metasyntactic` and `glob-or-placeholder` — so what
reaches a finding is what neither catches: a placeholder written without a sigil.

## The two that ship

### An interior ellipsis is an abbreviation, not a directory

`core/.../sql/parser/`, `datagsm-common/src/main/kotlin/.../domain/`,
`src/main/resources/META-INF/native-image/…/proxy-config.json`, `tests/…/sqliteStore.test.js`.
The writer is eliding the middle of a long path. Both spellings occur, the three-dot one and
U+2026.

**104 findings in 35 repositories, 88 distinct texts.**

Cost, measured twice and zero both times:

- **0** of **1 858 219** distinct path segments across the 2599 clones is `...` or contains
  `…`. Not one, at any depth.
- **1946** discarded candidates carry the shape and **0** resolve.

**It has to be the interior one**, and that is the whole care in the rule. A text *ending* in
`...` — `steps-c/...`, `.claude/skills/...`, `./tools/...` — normalises to its parent, which
usually exists, and 91 such candidates come back `exists: true`. Those are already discarded by
other rules and are not findings; a rule written on "contains an ellipsis" would look identical
on the surface and be resting on that normalisation. The one shipped asks for `...` in a
position that is not the last, or `…` anywhere.

### A SCREAMING_SNAKE directory variable is a variable

`SKILL_DIR/wiki/`, `SCRIPT_DIR/`, `EXP_ROOT/user_workload.yaml`,
`FEATURE_DIR/checklists/requirements.md`, `INTEL_DIR/decisions.md`,
`SPECIFY_FEATURE_DIRECTORY/spec.md`. It is `$SKILL_DIR` with the sigil left off, which is why
`GLOB_OR_PLACEHOLDER` does not see it.

**Narrowed on evidence, and the narrowing is the point.** The obvious rule — any
SCREAMING_SNAKE first segment — is 165 findings in 23 repositories and costs **5** real first
segments in 12 439: `FIX_BLOCCANTI`, `JSU_V2`, `README_IMAGES`, `UPSTREAM_WORKFLOWS_DISABLED`,
`ZION_OS`. One of them is live: `Yose144/Zion-v3.0.0` names `ZION_OS/dashboard/app.py` and it
resolves.

Requiring the name to *end* in `_DIR`, `_DIRECTORY`, `_ROOT`, `_PATH`, `_HOME` or `_FOLDER`
keeps **157 of the 165** findings in 21 repositories and drops the cost to **0** of 12 439, and
**0** of 50 discarded candidates resolving. What it gives up is three texts —
`FINAL_RELEASE_CHANGES/…` twice and `SHARED_FOLDER_ID/PREVIEW/`.

Eight findings for five real directories is the trade ticket `38`'s case-sensitivity made, and
it is made the same way here: the narrower rule, chosen because it was measured and not because
it felt safer.

## The one that is refused, and it is the useful entry

`NN`, `NNN`, `XX`, `XXX` as a number-or-letter placeholder: `docs/adr/NNNN-short-title.md`,
`production/sprints/sprint-NNN.md`, `paper/sections/NN_name.md`, `features/XX-nome.md`,
`gen-NNN/winner.json`. **66 findings in 21 repositories** — real mass, and the third-largest
shape in the class.

**`NN` means neural network.** Of 1 858 219 real segments, 32 carry the shape and they are not
noise: `NN_Lib_Tests`, `NN-example-cifar10`, `NN-example-gru`, `NN.BHP..SH.0237761.npz`,
`HP8XX.mod`, `institute-XX61J32RT9g.html`. A repository doing machine learning names
directories this way, and the rule would silence a whole class of real claim in exactly the
repositories least able to notice.

No narrowing was attempted. The collision is with the meaning of the letters, not with their
arrangement, so there is no arrangement that fixes it.

## The acceptance criterion, as ticket `38` fixed it

1. Every distinct text read by hand. 88 for the ellipsis, 41 for the variable.
2. Cost of the order the `@` clause accepted — three resolving in 17 607.
3. `pnpm discovery diff` adds nothing, and every removed finding is read.
4. `pnpm corpus --check` moves nothing it should not.

## Answer

Both rules ship. Both report under `metasyntactic`, beside the placeholder rules they extend.

```
discovery   32 902 -> 32 641   -261, added: none
corpus      337 findings, no snapshot moved
```

129 distinct removed texts, and **all 129 match one of the two rules** — checked
programmatically rather than by eye, because 129 is past what reading reliably catches. The
sample reads `.../service/`, `.../findings/`, `SKILL_DIR/graph/graph.json`,
`INTEL_DIR/decisions.md`.

| | ellipsis | directory variable |
|---|---|---|
| findings | 104 | 157 |
| repositories | 35 | 21 |
| real segments with the shape | **0** of 1 858 219 | **0** of 12 439 first segments |
| discarded candidates that resolve | **0** of 1946 | **0** of 50 |

**Condition 6 does not move: 81 of 96 = 84.4%.** Third rule in a row derived entirely from the
discovery corpus with the certification corpus silent on it, and condition 9 untouched.

### What this round is actually about

Two of the three shapes were narrowed or refused on measurement, and that is the whole
content:

- The ellipsis rule had to exclude the *trailing* case, which looks identical and rests on path
  normalisation resolving `steps-c/...` to `steps-c/`.
- The variable rule had to require the `_DIR`-style suffix, trading eight findings for five real
  directories, one of them live.
- The `NN`/`XX` shape was refused outright with 66 findings of real mass behind it, because
  `NN` means neural network and the rule would go wrong in exactly the repositories that could
  not notice.

Three shapes, three different answers, and none of them available from reading the class name.
