Facts about the answer sheet. No judgement on any answer.

Source of marks: `36-packet.md` § "Answer sheet". 34 lines carry a mark, line 9 is blank.
Marks present: `another-project` on 1, 2, 3; `this-repo` on 4-8 and 10-35.

All "on disk" facts below were read from `test/discovery/repos/<repo>/…`, from the
working tree or from `git show HEAD:<path>` in that clone. Several clones are partial
(promisor) and a few blobs could not be fetched offline; those cases are named where
they occur.

---

## Section A — Comparable pairs marked differently

Every pair below has one member from {1, 2, 3} because those are the only entries not
marked `this-repo`.

### A1. 3 vs 6 — a `SKILL.md` under `.agents/skills/`

| | 3 | 6 |
|---|---|---|
| repo / path | `open-software-network/os-clovy` — `.agents/skills/speckit-implement/SKILL.md` | `remix-run/react-router` — `.agents/skills/react-router/SKILL.md` |
| mark | `another-project` | `this-repo` |

Shared, from the evidence sheet: both "Sits under: `.agents/skills/`"; both open with
YAML frontmatter carrying `name:` and `description:`; for both, every reported path is
"absent everywhere".

Differing, quoted:
- 3 frontmatter: `metadata:` / `author: "github-spec-kit"` / `source: "templates/commands/implement.md"`. 6 frontmatter carries no `author` or `source`; its third key is `license: MIT` (`remix-run__react-router/.agents/skills/react-router/SKILL.md:4`).
- 3: "Same document elsewhere: found in 9 other repos". 6: "not found elsewhere".
- 3: "Provenance files nearby: repo-root `skills-lock.json`; `.specify/integrations/speckit.manifest.json`". 6: "none".
- 3's repo-root `AGENTS.md` describes the container: "`└── .agents/skills/          # vendored agent skills, symlinked into .claude/skills/`" and "Vendored agent skills live in **`.agents/skills/`** (the single source of truth)" (`open-software-network__os-clovy/AGENTS.md:91,171`). 6's repo describes it in `CLAUDE.md:15`: "If there is an [`.agents/skills`](.agents/skills) directory in the repository, symlink those skills to `.claude/skills` … we want to keep the canonical skills in `.agents/skills`."

### A2. 3 vs 25 — a `SKILL.md` under `.agents/skills/`, pinned by a lockfile, copied into many repos

| | 3 | 25 |
|---|---|---|
| repo / path | `open-software-network/os-clovy` — `.agents/skills/speckit-implement/SKILL.md` | `mateusoliveiradev1/frescari` — `.agents/skills/skill-writer/SKILL.md` |
| mark | `another-project` | `this-repo` |

Shared: container `.agents/skills/`; a skills lockfile in the repo (3: repo-root
`skills-lock.json`; 25: `.agents/.skill-lock.json`); the same document found in other
repos (3: 9 others; 25: 13 others); reported paths "absent everywhere" and, for both,
the skill directory holds only `SKILL.md`.

Differing, quoted:
- 3 frontmatter names an upstream: `author: "github-spec-kit"`, `source: "templates/commands/implement.md"`. 25 frontmatter: `risk: unknown` / `source: community`.
- 25's lock entry for this skill reads `"skill-writer": { "source": "local-workspace", "sourceType": "local", "skillPath": "skills/skill-writer/SKILL.md", … }` (`mateusoliveiradev1__frescari/.agents/.skill-lock.json:9356-9363`). 3's `skills-lock.json` has no `speckit-implement` key; its four entries are `os-accounts-integration`, `os-platform`, `os-rust-backend`, `os-rust-backend-ci`, each with `"sourceType": "git"` or `"github"` pointing at `open-software-network/…`.

### A3. 3 vs 35 — frontmatter carrying a `source:` key

| | 3 | 35 |
|---|---|---|
| repo / path | os-clovy — `.agents/skills/speckit-implement/SKILL.md` | `talosprotocol/talos-sdk-ts` — `.agents/skills/cost-optimization/SKILL.md` |
| mark | `another-project` | `this-repo` |

Shared: container `.agents/skills/`; frontmatter with a `source:` key; the document
found in many other repos (3: 9; 35: 19); reported paths absent everywhere and not
resolvable doc-relative (both skill directories hold only `SKILL.md`).

Differing, quoted:
- 3: `source: "templates/commands/implement.md"` under `metadata:`, alongside `author: "github-spec-kit"`. 35: `source: community` at top level, alongside `risk: unknown` and `date_added: "2026-02-27"`.
- 35's repo-root `AGENTS.md:14` reads "- `.agents/skills/`: repository-local Codex skills and specialist presets for Talos workflows." 3's repo-root `AGENTS.md:171` reads "Vendored agent skills live in **`.agents/skills/`**".

### A4. 3 vs 26 — frontmatter naming a third-party repo and a path inside it

| | 3 | 26 |
|---|---|---|
| repo / path | os-clovy — `.agents/skills/speckit-implement/SKILL.md` | `Unkownboy0/geetorus2.0` — `geetorus-companies/geetorus-companies/agency-agents/agents/zk-steward/AGENTS.md` |
| mark | `another-project` | `this-repo` |

Shared: the document's own frontmatter names an external project and a path inside it,
and that same path is the reported path, absent everywhere.
- 3: `source: "templates/commands/implement.md"`; reported path `templates/commands/implement.md`.
- 26: `repo: msitarzewski/agency-agents` / `path: specialized/zk-steward.md`; reported path `specialized/zk-steward.md`.

Differing, quoted:
- 26 carries, in addition, `commit: 6254154899f510eb4a4de10561fecfc1f32ff17f`, `attribution: AgentLand Contributors`, `license: MIT`, `usage: referenced`, and a body link "https://github.com/msitarzewski/agency-agents/blob/main/specialized/zk-steward.md". 3 carries neither commit, attribution nor license.
- 26 has a `LICENSE` three directories up, "MIT License / Copyright (c) 2026 Agency Agents Company Package Contributors", and a sibling `COMPANY.md` whose frontmatter repeats `metadata: sources: - kind: github-dir / repo: msitarzewski/agency-agents / path: . / commit: 6254154899f510eb4a4de10561fecfc1f32ff17f / attribution: AgentLand Contributors`.
- 3: "not found elsewhere" does not apply — 3 is "found in 9 other repos"; 26 is "not found elsewhere".

### A5. 3 vs 17 / 19 / 20 — a vendored upstream's document under a container directory, pinned by a lockfile, present in several repos

| | 3 | 17, 19, 20 |
|---|---|---|
| repo / path | os-clovy — `.agents/skills/speckit-implement/SKILL.md` | `u4mzu4/p4_camera`, `metinpy/VOJ-SEC-Anonymous-Gateway`, `Robertomirax/S3-DATALOGGER` — `managed_components/espressif__tinyusb/.claude/skills/build-doc/SKILL.md` |
| mark | `another-project` | `this-repo` (all three) |

Shared: a container directory (`.agents/skills/` vs `managed_components/`); a lockfile
in the repo pinning the vendored unit (`skills-lock.json` vs `dependencies.lock`); the
document present in several other repos (3: 9 others; 17/19/20: 4 others each); every
reported path "absent everywhere"; the document names a third-party product
("github-spec-kit" / "TinyUSB Sphinx docs").

Differing, quoted:
- Beside 17/19/20 sits `managed_components/espressif__tinyusb/LICENSE`: "The MIT License (MIT) / Copyright (c) 2012-2026, hathach (tinyusb.org)", and `managed_components/espressif__tinyusb/README.md:7`: "This repository is Espressif's maintained fork of [TinyUSB](https://github.com/hathach/tinyusb), integrated with the ESP-IDF build system." The `speckit-implement` directory in 3 contains only `SKILL.md`, with no LICENSE or README.
- `dependencies.lock` in 17 and 20 pins the component by hash: "`espressif/tinyusb: component_hash: a72b7d67472914ab76309340fd50d578b31e310963d45ad0f81144bde3314752`" with "`source: registry_url: https://components.espressif.com`". The corresponding `skills-lock.json` in 3 has no entry for this skill (see A2).

### A6. 3 vs 28 — a vendored upstream checkout carrying its own agent documents

| | 3 | 28 |
|---|---|---|
| repo / path | os-clovy — `.agents/skills/speckit-implement/SKILL.md` | `furballroller/super_cat_game` — `arduino_sketches/template+OTA/lib/FastLED-master/.claude/agents/platform-port-agent.md` |
| mark | `another-project` | `this-repo` |

Shared: the document sits inside a directory holding a third party's project, and its
text is about that third party's project ("github-spec-kit" / "You are a platform
porting specialist for FastLED"); all reported paths absent everywhere.

Differing, quoted:
- 28 has `arduino_sketches/template+OTA/lib/FastLED-master/LICENSE`: "The MIT License (MIT) / Copyright (c) 2013 FastLED", and `…/FastLED-master/README.md` at the same vendored root. 3's skill directory has neither.
- 28: "not found elsewhere". 3: "found in 9 other repos".
- 28's container directory is named `FastLED-master` and sits under `lib/`; 3's is `.agents/skills/speckit-implement/`.

### A7. 3 vs 4 — a third party's instruction file stored with a manifest recording its origin

| | 3 | 4 |
|---|---|---|
| repo / path | os-clovy — `.agents/skills/speckit-implement/SKILL.md` | `modem-dev/ossrules` — `public/files/ag-ui/sdks/dotnet/AGENTS.md` |
| mark | `another-project` | `this-repo` |

Shared: a container directory; a JSON provenance file in the repo covering the
document's tree; the document opens by naming a project that is not the repo
("github-spec-kit" / "# AG-UI .NET SDK - Coding Instructions"); all reported paths
absent everywhere.

Differing, quoted:
- 4's manifest names this exact file and its upstream commit: `public/files/ag-ui/manifest.json` reads `{ "slug": "ag-ui", "sha": "45f4fea34e9c69a3fdb5d243381c36eafeb8f6af", "license": "MIT", "licensePath": "LICENSE", "files": [ … { "path": "sdks/dotnet/AGENTS.md", "bytes": 13819, "lines": 186 } … ] }`. 3's two provenance files do not name `.agents/skills/speckit-implement/SKILL.md`.
- 4's repo-root `THIRD_PARTY.md:8-9`: "- `public/files/` contains pinned upstream instruction files and supporting documents. Project manifests record source revisions and known license details." 3's repo-root `THIRD_PARTY_NOTICES.md` names only a bundled Hermes Agent runtime.
- 4: "not found elsewhere". 3: "found in 9 other repos".

### A8. 3 vs 16 — another project's package documentation kept inside a study/corpus tree

| | 3 | 16 |
|---|---|---|
| repo / path | os-clovy — `.agents/skills/speckit-implement/SKILL.md` | `willhama/md-file-study` — `corpus_full/code-yeongyu__oh-my-openagent/files/packages/agents-md-core/AGENTS.md` |
| mark | `another-project` | `this-repo` |

Shared: the document names a package belonging to another project ("github-spec-kit" /
"Package: `@oh-my-opencode/agents-md-core`"); it sits under a container directory; all
reported paths absent everywhere.

Differing, quoted:
- 16's container path embeds the source repository's name — `corpus_full/code-yeongyu__oh-my-openagent/files/` — and the repo's `METHODOLOGY.md` describes the step that created it: "| 2 | `02_download_md.sh` | Downloads the files, one folder per repo, original repo paths preserved |". 3's container is `.agents/skills/`.
- 16: "Provenance files nearby: none in the document's directory". 3: two provenance files in the repo.

### A9. 2 vs 11 — a document in a sibling set under a `.claude/` tool directory

| | 2 | 11 |
|---|---|---|
| repo / path | `VAMFI/claude-user-memory` — `.claude/commands/context.md` | `oliver-ostojic/logbook-writer` — `.claude/agents/api-database-expert.md` |
| mark | `another-project` | `this-repo` |

Shared: sits under a `.claude/` subdirectory alongside four or more sibling documents
of the same kind (2: `context.md, implement.md, plan.md, research.md, workflow.md`;
11: `api-database-expert.md, fairness-dashboard-expert.md, solver-expert.md,
testing-expert.md`); "Same document elsewhere: not found elsewhere" for both; the
reported path is absent everywhere for both.

Differing, quoted:
- 11 has an adjacent `README.md` naming the repo: "This directory contains specialized agents tailored for the logbook-writer codebase." (`oliver-ostojic__logbook-writer/.claude/agents/README.md:3`). 2's `.claude/commands/` directory contains no README.
- 11's body names the repo's own stack: "**Entry Point**: `apps/api/src/index.ts`". 2's body names tool-generic artefacts: "CLAUDE.md (project configuration)", "knowledge-core.md (accumulated learnings)".

### A10. 2 vs 29 — a reusable workflow document under `.claude/`

| | 2 | 29 |
|---|---|---|
| repo / path | `VAMFI/claude-user-memory` — `.claude/commands/context.md` | `cbbkrd-tech/jl-finishes` — `.claude/skills/ln-001-standards-researcher/SKILL.md` |
| mark | `another-project` | `this-repo` |

Shared: under `.claude/`; the document describes a reusable procedure and names no
product belonging to the repo; reported paths absent everywhere; "not found elsewhere"
for both.

Differing, quoted:
- 29 carries an explicit statement that its paths are rooted elsewhere: "> **Paths:** File paths (`shared/`, `references/`, `../ln-*`) are relative to skills repo root. If not found at CWD, locate this SKILL.md directory and go up one level for repo root." 2 carries no such note.
- 29's `.claude/skills/` holds a large third-party-style skill set (`ab-test-setup`, `ad-creative`, `ai-seo`, `algorithmic-art`, `analytics-tracking`, `brand-guidelines`, `canvas-design`, `cold-email`, `copywriting`, `docx`, …) in a repo whose top level is a Next.js app (`next.config.ts`, `eslint.config.mjs`, `src`, `public`). 2's `.claude/commands/` holds five command files.

### A11. 1 vs 5 / 12 / 18 / 24 / 30 — a repository-level agent instruction file

| | 1 | 5, 12, 18, 24, 30 |
|---|---|---|
| repo / path | `eggjs/egg` — `.github/copilot-instructions.md` | `PyAutoLabs/PyAutoNerves` — `AGENTS.md`; `1amageek/SwiftAgent` — `AGENTS.md`; `calcom/cal.com` — `AGENTS.md`; `cloudflare/workers-sdk` — `AGENTS.md`; `CrossPaste/crosspaste-desktop` — `CLAUDE.md` |
| mark | `another-project` | `this-repo` (all five) |

Shared: an agent-instruction document that opens by naming the repository's own
product ("Eggjs is a progressive Node.js framework…", "**PyAutoNerves** (package
`autonerves`)…", "# SwiftAgent", "You are a senior Cal.diy engineer…", "This file helps
AI coding agents work effectively in the Cloudflare Workers SDK monorepo.",
"CrossPaste is a Kotlin Multiplatform application using Gradle."); "Same document
elsewhere: not found elsewhere" for 1, 5, 12, 24, 30; "Provenance files nearby: none"
for 1, 5, 12, 24, 30.

Differing, quoted:
- 1 sits in `.github/`; 5, 12, 18, 24 and 30 sit at the repository root.
- 1's repo also has a root `AGENTS.md` that states itself canonical: "This is the canonical shared instruction file for coding agents working in this repository." and "- `packages/` contains core framework packages and shared internals." (`eggjs__egg/AGENTS.md:3,11`).
- 18's document names a product string that differs from the repo name ("Cal.diy", repo `calcom/cal.com`) and is "found in 1 other repo (modem-dev__ossrules)"; 1's names "Eggjs" in repo `eggjs/egg` and is not found elsewhere.

---

## Section B — The three entries marked `another-project`

### What is present in 1, 2 and 3

**Provenance files.**
- 1 `eggjs/egg` — evidence: "Provenance files nearby: none". No lockfile or manifest covers `.github/copilot-instructions.md`.
- 2 `VAMFI/claude-user-memory` — evidence: "repo-root `manifest.json` (not adjacent to the document)". The `.claude/commands/` directory holds only the five command `.md` files.
- 3 `open-software-network/os-clovy` — evidence: "repo-root `skills-lock.json`; `.specify/integrations/speckit.manifest.json`". Read on disk: `skills-lock.json` contains four skills, none of them `speckit-implement`, each pointing at an `open-software-network/…` source; `.specify/integrations/speckit.manifest.json` reads `"integration": "speckit"`, `"version": "0.8.7"`, `"installed_at": "2026-05-19T09:36:31.055609+00:00"` and a `files` map of ten `.specify/scripts/…` and `.specify/templates/…` paths — the document's own path is not among them.

**`author:` / `source:` metadata in frontmatter.**
- 1: no frontmatter.
- 2: frontmatter is `name: context` and `description: …`. No `author`, no `source`.
- 3: `metadata:` / `author: "github-spec-kit"` and `source: "templates/commands/implement.md"`.

The same shape appears in entries marked `this-repo`:
- `source:` in frontmatter — **25** (`source: community`), **35** (`source: community`).
- `author:` in frontmatter — **8** (`metadata: author: project`), **33** (`metadata: author: dvy1987`).
- A `metadata.sources` block naming an external repo, path, commit, attribution and license — **26**.

**Whether the document appears in other repos.**
- 1: "not found elsewhere". 2: "not found elsewhere". 3: "found in 9 other repos (A7med7777__music-player-app, MattMagg__MisterSmith, TheHalfMoon__commandMed)".

Entries marked `this-repo` that also appear in other repos: **17** (4 others), **18**
(1 other), **19** (4 others), **20** (4 others), **25** (13 others), **27** (3 others),
**31** (8 others), **35** (19 others).

**The container directory.**
- 1: `.github/` (evidence records "no container directory").
- 2: `.claude/commands/`.
- 3: `.agents/skills/`. The repo's own `AGENTS.md:91` labels that directory "vendored agent skills, symlinked into .claude/skills/" and `:171` "Vendored agent skills live in **`.agents/skills/`** (the single source of truth)"; the same paragraph lists "plus the Spec Kit workflow skills (`speckit-*`)" among "Current project skills".

Entries marked `this-repo` whose document also sits under a container directory:
**4** (`public/files/`), **6** (`.agents/skills/`), **7** (`skills/faion/knowledge/dev/`),
**8** (`apps/react/next16-app/.cursor/skills/`), **10** (`agents/open-slide-studio/artifacts/`),
**16** (`corpus_full/…/files/`), **17**, **19**, **20** (`managed_components/`),
**21** (`community-templates/`), **25** (`.agents/skills/`), **27** (`.agents/skills/`),
**28** (`lib/FastLED-master/`), **31** (`.claude/worktrees/agent-a2a64cf1/.claude/agents/`),
**33** (`.agents/skills/`), **34** (`framework/mobile_development/.github/skills/`),
**35** (`.agents/skills/`).

**Whether the document names a project different from the repo it sits in.**
- 1: names "Eggjs", "a **utoo monorepo**". The repo is `eggjs/egg`.
- 2: names "Claude Code", "Anthropic's context engineering principles", "CLAUDE.md", "knowledge-core.md". It names no repository.
- 3: names "github-spec-kit" and "Requires spec-kit project structure with .specify/ directory". The repo is `open-software-network/os-clovy`, whose top level does contain `.specify`.

Entries marked `this-repo` whose document names a project other than the repo it sits in:
- **4**: "# AG-UI .NET SDK - Coding Instructions" in `modem-dev/ossrules`.
- **10**: "# open-slide — Agent Guide", "managed by `@open-slide/core`" in `SkillfulAgents/public-skillset`.
- **16**: "Package: `@oh-my-opencode/agents-md-core`" in `willhama/md-file-study`.
- **17, 19, 20**: "# Build TinyUSB Docs" in three ESP-IDF application repos.
- **18**: "Cal.diy" in `calcom/cal.com`.
- **26**: "You are the ZK Steward at Agency Agents", `repo: msitarzewski/agency-agents`, in `Unkownboy0/geetorus2.0`.
- **28**: "You are a platform porting specialist for FastLED" in `furballroller/super_cat_game`.
- **31**: "You are a GSD codebase mapper", "`/gsd:map-codebase`" in `Zalamancer/autoStudio`.
- **34**: "AC Framework CLI (`acfm`)" in `B4san/AC-framework` under `framework/mobile_development/`.

---

## Section C — Facts found on disk that are not in the evidence sheet

Entries with nothing new found are omitted.

**1. eggjs/egg**
Repo-root `AGENTS.md:3`: "This is the canonical shared instruction file for coding agents working in this repository." `:11`: "- `packages/` contains core framework packages and shared internals." (The reported path is `packages/mock/`.)

**3. open-software-network/os-clovy**
`AGENTS.md:91` (directory map): "`└── .agents/skills/          # vendored agent skills, symlinked into .claude/skills/`".
`AGENTS.md:171-182`: "Vendored agent skills live in **`.agents/skills/`** (the single source of truth) and **every skill is symlinked into `.claude/skills/`**. … Current project skills: `os-design`, `os-platform`, `os-accounts-integration`, `os-rust-backend`, `os-rust-backend-ci`, `os-task-prep`, `repo-build-pr`, `repo-review`, `repo-delegate`, `repo-orchestrate`, `repo-retrospect`, `browser-test-tauri-fe`, `agent-e2e-qa`, plus the Spec Kit workflow skills (`speckit-*`). `make skills-update` / `skills-restore` / `skills-sync` (thin wrappers over `npx skills`) refresh, restore from the lockfile, or re-link them."
`git ls-files .agents/skills` returns fourteen `speckit-*` skills: `speckit-analyze, speckit-checklist, speckit-clarify, speckit-constitution, speckit-git-commit, speckit-git-feature, speckit-git-initialize, speckit-git-remote, speckit-git-validate, speckit-implement, speckit-plan, speckit-specify, speckit-tasks, speckit-taskstoissues`.
`skills-lock.json` contains four entries and none is a `speckit-*` skill.
`.specify/integrations/speckit.manifest.json` lists ten installed files, all under `.specify/scripts/bash/` or `.specify/templates/`; `.agents/skills/speckit-implement/SKILL.md` is not among them.
`THIRD_PARTY_NOTICES.md:1-4`: "# Third-party Notices / Clovy release artifacts may bundle third-party software. Keep upstream license and notice files with redistributed source or binary builds." It names only Hermes Agent.

**4. modem-dev/ossrules**
Repo `README.md:1-3`: "# ossrules.md / Real `AGENTS.md` and `CLAUDE.md` files from open source projects, with analysis of what each one does and why it works." `:17-19`: "ossrules.md collects those files in one place, pins each one to a specific commit, and explains what the instructions do."
`THIRD_PARTY.md:1-13`: "The root [MIT License](LICENSE) covers original project code and authored documentation from Modem Labs Inc. It does not relicense material copied from other projects. … - `public/files/` contains pinned upstream instruction files and supporting documents. Project manifests record source revisions and known license details."
`public/files/ag-ui/manifest.json` (tracked; readable via `git show`): `"slug": "ag-ui"`, `"sha": "45f4fea34e9c69a3fdb5d243381c36eafeb8f6af"`, `"license": "MIT"`, `"licensePath": "LICENSE"`, and a `files` array including `{ "path": "sdks/dotnet/AGENTS.md", "bytes": 13819, "lines": 186 }`.
The repo also tracks `public/files/cal-diy/AGENTS.md` and `public/files/cal-diy/manifest.json` — this is the copy the evidence sheet records for entry 18.

**5. PyAutoLabs/PyAutoNerves**
The document is machine-maintained between markers. `AGENTS.md:13` `<!-- repos_sync:map:begin -->`, `:34` `<!-- repos_sync:map:end -->`, and inside, `:33`: "Generated from `PyAutoMind/repos.yaml` + `PyAutoBrain/ORGANISM.md`; edit there, then run `python3 PyAutoMind/scripts/repos_sync.py --write`." Two further marker pairs exist: `<!-- repos_sync:history:begin -->` / `:end` (`:115`, `:122`) and `<!-- repos_sync:deliverable:begin -->` / `:end` (`:124`, `:134`). Both reported paths (`PyAutoBrain/ORGANISM.md`, `PyAutoMind/repos.yaml`) are named inside the generated block.

**6. remix-run/react-router**
Frontmatter carries `license: MIT` (`SKILL.md:4`).
Repo-root `CLAUDE.md:15`: "If there is an [`.agents/skills`](.agents/skills) directory in the repository, symlink those skills to `.claude/skills` to make sure they are made available to Claude. Refresh you list of available skills if needed. This is a git ignored directory because we want to keep the canonical skills in `.agents/skills`."
The skill directory holds `SKILL.md` and a `references` directory.

**7. faionfaion/faion-network**
A `CLAUDE.md` sits beside the document; its entire content is the single line `@AGENTS.md`. The directory also holds a `templates` directory.

**8. qq986063761/study**
`apps/react/next16-app/README.md:1`: "This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app)." — the stock create-next-app README, unmodified at the top.
Repo-root `AGENTS.md:3`: "本文件是 `study` 仓库的统一 AI / Agent 入口。下面的路径均以仓库根目录为基准。处理 `apps/` 中的项目时，先完整读取这里引用的通用规则，再读取沿目录层级出现的项目专属 `AGENTS.md`。" ("paths below are relative to the repository root; when working on a project under `apps/`, read the shared rules first, then the project-specific `AGENTS.md` along the directory chain.")

**10. SkillfulAgents/public-skillset**
The document states its skills are externally managed: `AGENTS.md:25`: "The skills above are managed by `@open-slide/core`. Do not edit them in place. To pull the latest versions:" followed by "```\npnpm up @open-slide/core\npnpm sync:skills\n```".
The adjacent `package.json` reads `"name": "open-slide-studio"`, `"dependencies": { "@open-slide/core": "^1.17.1", … }`, `"gamut": { "upstreamPath": "mounted" }`.
`agents/open-slide-studio/README.md` frontmatter reads `developer: name: SkillfulAgents / url: https://github.com/SkillfulAgents`, and the body: "This template provides a slide-focused agent and a fully wired OpenSlide dashboard. The dashboard artifact is the OpenSlide project itself, so Gamut installs the real dependencies with Bun before starting it."

**11. oliver-ostojic/logbook-writer**
The adjacent `README.md:3` names the repo: "This directory contains specialized agents tailored for the logbook-writer codebase." It documents `api-database-expert` among four agents: "### 2. **api-database-expert** / Expert on Fastify API routes, Prisma ORM, database schema, and data relationships."

**13. docxology/docxology**
A `README.md` sits beside the document; its full text is "# ISSUE_TEMPLATE / GitHub issue templates for docxology. See `AGENTS.md` here."
One directory up, `.github/README.md:1` opens: "<!-- Generated from ../README.md by code/orchestrators/build_github_readme.py. Do not edit: edit README.md and regenerate (GENERATED.md). -->" (this applies to `.github/README.md`, not to the document under review).

**14. docxology/p3if**
A `README.md` sits beside the document and repeats its framing: "# workflows / Auto-expanded 2026-08-29 from on-disk inspection (File_Types doc-fleet pass). / Part of the local-only `projects/ongoing/` tree (never committed)."
`.github/README.md` carries the same two lines for the parent directory. Both files, and the document itself, are tracked at `HEAD` in this clone.

**15. tradecatlabs/human_infra**
Both the document and its adjacent `README.md` are generated between markers by a script tracked in the repo. `tools/update_domain_doc_contracts.py:2`: `"""Update standard README/AGENTS contracts for every formal research domain."""`; `:18-21` define `AGENTS_START = "<!-- domain-agent-contract:start -->"`, `AGENTS_END`, `AGENTS_WORKFLOW_START`, `AGENTS_WORKFLOW_END`; `:181-208` emit the contract block verbatim as it appears in the document; `:243` `path.write_text(updated, encoding="utf-8")`; `:253` `agents = domain_dir / "AGENTS.md"`.
The adjacent `README.md` opens with its own marker `<!-- domain-standard:start -->` and repeats the same `物理路径` row.

**16. willhama/md-file-study**
`METHODOLOGY.md:1-3`: "# Methodology / Everything here is reproducible from the scripts in `scripts/`. Data captured 2026-08-03 via the authenticated GitHub API (`gh`)."
`METHODOLOGY.md` pipeline table, step 2: "| 2 | `02_download_md.sh` | Downloads the files, one folder per repo, original repo paths preserved |".

**17, 19, 20. u4mzu4/p4_camera, metinpy/VOJ-SEC-Anonymous-Gateway, Robertomirax/S3-DATALOGGER**
A LICENSE naming a different owner sits three directories above the document:
`managed_components/espressif__tinyusb/LICENSE:1-3`: "The MIT License (MIT) / / Copyright (c) 2012-2026, hathach (tinyusb.org)" — present in all three repos.
`managed_components/espressif__tinyusb/README.md:7`: "This repository is Espressif's maintained fork of [TinyUSB](https://github.com/hathach/tinyusb), integrated with the ESP-IDF build system. It exists to provide ESP users with timely TinyUSB updates…" — present in all three repos.
`managed_components/espressif__tinyusb/.component_hash` is tracked in all three and contains `a72b7d67472914ab76309340fd50d578b31e310963d45ad0f81144bde3314752`.
`dependencies.lock` in 17 and 20 pins that same hash under the key `espressif/tinyusb`, with `source: registry_url: https://components.espressif.com` and `type: service`; 20's file ends `direct_dependencies: - espressif/esp_tinyusb` and `manifest_hash: b0221e12d9d9a402cb743a250cf1038d6a0e105d0f2631379ec029d1336b4810`. In 19 the `dependencies.lock` blob could not be fetched from this partial clone (`fatal: repository 'https://github.com/metinpy/VOJ-SEC-Anonymous-Gateway.git/' not found`); the file is tracked, its content was not read.

**18. calcom/cal.com**
The other copy the evidence sheet reports is at `modem-dev__ossrules/public/files/cal-diy/AGENTS.md`, alongside `public/files/cal-diy/manifest.json`, in a tree that `THIRD_PARTY.md` describes as "pinned upstream instruction files".

**21. BuilderIO/agent-native**
`community-templates/win-loss-memo/README.md:1-6` is titled for a different template: "# Chat / / The minimal agent-native starter app — a clean, ChatGPT-style shell with chat at the center, durable threads, standard app navigation, auth, live sync, and actions. Start here when you want a real browser app to build on without committing to a domain template." and "**Live app: [chat.agent-native.com](https://chat.agent-native.com)**".
Repo-root `AGENTS.md:11-15`: "`.agents/skills/` holds the deep guidance, one directory per skill, each with a `description` naming when to read it. … When a rule here names a skill, that skill is the authority; this file only states the invariant."

**22. ai-babai/bitgn-env**
A `README.md` sits one directory up, at `codex-agent-native/README.md`, and names the document's directory: "# codex-agent-native (MVP)" … "- Правила разделены: `local-rules` (наши) и `bitgn-rules` (снимок runtime)" ("the rules are split: `local-rules` (ours) and `bitgn-rules` (a snapshot of the runtime)") and "- Текущая версия с default-лимитом `156` (`LOCAL_RULES_MAX_AGENTS_LINES`) закрывает `104/104`."

**23. docxology/MetaInformAnt**
The repo has a `.gitmodules` with two entries, neither covering the document's path:
```
[submodule "projects/hymenoptera_amalgkit"]
	path = projects/hymenoptera_amalgkit
	url = https://github.com/docxology/hymenoptera_amalgkit.git
[submodule "projects/apis_gwas"]
	path = projects/apis_gwas
	url = https://github.com/docxology/apis_gwas.git
```
A `README.md` sits beside the document: "# structural_variants / tests for the structural-variants module."

**25. mateusoliveiradev1/frescari**
The lock entry for this skill records a local source: `.agents/.skill-lock.json:9356-9363`:
```
    "skill-writer": {
      "source": "local-workspace",
      "sourceType": "local",
      "skillPath": "skills/skill-writer/SKILL.md",
      "skillFolderHash": "01fd6800c92894e90190f04366af5666d433b889",
      "installedAt": "2026-03-06T18:59:54.831983Z",
      "updatedAt": "2026-03-06T18:59:54.831983Z"
    },
```
The lockfile's `version` is 3 and the same `"source": "local-workspace"` shape repeats for the other skills sampled.
`.agents/skills/README.md:3`: "**Welcome to the skills folder!** This is where all 179+ specialized AI skills live." This README is a near-identical twin of the one in entry 35's repo; they differ on exactly two lines (link targets `../docs/SKILL_ANATOMY.md` vs `../docs/contributors/skill-anatomy.md`, and `../docs/FAQ.md` vs `../docs/users/faq.md`).

**26. Unkownboy0/geetorus2.0**
A LICENSE naming a different owner sits three directories above the document:
`geetorus-companies/geetorus-companies/agency-agents/LICENSE:1-3`: "MIT License / / Copyright (c) 2026 Agency Agents Company Package Contributors".
`agency-agents/README.md:3-5`: "> A complete AI agency with 167 specialized agents across 10 divisions…" and "> An [Agent Company](https://agentcompanies.io) based on [Agency Agents](https://github.com/msitarzewski/agency-agents) — a large library of specialized agent role definitions for a multi-division AI agency", and "> This is an [Agent Company](https://agentcompanies.io) package from [Geetorus](https://geetorus.ing)".
`agency-agents/COMPANY.md` frontmatter repeats the provenance at package level: `schema: agentcompanies/v1`, `license: MIT`, `authors: - name: AgentLand Contributors`, `metadata: sources: - kind: github-dir / repo: msitarzewski/agency-agents / path: . / commit: 6254154899f510eb4a4de10561fecfc1f32ff17f / attribution: AgentLand Contributors`.
`agency-agents/.geetorus.yaml` exists, opening `schema: geetorus/v1`.

**27. NeelakshSaxena/Vayu**
The repo-root `skills-lock.json` contains ten `skillPath` entries and **no** entry for `lottie-animation` (`grep -c lottie` returns 0). The entries it does contain name third-party sources, e.g. `"companion-clis": { "source": "runpod/runpod-plugins-official", "sourceType": "github", … }` and `"migrate-radix-to-base": { "source": "shadcn/ui", "sourceType": "github", … }`.
The `README.md` the evidence sheet records as adjacent to the SKILL.md is zero bytes.

**28. furballroller/super_cat_game**
A LICENSE naming a different owner sits three directories above the document:
`arduino_sketches/template+OTA/lib/FastLED-master/LICENSE:1-3`: "The MIT License (MIT) / / Copyright (c) 2013 FastLED".
`…/FastLED-master/README.md`, `…/FastLED-master/ci/README.md`, `…/FastLED-master/.github/workflows/README.md` and `…/FastLED-master/.devcontainer/README.md` are all tracked — the vendored tree carries the upstream project's own CI and container scaffolding.
The repo has no `.gitmodules` at `HEAD` (`fatal: path '.gitmodules' does not exist in 'HEAD'`); `lib/` is the PlatformIO library directory convention.
The document's directory holds seventeen sibling agent files (`architecture-reviewer-agent.md`, `c-cpp-expert-agent.md`, `code_review_asm_xtensa-agent.md`, `expert-rmt5-agent.md`, `riscv-review-agent.md`, …).

**29. cbbkrd-tech/jl-finishes**
`.claude/skills/` holds a large set of general-purpose skills unrelated to the repo's Next.js app: `ab-test-setup, ad-creative, ai-seo, algorithmic-art, analytics-tracking, brain-os-sync, brand-guidelines, canvas-design, churn-prevention, claude-routing, cold-email, competitor-alternatives, content-strategy, copy-editing, copywriting, doc-coauthoring, docx, email-sequence, fb-finder, firecrawl, …` alongside the `ln-001-standards-researcher` skill under review.
The skill directory also holds `diagram.html` and a `references/` directory.

**31. Zalamancer/autoStudio**
The manifest beside the document covers this exact file by hash:
`AutoAnimation/.claude/worktrees/agent-a2a64cf1/.claude/gsd-file-manifest.json:148`: `"agents/gsd-codebase-mapper.md": "7283e8de1d81ba33932bd2f0d25aa479fcedad0169ac3f4dd702fd0b18459b51",`.
The same file opens `{ "version": "1.25.1", "timestamp": "2026-03-17T12:09:18.537Z", "files": { "get-shit-done/VERSION": …, "get-shit-done/bin/gsd-tools.cjs": …, … } }` — the manifest hashes an installed `get-shit-done` toolkit alongside the agent files.
`AutoAnimation/.claude/package.json` contains exactly `{"type":"commonjs"}`.
The document's directory holds sixteen sibling `gsd-*` agent files plus `devils-advocate.md`.

**32. HaoNgo232/agent-bridge-kit**
The document's last line is a generator stamp: `.cursor/rules/project-instructions.mdc:523`: `*Generated by [Agent Bridge](https://github.com/HaoNgo232/agent-bridge)*` — the same URL the body gives as "**Repository:**".
`.cursor/rules/` holds nine `.mdc` files (`behavioral-modes.mdc`, `clean-code.mdc`, `database-design.mdc`, `mobile-design.mdc`, `nextjs-react-expert.mdc`, `project-instructions.mdc`, `python-patterns.mdc`, `tailwind-patterns.mdc`, `testing-patterns.mdc`).

**33. dvy1987/agent-loom**
Frontmatter carries `license: MIT` (`SKILL.md:8`) in addition to the `metadata` block the evidence sheet records.
Repo-root `AGENTS.md:11-16`: "Skills in `.agents/skills/` are mandatory workflows, not optional reference. When a request matches a skill — by its `description` triggers, the User Entry Points table, or `.agents/ROUTING.md` — you MUST open that `SKILL.md` and follow its steps BEFORE answering or acting." `:4`: "**Skill reference:** `docs/SKILL-INDEX.md` — read before invoking any skill."
Repo `README.md:18`: "Today the library contains **123 skills** across thinking, project lifecycle, evaluation, security, memory, frontend, harness engineering, safe-change, structured planning, observability, model routing, and meta layers". `:8`: "Skills follow the [agentskills.io](https://agentskills.io/specification) open standard".
`.agents/ROUTING.md` has no line mentioning `memory-decision`.

**34. B4san/AC-framework**
The repo README identifies `framework/` as the directory of installable templates, of which `mobile_development` is one:
`README.md:87`: "Current bundled templates live under `framework/`:"; `:56`: "1. choose a template such as `new_project`, `make_your_own`, or `mobile_development`"; `:24`: "- `Template-driven installation` - `acfm init` now starts by asking which template to install, then which assistants to install from that template."; `:94`: "The selected template is saved to `.acfm-template.json` in the target project so future updates can pull from the correct template."; `:32` (Core Capabilities): "- `GitHub sync` - use `acfm init --latest` or `acfm update` to pull the latest framework content from GitHub."

**35. talosprotocol/talos-sdk-ts**
Repo-root `AGENTS.md:14`: "- `.agents/skills/`: repository-local Codex skills and specialist presets for Talos workflows."
`.agents/skills/README.md:3`: "**Welcome to the skills folder!** This is where all 179+ specialized AI skills live." — the near-identical twin of entry 25's `.agents/skills/README.md`; the two files differ on two lines only (see entry 25).

---

### Entry 9 (unmarked; included for completeness, not scored)
`ceroideas/backend_figma` — `v2/apps/web/src/visx/core/data/CLAUDE.md:63-66` contains a
machine-maintained region: `<claude-mem-context>` then "# Recent Activity" then
`<!-- This section is auto-generated by claude-mem. Edit content outside the tags. -->`,
followed by a dated activity table.

---

### What was checked

For all 35 entries: the document's own text grepped for origin wording (`vendored`,
`copied from`, `do not edit`, `generated`, `upstream`, `third-party`, `mirror`,
`provenance`, `adapted from`, `derived from`, `installed by`, `managed by`, `license`);
the document's own directory listing; the ancestor chain up to the repo root for
`LICENSE`/`LICENCE`/`NOTICE`/`COPYING`/`README.md`/`package.json`/`manifest.json`/
`plugin.json`; the repo's `.gitmodules`; and, where one exists, the repo-root
`AGENTS.md` / `CLAUDE.md` / `README.md` grepped for statements about the container
directory. Lockfiles and manifests named in the evidence sheet were opened and the
entry for the document searched for by name.

Not exhaustively checked: install scripts across all 35 repos (checked where the repo
listing showed an `install*` script or an `idf_component.yml` / lock file — entries 3,
12, 17, 19, 20, 25, 27, 31, 33, 34); and the entry-19 `dependencies.lock` blob, which
is absent from that partial clone.
