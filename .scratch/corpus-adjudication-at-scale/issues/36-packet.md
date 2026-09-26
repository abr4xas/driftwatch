# 36-packet: whose document is this?

Thirty documents, selected as ticket `36` pre-registered it, plus controls mixed in and
not marked. For each one, answer **one** question:

> Does this document instruct an agent about the repository it sits in — are the paths it
> names paths in *this* repository?

Read the documents here and answer on the sheet at the bottom of this file: write
`this-repo` or `another-project` after the `->` on each numbered line. A blank line is a
skip, and the score ignores it.

**This is not a ruling and it is not "is this finding false".** A ruling is a decision that
a *finding* is a true or a false positive; this is about the document. A document can be
about this repository and still carry a false positive, and a document about somebody
else's project can name a path that happens to exist here. The two are independent.

The excerpt below is exactly what Jev was given. The full file is on disk at the path in
the heading — open it if the excerpt does not settle it. You having more than the model is
the point: your answer is the yardstick.

---

## 1. `eggjs/egg` — `.github/copilot-instructions.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/eggjs__egg/.github/copilot-instructions.md`

Reported paths: `packages/mock/`

````markdown
# Eggjs Framework - GitHub Copilot Development Instructions

**Always reference these instructions first and fallback to search or additional context gathering only when you encounter unexpected information that does not match the information provided here.**

## Overview

Eggjs is a progressive Node.js framework for building enterprise-class server-side applications. Built on top of Koa.js, it provides a plugin system, conventions over configuration, and enterprise-grade features like clustering, logging, and security.

This is a **utoo monorepo** with multiple packages using utoo workspaces and catalog mode for centralized dependency management.

## Prerequisites and Environment Setup

- **Node.js >= 22.18.0 required** - This is a hard requirement
- Enable utoo first: `corepack enable utoo`
- **NEVER CANCEL** any build or test commands - they can take several minutes to complete

## Bootstrap and Build Process

**Run these commands after a fresh clone:**

```bash
# 1. Enable utoo (required first)
corepack enable utoo

# 2. Install all dependencies - takes ~63 seconds. NEVER CANCEL. Set timeout to 120+ seconds.
ut install --from pnpm

# 3. Run lint to check code quality across all
…
````

---

## 2. `VAMFI/claude-user-memory` — `.claude/commands/context.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/VAMFI__claude-user-memory/.claude/commands/context.md`

Reported paths: `@path/to/file.md`

````markdown
---
name: context
description: Analyze and optimize context configuration. Reviews CLAUDE.md, knowledge-core.md, and active context for optimization opportunities. Helps prevent context rot (39% improvement, 84% token reduction).
---

# /context - Context Analysis & Optimization

Analyze and optimize your Claude Code context configuration using Anthropic's context engineering principles.

## Usage

```bash
/context                # Analyze mode (default)
/context analyze        # Same as default
/context optimize       # Actively optimize context
/context reset          # Reset to templates
```

## What This Does

### Analyze Mode (Default)

When you run `/context` or `/context analyze`:

1. **Read context files**
   - CLAUDE.md (project configuration)
   - knowledge-core.md (accumulated learnings)
   - Imported files (via `@` syntax)

2. **Analyze token count and relevance**
   - Count total tokens in context
   - Identify stale/redundant information
   - Check for context rot indicators

3. **Identify optimization opportunities**
   - Sections that should be archived
   - Redundant content that can be consolidated
   - Missing imports that could improve modularity

4. **Report fi
…
````

---

## 3. `open-software-network/os-clovy` — `.agents/skills/speckit-implement/SKILL.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/open-software-network__os-clovy/.agents/skills/speckit-implement/SKILL.md`

Reported paths: `templates/commands/implement.md`

````markdown
---
name: "speckit-implement"
description: "Execute the implementation plan by processing and executing all tasks defined in tasks.md"
argument-hint: "Optional implementation guidance or task filter"
compatibility: "Requires spec-kit project structure with .specify/ directory"
metadata:
  author: "github-spec-kit"
  source: "templates/commands/implement.md"
user-invocable: true
disable-model-invocation: false
---


## User Input

```text
$ARGUMENTS
```

You **MUST** consider the user input before proceeding (if not empty).

## Pre-Execution Checks

**Check for extension hooks (before implementation)**:
- Check if `.specify/extensions.yml` exists in the project root.
- If it exists, read it and look for entries under the `hooks.before_implement` key
- If the YAML cannot be parsed or is invalid, skip hook checking silently and continue normally
- Filter out hooks where `enabled` is explicitly `false`. Treat hooks without an `enabled` field as enabled by default.
- For each remaining hook, do **not** attempt to interpret or evaluate hook `condition` expressions:
  - If the hook has no `condition` field, or it is null/empty, treat the hook as executable
  - If the hook defines a non-em
…
````

---

## 4. `modem-dev/ossrules` — `public/files/ag-ui/sdks/dotnet/AGENTS.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/modem-dev__ossrules/public/files/ag-ui/sdks/dotnet/AGENTS.md`

Reported paths: `docs/architecture.md`, `eng/install-dotnet.ps1`, `eng/install-dotnet.sh`, `tests/AGUI.Client.UnitTests/`, `tests/AGUI.Formatting.UnitTests/`, `tests/AGUI.Protobuf.UnitTests/`, `tests/AGUI.Server.UnitTests/`, `tests/AGUI.Abstractions.UnitTests/Compatibility/`, and 18 more

````markdown
# AG-UI .NET SDK - Coding Instructions

Refer to `docs/architecture.md` for the design philosophy, package structure, and how the subsystems fit together.

## Prerequisites

- .NET 10 SDK (see `global.json` for the exact version; `rollForward: minor` is configured).
- All commands below run from the `sdks/dotnet/` directory.

### Provisioning a repo-local SDK (optional, hermetic)

To build against the exact pinned SDK without touching the machine-wide install, use the
provisioning scripts. They download the SDK from `global.json` into a gitignored `.dotnet/`
folder and build/test against it only (`DOTNET_MULTILEVEL_LOOKUP=0`):

```bash
./build.cmd            # Windows: provision + build
./build.sh             # Linux/macOS: provision + build
./build.sh --test      # provision + test
```

`eng/install-dotnet.ps1` / `eng/install-dotnet.sh` perform just the provisioning step and
accept `-ExtraChannel`/`--extra-channel` (or `-ExtraVersion`/`--extra-version`) to install an
additional SDK (e.g. a .NET 11 preview) side-by-side.

## Build

```bash
dotnet build
```

The solution file is `AGUI.slnx`. `Directory.Build.props` sets `LangVersion` to `latest`, enables nullable, and treats warning
…
````

---

## 5. `PyAutoLabs/PyAutoNerves` — `AGENTS.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/PyAutoLabs__PyAutoNerves/AGENTS.md`

Reported paths: `PyAutoBrain/ORGANISM.md`, `PyAutoMind/repos.yaml`

```markdown
# PyAutoNerves — Agent Instructions

Canonical, agent-agnostic instructions for this repo. `CLAUDE.md` imports this
file; any tool that does not process `@`-imports should read this directly.

**This repo is the Nerves organ of the PyAuto organism** — the base
configuration/serialization layer (`autonerves`) that every scientific library
imports. It is a full organ (promoted to the seventh organ 2026-07); the
organism map below is generated from `PyAutoMind/repos.yaml`.

## The organism map

<!-- repos_sync:map:begin -->
**You are one organ of the PyAuto organism** — an agentic ecosystem for
human-led, natural-language software development. The organs below are
peer repositories; this repo is one of them, not a part of another.
Canonical boundaries live in `PyAutoBrain/ORGANISM.md`; the full body map
(every repo, not just organs) is `PyAutoMind/repos.yaml`.

| Organ | Repo | Role |
|-------|------|------|
| **Brain** | PyAutoBrain | Reasoning/orchestration layer; how work is decomposed and routed; the specialist agents. |
| **Mind** | PyAutoMind | Intent, goals, priorities, workflow state; every task starts as a markdown prompt here. |
| **Cortex** | PyAutoCortex | The Cortex — whe
…
```

---

## 6. `remix-run/react-router` — `.agents/skills/react-router/SKILL.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/remix-run__react-router/.agents/skills/react-router/SKILL.md`

Reported paths: `app/entry.server.tsx`

```markdown
---
name: react-router
description: Build applications with React Router in Framework, Data, Declarative, and unstable RSC modes. Use when configuring routes, route modules, loaders, actions, forms, fetchers, navigation, pending UI, SSR/SPA/pre-rendering, middleware, URL params/search params, or React Router upgrades.
license: MIT
---

# React Router

React Router is mode-specific. Before changing an app, identify the mode, load the matching reference, then read the installed docs for the installed package version.

## Identify the Mode

Do not apply Framework/Data patterns to a Declarative app unless you are intentionally migrating modes.

### Framework Mode

Use Framework Mode guidance when you see:

- `@react-router/dev` in dependencies
- `react-router.config.ts`
- `app/routes.ts`
- `app/entry.server.tsx` and/or `app/entry.client.tsx` files
- route modules under `app/routes/`
- route exports like `loader`, `action`, `clientLoader`, `clientAction`, `ErrorBoundary`, `meta`, `links`, or `headers`
- imports from `./+types/...`
- the React Router Vite plugin from `@react-router/dev/vite`

Framework examples usually use the default `app/` directory, but check `react-router.config.ts`
…
```

---

## 7. `faionfaion/faion-network` — `skills/faion/knowledge/dev/abuse-case-test-cookbook/AGENTS.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/faionfaion__faion-network/skills/faion/knowledge/dev/abuse-case-test-cookbook/AGENTS.md`

Reported paths: `pro/dev/software-developer/AGENTS.md`, `pro/dev/software-developer/AGENTS.md`, `pro/dev/software-developer/AGENTS.md`, `pro/dev/software-developer/`

```markdown
# Abuse Case Test Cookbook

## Summary

**One-sentence:** End-to-end playbook for abuse case test cookbook that walks an operator from trigger to closed outcome with named artefacts at each step.

**One-paragraph:** End-to-end playbook for abuse case test cookbook that walks an operator from trigger to closed outcome with named artefacts at each step. This methodology pins the testable rules, output contract, and procedure that turn the abstract pattern into a reviewable artefact. Apply when the preconditions hold; otherwise the decision tree routes to `skip-this-methodology`. Output is the artefact described in `content/02-output-contract.xml`, validated by the bundled script.

**Ефективно для:**

- Team that needs a reusable, reviewable take on abuse case test cookbook for production code or operations.
- Cross-team alignment on the contract this methodology produces (no hand-rolled variants).
- Onboarding new contributors to the software-developer domain via a worked example + decision tree.
- Audit: traceable rule IDs in every conclusion of the decision tree.
- Pre-flight check before scoping a larger initiative that depends on this pattern.

## Applies If (ALL must hold)

- Ta
…
```

---

## 8. `qq986063761/study` — `apps/react/next16-app/.cursor/skills/nextjs/SKILL.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/qq986063761__study/apps/react/next16-app/.cursor/skills/nextjs/SKILL.md`

Reported paths: `GET/POST/`

```markdown
---
name: nextjs
description: >-
  Next.js App Router 全栈：服务端/客户端组件、路由、Route Handlers、Server Actions、
  数据获取与缓存、metadata。在编写或重构 Next 15+ / Next 16 应用、页面、API、部署相关任务时使用。
metadata:
  author: project
  version: "2026.3"
  stack: "Next.js 16, React 19, App Router, Turbopack（默认 dev）"
---

# Next.js（App Router）技能

本仓库目标栈为 **Next.js 16 + React 19 + TypeScript**，使用 **App Router**（`app/` 目录）。与 **Vercel React 最佳实践**（`.cursor/skills/react-best-practices`）配合使用：架构与路由以本技能为准，性能与重渲染以该技能为准。

## 何时应用

- 新增/修改页面、`layout`、`loading`、`error`、`not-found`
- 实现 `app/api/**/route.ts` 或 Server Actions
- 区分 Server / Client Component、流式与 Suspense
- SEO：`metadata` / `generateMetadata`
- 与 Edge / Node runtime、`next.config` 相关的问题

## 核心速查

| 主题 | 说明 | 详见 |
|------|------|------|
| 目录与路由 | `app/`、`page.tsx`、`layout.tsx`、动态段、`route.ts` | [references/app-router.md](references/app-router.md) |
| 数据与缓存 | `fetch` 缓存、`revalidate`、`unstable_cache`、Server Component 数据流 | [references/data-and-caching.md](references/data-and-caching.md) |
| Route Handlers | `GET/POST/...`、`Request`/`Response`、表单与 JSON | [references/route-handlers-and-actions.md](references/route-handlers-and-actions.md) |

## 与本项目其它技能的关系

| 技能 | 用途 |
|------|
…
```

---

## 9. `ceroideas/backend_figma` — `v2/apps/web/src/visx/core/data/CLAUDE.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/ceroideas__backend_figma/v2/apps/web/src/visx/core/data/CLAUDE.md`

Reported paths: `src/lib/ai/tools.ts`, `src/components/chat/DataTransformPanel.tsx`

````markdown
# Core Data Module

Shared data infrastructure for parsing, profiling, inference, and transformation.

## Structure

```
src/core/data/
├── dates/          # Date parsing, patterns, granularity detection
├── inference/      # Column detection, domain computation, suggestMapping
├── profiling/      # Statistical column profiler (type, quartiles, frequency)
├── parsing/        # Schema-driven data parsing + postprocessing
├── transforms/     # Pipeline engine (see below)
├── types.ts        # All data type definitions (FieldRole, DataShapeSchema, ParseResult, etc.)
├── useChartData.ts # React hook for chart data loading
└── index.ts        # Barrel export
```

## Transform Pipeline

JSON-serializable pipeline engine. Each step is a `TransformStep` discriminated union:

| Step | Function | Purpose |
|------|----------|---------|
| `groupBy` | `groupBy(rows, spec)` | Aggregate by keys (sum, count, avg, min, max, median, first, last) |
| `pivot` | `pivot(rows, spec)` | Long → wide reshaping |
| `unpivot` | `unpivot(rows, spec)` | Wide → long reshaping |
| `sort` | `sortRows(rows, specs)` | Multi-key asc/desc sorting |
| `filter` | `filterRows(rows, specs)` | Row filtering (eq, gt, lt, c
…
````

---

## 10. `SkillfulAgents/public-skillset` — `agents/open-slide-studio/artifacts/open-slide-studio/AGENTS.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/SkillfulAgents__public-skillset/agents/open-slide-studio/artifacts/open-slide-studio/AGENTS.md`

Reported paths: `@assets/`

```markdown
# open-slide — Agent Guide

You are authoring **slides** in this repo. Every slide is arbitrary React code that you write.

## Hard rules

- Put your slide under `slides/<kebab-case-id>/`.
- The entry is `slides/<id>/index.tsx`.
- Put slide-specific images/videos/fonts under `slides/<id>/assets/`. For assets reused across decks or themes (logos, avatars), use the global `assets/` folder and import via `@assets/...`.
- Do **not** touch `package.json`, `open-slide.config.ts`, or other slides.
- Do not add dependencies. Use only `react` and standard web APIs.

## Which skill to use

- **Drafting a new deck** — use the `create-slide` skill. It walks through scoping questions, structure, and hand-off.
- **Applying inspector comments** (`@slide-comment` markers in a page) — use the `apply-comments` skill.
- **Creating or extracting a theme** — use the `create-theme` skill. Themes live as markdown under `themes/<id>.md` and are read by `create-slide` before authoring.
- **Resolving "this page" / "this element"** — when the user references the current slide or selection without naming it, consult the `current-slide` skill. It reads the dev server's `node_modules/.open-slide/current.json` t
…
```

---

## 11. `oliver-ostojic/logbook-writer` — `.claude/agents/api-database-expert.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/oliver-ostojic__logbook-writer/.claude/agents/api-database-expert.md`

Reported paths: `routes/wizard.ts`, `routes/wizard.ts`, `routes/wizard.ts`, `routes/solver.ts`

```markdown
# API & Database Expert Agent

Expert on Fastify API routes, Prisma ORM, database schema, and data relationships.

## When to Use This Agent

Use this agent when you need to:
- Understand API endpoint logic and request/response flows
- Work with the database schema or modify models
- Add new routes or endpoints
- Debug data persistence issues
- Understand table relationships and foreign keys
- Work with Prisma queries or migrations
- Implement new CRUD operations

## Expertise

### API Architecture

**Entry Point**: `apps/api/src/index.ts` - Route registration and server setup

**Route Modules**:
- `/health` - Health checks (`routes/health.ts`)
- `/crew` - Crew CRUD operations (`routes/crew.ts`)
- `/roles` - Role definitions and management (`routes/roles.ts`)
- `/role-rules` - Role constraints (min/max consecutive, precedence, etc.) (`routes/role-rules.ts`)
- `/shifts` - Crew shift data (`routes/shifts.ts`)
- `/wizard/coverage` - Role coverage windows (`routes/wizard.ts`)
- `/wizard/requirements` - Daily role hour requirements (`routes/wizard.ts`)
- `/wizard/segments` - Shift segmentation preview (`routes/wizard.ts`)
- `/schedule/run` - Build engine input (`routes/schedule.ts`)
- `
…
```

---

## 12. `1amageek/SwiftAgent` — `AGENTS.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/1amageek__SwiftAgent/AGENTS.md`

Reported paths: `docs/SECURITY.md`

````markdown
# SwiftAgent

Apple FoundationModelsを基盤とした型安全で宣言的なAIエージェントフレームワーク。

> **Note**: デフォルトはApple FoundationModelsを使用。`--traits OpenFoundationModels` で OpenFoundationModels に切り替え可能。

## コア概念

| 概念 | 説明 |
|------|------|
| **Step** | `Input -> Output` の非同期変換単位。`run(_:)` を直接実装するか、`body` を定義して宣言的に合成 |
| **Session** | TaskLocalベースのセッション伝播（`@Session`, `.session()`） |
| **Memory/Relay** | Step間の状態共有（`@Memory` で保持、`$` で `Relay` を取得） |
| **Context** | 汎用TaskLocal伝播（`@Contextable`, `@Context`, `.context()`） |
| **Generate** | LLMによる構造化出力生成 |

## Step 一覧

| 種別 | Steps |
|------|-------|
| プリミティブ | `Transform`, `Generate`, `GenerateText`, `EmptyStep`, `Join`, `Gate` |
| 合成 | `Chain2-8`, `Pipeline`, `Parallel`, `Race`, `Loop`, `Map`, `Reduce` |
| 修飾 | `Monitor`, `TracingStep`, `AnyStep` |

## 基本パターン

```swift
// Session伝播（TaskLocal経由で自動伝播）
struct MyStep: Step {
    @Session var session: LanguageModelSession
    func run(_ input: String) async throws -> String {
        try await session.respond { Prompt(input) }.content
    }
}
try await MyStep().session(session).run("Hello")

// Memory/Relay による状態共有
struct OrchestratorStep: Step {
    @Memory var visitedURLs: Set<URL> = []  // 状態を保持

    func run(_
…
````

---

## 13. `docxology/docxology` — `.github/ISSUE_TEMPLATE/AGENTS.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/docxology__docxology/.github/ISSUE_TEMPLATE/AGENTS.md`

Reported paths: `projects/ongoing/`, `docxology/AGENTS.md`

```markdown
# AGENTS.md — `docxology/.github/ISSUE_TEMPLATE`

Added by the 2026-08-29 ongoing-docs fleet pass.

## What this is

GitHub issue templates for docxology.

## Layout

- issue template files.

## Invariants & gotchas

- Local-only under `projects/ongoing/` — never commit.
- `docxology` is a live work tree with THREE git remotes (`origin`/`public` = the
  public mirror, `docxology-private` upstream; local main ahead 114): read, don't
  write, never run git operations here.
- Generated subfolders (`output/`, `.netlify/`) — regenerate, don't hand-edit.

## Verify

- `ls docxology/.github/ISSUE_TEMPLATE`
- Parent: `docxology/AGENTS.md`; lane policy: `../../AGENTS.md` (ongoing root).

```

---

## 14. `docxology/p3if` — `.github/workflows/AGENTS.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/docxology__p3if/.github/workflows/AGENTS.md`

Reported paths: `projects/ongoing/`

```markdown
# AGENTS.md — `p3if/.github/workflows`

Auto-expanded 2026-08-29 from on-disk inspection (File_Types doc-fleet pass).
Facts below are verified listings, not behavioral claims.

- Local-only path under the `projects/ongoing/` tree — never commit.
- Parent standard: [`../../../../AGENTS.md`](../../../../AGENTS.md).
## Files

1 YAML.

## Gotchas

- Content-only edits: no renames, moves, or deletions of non-doc files.

```

---

## 15. `tradecatlabs/human_infra` — `domains/c5-ecological-substrate/shellfish-biotoxin-harmful-algal-bloom-food-continuity/AGENTS.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/tradecatlabs__human_infra/domains/c5-ecological-substrate/shellfish-biotoxin-harmful-algal-bloom-food-continuity/AGENTS.md`

Reported paths: `../toxic-mushroom-foraging-poisoning-continuity/`, `../travel-health-preparedness-continuity/`

```markdown
# Shellfish Biotoxin Harmful Algal Bloom Food Continuity 目录说明

<!-- domain-agent-contract:start -->
## 标准维护契约

| 字段 | 内容 |
| --- | --- |
| 物理路径 | `domains/c5-ecological-substrate/shellfish-biotoxin-harmful-algal-bloom-food-continuity` |
| 所属层级 | `C5` - 可能性生态承载层 |
| 父级容器 | `domains/c5-ecological-substrate` |
| 路径真相源 | `domains/_possibility-space-control/classification.tsv` |
| 复核状态 | `heuristic-v0.1` |

### 文件职责

- `README.md` 面向读者，说明研究对象、Human Infra 价值链路、证据边界、非目标和下一步资料入口。
- `AGENTS.md` 面向维护者和代理，说明目录结构、上下游依赖、禁止事项、更新规则和验证要求。

### 更新规则

- 修改本域对象、边界或上下游关系时，必须同步检查 README、AGENTS 和分类表中的 `physical_path`。
- 新增资料优先沉淀为 Source Signals、Source Cards、Claim-Evidence Matrix 或明确的证据段落，不把未经核验的摘要写成稳定结论。
- 若发现当前层级不符合“可能性空间控制力”标尺，先修改 `_possibility-space-control/rubric.md` 或 `classification.tsv`，再移动目录。

### 禁止事项

- 不把研究域写成个体行动处方、临床建议、法律建议、投资建议、工程操作手册或规避规则指南。
- 不在本目录保存无来源、无边界、无证据等级的断言。
- 不绕过父级 C1-C6 物理目录直接在 `domains/` 根目录新增正式研究域。
<!-- domain-agent-contract:end -->

<!-- domain-agent-workflow:start -->
## 代理执行流程

1. 先读本目录 `README.md`，确认研究对象、分级理由、Human Infra 追问和使用边界。
2. 再读父级层目录的 `README.md` 与 `AGENTS.md`，确认 `C5` 层的根本性标尺和同层相邻域。
3. 需要移动、拆分、合并或重命名本域时，先更新 `domains/_possibility-space-control/classification.tsv`，再
…
```

---

## 16. `willhama/md-file-study` — `corpus_full/code-yeongyu__oh-my-openagent/files/packages/agents-md-core/AGENTS.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/willhama__md-file-study/corpus_full/code-yeongyu__oh-my-openagent/files/packages/agents-md-core/AGENTS.md`

Reported paths: `../rules-engine/AGENTS.md`, `src/index.ts`, `hooks/hephaestus-agents-md-injector/hook.ts`

```markdown
# agents-md-core — AGENTS.md Discovery + Injection (Core)

**Generated:** 2026-06-17

## OVERVIEW

Harness-neutral logic for walking a file path UP its directory tree, discovering nearby `AGENTS.md` files, truncating their content, and formatting them as a `[Directory Context: ...]` block for injection into the session. Discovery itself is delegated to [`rules-engine`](../rules-engine/AGENTS.md) (`findAgentsMdUp`, `AgentsMdCache`); this package owns path resolution, formatting, and the per-session injected-paths cache. Package: `@oh-my-opencode/agents-md-core`.

## PUBLIC API (`src/index.ts`)

| Export | Source | Role |
|--------|--------|------|
| `AGENTS_FILENAME` | `constants.ts` | re-exported from `rules-engine` (value `"AGENTS.md"`) |
| `resolveFilePath(rootDir, path)` | `finder.ts` | resolve + `realpathSync` validate path is inside `rootDir`; `null` if escapes |
| `formatAgentsMdContextBlock({agentsPath, content, truncated})` | `formatter.ts` | wrap content in directory-context block + optional truncation notice |
| `getSessionCache({sessionCaches, sessionID, storage})` | `injection-cache.ts` | per-session `Set<string>` of already-injected dirs, backed by storage |
| `process
…
```

---

## 17. `u4mzu4/p4_camera` — `managed_components/espressif__tinyusb/.claude/skills/build-doc/SKILL.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/u4mzu4__p4_camera/managed_components/espressif__tinyusb/.claude/skills/build-doc/SKILL.md`

Reported paths: `tools/build_doc.py`, `docs/examples/`, `hw/bsp/FAMILY/boards/`, `tools/get_deps.py`, `docs/reference/boards.rst`

````markdown
---
name: build-doc
description: Use when building, previewing, or testing the TinyUSB Sphinx docs locally (docs/ → HTML), chasing Sphinx warnings, understanding how example READMEs get into the docs, or regenerating the auto-generated reference files after adding a board or dependency (boards.rst, dependencies.rst, BoardPresets.json, CMakePresets.json).
---

# Build TinyUSB Docs

## Build & preview

```bash
pip install -r docs/requirements.txt    # one-time
python3 tools/build_doc.py -o            # build docs/_build/ and open it
```

`tools/build_doc.py` wraps `sphinx-build`: `-c` clean, `-W` fail on warnings, `-o` open. Raw form: `sphinx-build -b html docs docs/_build`.

- Pages can be `.rst` or `.md` (MyST). Example `README.md`s under `examples/{device,host,dual}/*/` are **auto-collected** at build time into `docs/examples/` (per-group `index` pages, git-ignored) — add/rename an example and just rebuild; edit the source README, never the generated copies.
- Watch the output for `WARNING:` (broken refs, missing toctree entries).

## Regenerate after adding a board or dependency

Run from the repo root; `docs/reference/*.rst` and the preset JSONs are **generated** — don't hand-ed
…
````

---

## 18. `calcom/cal.com` — `AGENTS.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/calcom__cal.com/AGENTS.md`

Reported paths: `packages/features/ee/workflows/lib/constants.ts`

```markdown
# Cal.diy Development Guide for AI Agents

You are a senior Cal.diy engineer working in a Yarn/Turbo monorepo. You prioritize type safety, security, and small, reviewable diffs.

## Do

- Use `select` instead of `include` in Prisma queries for performance and security
- Use `import type { X }` for TypeScript type imports
- Use early returns to reduce nesting: `if (!booking) return null;`
- Use `ErrorWithCode` for errors in non-tRPC files (services, repositories, utilities); use `TRPCError` only in tRPC routers
- Use conventional commits: `feat:`, `fix:`, `refactor:`
- Create PRs in draft mode by default
- Run `yarn type-check:ci --force` before concluding CI failures are unrelated to your changes
- Import directly from source files, not barrel files (e.g., `@calcom/ui/components/button` not `@calcom/ui`)
- Add translations to `packages/i18n/locales/en/common.json` for all UI strings
- Use `date-fns` or native `Date` instead of Day.js when timezone awareness isn't needed
- Put permission checks in `page.tsx`, never in `layout.tsx`
- Use `ast-grep` for searching if available; otherwise use `rg` (ripgrep), then fall back to `grep`
- Use Biome for formatting and linting
- Only add code
…
```

---

## 19. `metinpy/VOJ-SEC-Anonymous-Gateway` — `managed_components/espressif__tinyusb/.claude/skills/build-doc/SKILL.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/metinpy__VOJ-SEC-Anonymous-Gateway/managed_components/espressif__tinyusb/.claude/skills/build-doc/SKILL.md`

Reported paths: `tools/build_doc.py`, `docs/examples/`, `hw/bsp/FAMILY/boards/`, `tools/get_deps.py`, `docs/reference/boards.rst`

````markdown
---
name: build-doc
description: Use when building, previewing, or testing the TinyUSB Sphinx docs locally (docs/ → HTML), chasing Sphinx warnings, understanding how example READMEs get into the docs, or regenerating the auto-generated reference files after adding a board or dependency (boards.rst, dependencies.rst, BoardPresets.json, CMakePresets.json).
---

# Build TinyUSB Docs

## Build & preview

```bash
pip install -r docs/requirements.txt    # one-time
python3 tools/build_doc.py -o            # build docs/_build/ and open it
```

`tools/build_doc.py` wraps `sphinx-build`: `-c` clean, `-W` fail on warnings, `-o` open. Raw form: `sphinx-build -b html docs docs/_build`.

- Pages can be `.rst` or `.md` (MyST). Example `README.md`s under `examples/{device,host,dual}/*/` are **auto-collected** at build time into `docs/examples/` (per-group `index` pages, git-ignored) — add/rename an example and just rebuild; edit the source README, never the generated copies.
- Watch the output for `WARNING:` (broken refs, missing toctree entries).

## Regenerate after adding a board or dependency

Run from the repo root; `docs/reference/*.rst` and the preset JSONs are **generated** — don't hand-ed
…
````

---

## 20. `Robertomirax/S3-DATALOGGER` — `managed_components/espressif__tinyusb/.claude/skills/build-doc/SKILL.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/Robertomirax__S3-DATALOGGER/managed_components/espressif__tinyusb/.claude/skills/build-doc/SKILL.md`

Reported paths: `tools/build_doc.py`, `docs/examples/`, `hw/bsp/FAMILY/boards/`, `tools/get_deps.py`, `docs/reference/boards.rst`

````markdown
---
name: build-doc
description: Use when building, previewing, or testing the TinyUSB Sphinx docs locally (docs/ → HTML), chasing Sphinx warnings, understanding how example READMEs get into the docs, or regenerating the auto-generated reference files after adding a board or dependency (boards.rst, dependencies.rst, BoardPresets.json, CMakePresets.json).
---

# Build TinyUSB Docs

## Build & preview

```bash
pip install -r docs/requirements.txt    # one-time
python3 tools/build_doc.py -o            # build docs/_build/ and open it
```

`tools/build_doc.py` wraps `sphinx-build`: `-c` clean, `-W` fail on warnings, `-o` open. Raw form: `sphinx-build -b html docs docs/_build`.

- Pages can be `.rst` or `.md` (MyST). Example `README.md`s under `examples/{device,host,dual}/*/` are **auto-collected** at build time into `docs/examples/` (per-group `index` pages, git-ignored) — add/rename an example and just rebuild; edit the source README, never the generated copies.
- Watch the output for `WARNING:` (broken refs, missing toctree entries).

## Regenerate after adding a board or dependency

Run from the repo root; `docs/reference/*.rst` and the preset JSONs are **generated** — don't hand-ed
…
````

---

## 21. `BuilderIO/agent-native` — `community-templates/win-loss-memo/.agents/skills/external-agents/SKILL.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/BuilderIO__agent-native/community-templates/win-loss-memo/.agents/skills/external-agents/SKILL.md`

Reported paths: `.vscode/mcp.json`

```markdown
---
name: external-agents
description: >-
  Connect external agents and MCP hosts (Claude, Claude Desktop, Claude Code,
  ChatGPT custom MCP apps, Codex, Cursor, Claude Cowork, VS Code GitHub
  Copilot, Goose, Postman, MCPJam) to an agent-native app over MCP, and
  round-trip artifacts back into the UI with MCP Apps and deep links. Use when
  adding an action's `link` builder or `mcpApp`, wiring the
  `/_agent-native/open` route, exposing an "ingest" action to MCP/A2A, or
  scaffolding apps from an external agent.
scope: dev
metadata:
  internal: true
---

# External Agents (MCP bridge + deep links)

## Rule

- **The connected model is the author.** Write content yourself with create/update tools; never delegate via `ask_app` or wait on an unreachable in-app form — see `DEFAULT_AGENT_NATIVE_MCP_INSTRUCTIONS`.
- **Result shape and key tools are in `actions`** (Return Values, Key Actions).
- **Artifacts fit in one call.** Up to 500,000 characters; return a `storing-data` handle.
- **One tab, one id.** WebMCP sends `X-Agent-Native-Browser-Tab`; state resolves to the driving tab (`context-awareness`).

An agent-native app is reachable by any MCP-compatible host. Keep
setup simple: for
…
```

---

## 22. `ai-babai/bitgn-env` — `codex-agent-native/local-rules/AGENTS.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/ai-babai__bitgn-env/codex-agent-native/local-rules/AGENTS.md`

Reported paths: `outbox/seq.json`, `outbox/seq.json`, `outbox/seq.json`, `outbox/seq.json`, `outbox/seq.json`

```markdown
# local-rules AGENTS
Purpose:
- `local-rules/` is the default local policy for Codex sessions.
- These rules are NOT written into BitGN runtime; they are injected via system context.
- Working order:
- First apply `local-rules/AGENTS.md` as default policy.
- Then read runtime-root `AGENTS.MD` and process/docs.
- Before changes, inspect structure (`tree`/`list`) and target paths; before `write` into new/custom folders, verify neighboring dirs and use canonical bucket names.
- If a near-match folder name exists, do not create a similar path; use only exact canonical names.
- Make minimal, precise edits that match task text.
- Before first `write`, read target fragment, preserve formatting, avoid rewrite loops, and perform content mutations via direct `write` payloads (no shell/command-assembled file edits).
- Per target file, do at most one `write`; in inbox/OCR/frontmatter/NORA tasks second-write repair is forbidden (never rewrite the same target path in one task).
- For `*.json`, do preflight before first `write`: final raw content (not JSON string), plain `"`, no `\"`; validate syntax/escapes; for outbox, write email file first, then `outbox/seq.json`.
- Do not do downstream write
…
```

---

## 23. `docxology/MetaInformAnt` — `tests/structural_variants/AGENTS.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/docxology__MetaInformAnt/tests/structural_variants/AGENTS.md`

Reported paths: `MetaInformAnt/tests/structural_variants/`

```markdown
# AGENTS.md — `MetaInformAnt/tests/structural_variants/`

tests for the structural-variants module.
Files (verified 2026-09-05): __init__.py, test_structural_variants.py, test_structural_variants_detection_advanced.py, test_structural_variants_population.py, test_quality_filter_depth.py, test_functional_impact_depth.py, test_merge_depth.py, test_detection_depth.py.


## Conventions
- Real implementations with small deterministic data; the lexical no-mocks gate
  applies (no `MagicMock`/`unittest.mock`).
- Run: `env -u VIRTUAL_ENV .venv/bin/python -m pytest -q tests/structural_variants -p no:cacheprovider` (verified 2026-09-05: 226 passed).
Repo-wide policy: see the repository-root `AGENTS.md`.
```

---

## 24. `cloudflare/workers-sdk` — `AGENTS.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/cloudflare__workers-sdk/AGENTS.md`

Reported paths: `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
# AGENTS.md

This file helps AI coding agents work effectively in the Cloudflare Workers SDK
monorepo. Prefer authoritative configuration and documentation over copying
details into this file: copied versions, rule lists, and counts become stale.

## Start Here

- Use `pnpm`, not npm or yarn.
- Use the Node.js and pnpm versions declared in `package.json`.
- Install dependencies with `pnpm install`.
- Run commands from the workspace root unless package documentation says
  otherwise.
- Before changing a package, read its `AGENTS.md` if it has one.
- Do not edit generated files directly. Change their source or generator and
  regenerate them.

## Common Commands

The root `package.json` is authoritative for available scripts.

- `pnpm build` — build the workspace with Turbo.
- `pnpm test:ci` — run tests in CI mode.
- `pnpm test:e2e` — run end-to-end tests; many require Cloudflare credentials.
- `pnpm check` — run the repository's validation, lint, type, and format checks.
- `pnpm fix` — apply supported lint and formatting fixes.
- `pnpm prettify` — format files with oxfmt.
- `pnpm run <script> --filter <package>` — run a Turbo task for one package.
- `pnpm -w test:ci -F <package> --
…
```

---

## 25. `mateusoliveiradev1/frescari` — `.agents/skills/skill-writer/SKILL.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/mateusoliveiradev1__frescari/.agents/skills/skill-writer/SKILL.md`

Reported paths: `references/mode-selection.md`, `references/design-principles.md`, `references/skill-patterns.md`, `references/workflow-patterns.md`, `references/mode-selection.md`, `references/synthesis-path.md`, `references/authoring-path.md`, `references/description-optimization.md`, and 12 more

```markdown
---
name: skill-writer
description: Create and improve agent skills following the Agent Skills specification. Use when asked to create, write, or update skills.
risk: unknown
source: community
---

# Skill Writer

Use this as the single canonical workflow for skill creation and improvement.
Primary success condition: maximize high-value input coverage before authoring so the resulting skill has minimal blind spots.

Load only the path(s) required for the task:

| Task | Read |
|------|------|
| Set skill class and required dimensions | `references/mode-selection.md` |
| Apply writing constraints for depth vs concision | `references/design-principles.md` |
| Select structure pattern for this skill | `references/skill-patterns.md` |
| Select workflow orchestration pattern for process-heavy skills | `references/workflow-patterns.md` |
| Select output format pattern for deterministic quality | `references/output-patterns.md` |
| Choose workflow path and required outputs | `references/mode-selection.md` |
| Load representative synthesis examples by skill type | `references/examples/*.md` |
| Synthesize external/local sources with depth gates | `references/synthesis-path.md` |
| Author o
…
```

---

## 26. `Unkownboy0/geetorus2.0` — `geetorus-companies/geetorus-companies/agency-agents/agents/zk-steward/AGENTS.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/Unkownboy0__geetorus2.0/geetorus-companies/geetorus-companies/agency-agents/agents/zk-steward/AGENTS.md`

Reported paths: `specialized/zk-steward.md`

```markdown
---
name: "ZK Steward"
title: "ZK Steward"
slug: zk-steward
reportsTo: chief-of-staff
metadata:
  sources:
    - kind: github-file
      repo: msitarzewski/agency-agents
      path: specialized/zk-steward.md
      commit: 6254154899f510eb4a4de10561fecfc1f32ff17f
      attribution: AgentLand Contributors
      license: MIT
      usage: referenced
---

You are the ZK Steward at Agency Agents, part of the Specialized Operations division reporting to the Chief of Staff.

Your complete role definition — including personality, mission, workflows, processes, and deliverables — is documented in your [referenced source](https://github.com/msitarzewski/agency-agents/blob/main/specialized/zk-steward.md). Follow those instructions as your primary operating guide within Agency Agents's organizational structure.

```

---

## 27. `NeelakshSaxena/Vayu` — `.agents/skills/lottie-animation/SKILL.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/NeelakshSaxena__Vayu/.agents/skills/lottie-animation/SKILL.md`

Reported paths: `scripts/README.md`

```markdown
---
name: lottie-animation
description: This skill should be used when the user asks to "add a Lottie animation", "play a .lottie or .json animation", "integrate a Bodymovin/After Effects animation on web or mobile", "control Lottie playback / segments", "make a scroll-driven Lottie", "recolor a Lottie at runtime", or "export an AE animation to Lottie". Covers dotLottie/lottie-web integration, playback control, interactivity, theming, and the AE export checklist.
version: 0.1.0
---

# Lottie Animation

The bridge from After Effects to product: vector animation shipped as JSON (or zipped `.lottie`), tiny and resolution-independent, played by a runtime on web, iOS, Android, and React Native. This skill covers integrating, controlling, and exporting Lottie.

## When to use

- Ship a designer's AE animation to web/iOS/Android/React Native
- Looping illustrations, onboarding, empty states, animated icons
- Scroll-driven or interaction-driven vector playback (hover, click, cursor)
- Runtime theming/recoloring instead of re-exporting per brand

## Formats: .json vs .lottie

- `.json` — the raw Bodymovin output. Human-readable, larger.
- `.lottie` — a zipped container (often 60–80% smaller
…
```

---

## 28. `furballroller/super_cat_game` — `arduino_sketches/template+OTA/lib/FastLED-master/.claude/agents/platform-port-agent.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/furballroller__super_cat_game/arduino_sketches/template+OTA/lib/FastLED-master/.claude/agents/platform-port-agent.md`

Reported paths: `hardware/structs/sio.h`, `fl/stdint.h`

```markdown
---
name: platform-port-agent
description: Guides porting FastLED to new MCU platforms with platform detection, int types, drivers, and build integration. BEFORE writing any peripheral driver code, verifies the peripheral EXISTS on the target silicon against the vendor CMSIS PAL header AND the chip datasheet — see agents/docs/peripheral-existence.md for the halt-on-phantom rule.
tools: Read, Edit, Grep, Glob, Bash, TodoWrite, WebFetch, WebSearch
model: opus
---

You are a platform porting specialist for FastLED, guiding developers through adding support for new microcontroller families.

## Your Mission

Provide step-by-step guidance and implementation assistance for porting FastLED to a new MCU platform, covering all layers from platform detection to LED output drivers.

## Your Process

### 1. Research the Target Platform

Use WebSearch and WebFetch to gather:
- CPU architecture (ARM Cortex-M, RISC-V, Xtensa, etc.)
- Word size (8-bit, 32-bit, 64-bit)
- Available peripherals (SPI, I2S, DMA, timers)
- GPIO register access speed and method
- Clock speeds and timer resolution
- RAM/Flash sizes
- Existing Arduino/PlatformIO support

### 2. Create Porting Checklist

Use TodoWrite to tr
…
```

---

## 29. `cbbkrd-tech/jl-finishes` — `.claude/skills/ln-001-standards-researcher/SKILL.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/cbbkrd-tech__jl-finishes/.claude/skills/ln-001-standards-researcher/SKILL.md`

Reported paths: `docs/research/`, `docs/research/README.md`, `docs/guides/`

```markdown
---
name: ln-001-standards-researcher
description: Research standards/patterns via MCP Ref. Generates Standards Research for Story Technical Notes subsection. Reusable worker.
---

> **Paths:** File paths (`shared/`, `references/`, `../ln-*`) are relative to skills repo root. If not found at CWD, locate this SKILL.md directory and go up one level for repo root.

# Standards Researcher (Worker)

This skill researches industry standards and architectural patterns using MCP Ref to generate Standards Research for Story Technical Notes.

## Purpose

Research industry standards, RFCs, and architectural patterns for a given Epic/Story domain. Produce a Standards Research section (tables + links, no code) for insertion into Story Technical Notes.

## When to Use This Skill

This skill should be used when:
- Need to research standards and patterns BEFORE Story generation (ensures tasks follow industry best practices)
- Epic Technical Notes mention specific standards requiring documentation (OAuth, OpenAPI, WebSocket)
- Prevent situations where tasks use outdated patterns or violate RFC compliance
- Reusable for ANY skill requiring standards research (ln-220-story-coordinator, ln-300-task-co
…
```

---

## 30. `CrossPaste/crosspaste-desktop` — `CLAUDE.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/CrossPaste__crosspaste-desktop/CLAUDE.md`

Reported paths: `app/src/commonMain/sqldelight/`

```markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Interaction Language

Default to communicating with developers in Chinese (中文), unless explicitly asked to use another language. Note that this applies only to conversational interaction; code, commit messages, and GitHub issue/PR content still follow their respective conventions documented below (which require English).

## Build Commands

CrossPaste is a Kotlin Multiplatform application using Gradle. Key commands:

- **Run the application**: `./gradlew app:run`
- **Build**: `./gradlew build`
- **Run tests (fast tier)**: `./gradlew app:desktopTest` — the default; suites annotated `@IntegrationTest` (real processes, full pairing handshakes, wall-clock timing) are excluded
- **Run all tests including integration tier**: `./gradlew app:desktopTest -PintegrationTests` — release/beta CI builds run this; PR CI runs only the fast tier
- **Code formatting**: `./gradlew ktlintFormat`
- **Code style check**: `./gradlew ktlintCheck`
- **Run single test**: `./gradlew test --tests "ClassName.testMethodName"` (add `-PintegrationTests` if the class is `@IntegrationTest`-tagged)
…
```

---

## 31. `Zalamancer/autoStudio` — `AutoAnimation/.claude/worktrees/agent-a2a64cf1/.claude/agents/gsd-codebase-mapper.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/Zalamancer__autoStudio/AutoAnimation/.claude/worktrees/agent-a2a64cf1/.claude/agents/gsd-codebase-mapper.md`

Reported paths: `src/services/user.ts`, `src/services/user.ts`

```markdown
---
name: gsd-codebase-mapper
description: Explores codebase and writes structured analysis documents. Spawned by map-codebase with a focus area (tech, arch, quality, concerns). Writes documents directly to reduce orchestrator context load.
tools: Read, Bash, Grep, Glob, Write
color: cyan
# hooks:
#   PostToolUse:
#     - matcher: "Write|Edit"
#       hooks:
#         - type: command
#           command: "npx eslint --fix $FILE 2>/dev/null || true"
---

<role>
You are a GSD codebase mapper. You explore a codebase for a specific focus area and write analysis documents directly to `.planning/codebase/`.

You are spawned by `/gsd:map-codebase` with one of four focus areas:
- **tech**: Analyze technology stack and external integrations → write STACK.md and INTEGRATIONS.md
- **arch**: Analyze architecture and file structure → write ARCHITECTURE.md and STRUCTURE.md
- **quality**: Analyze coding conventions and testing patterns → write CONVENTIONS.md and TESTING.md
- **concerns**: Identify technical debt and issues → write CONCERNS.md

Your job: Explore thoroughly, then write document(s) directly. Return confirmation only.

**CRITICAL: Mandatory Initial Read**
If the prompt contains a `<f
…
```

---

## 32. `HaoNgo232/agent-bridge-kit` — `.cursor/rules/project-instructions.mdc`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/HaoNgo232__agent-bridge-kit/.cursor/rules/project-instructions.mdc`

Reported paths: `scripts/README.md`

````markdown
---
description: Project-specific instructions and architecture guidelines
globs: []
alwaysApply: true
---

# Agent Bridge — Project Guide for AI Agents

> This document describes the Agent Bridge codebase for AI coding assistants working on this project. It is the single reference for understanding architecture, conventions, and contribution workflow.

## Project Overview

Agent Bridge is a Python CLI tool that converts AI agent configurations from a universal `.agent/` format into IDE-specific formats (Cursor, Copilot, Kiro, OpenCode, Windsurf) and back. It supports bidirectional sync, snapshot management, knowledge vault orchestration, and an external plugin system.

**Repository:** `https://github.com/HaoNgo232/agent-bridge`
**Language:** Python 3.8+
**CLI Entry:** `src/agent_bridge/cli.py` (argparse-based, no framework dependency)
**Tests:** 137 passing (`pytest tests/`)

## Architecture

```
CLI (cli.py) — thin dispatcher, zero business logic
    │
    ├── TUI (tui.py) — interactive prompts via questionary
    │
    ├── Services — business logic layer
    │   ├── init_service.py    → prepare .agent/, run converters, write bridge-meta
    │   ├── sync_service.py    → sync vaul
…
````

---

## 33. `dvy1987/agent-loom` — `.agents/skills/memory-decision/SKILL.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/dvy1987__agent-loom/.agents/skills/memory-decision/SKILL.md`

Reported paths: `docs/memory/decision-log.md`

````markdown
---
name: memory-decision
description: >
  Record durable project decisions with rationale, alternatives, assumptions,
  status, and revisit triggers. Load when the user says record this decision,
  we decided, decision log, why did we choose, revisit this later, or capture
  architectural/process rationale.
license: MIT
metadata:
  author: dvy1987
  version: "1.1"
  category: project-specific
  resources:
    references:
      - examples.md
---

# Memory Decision

You record decisions so future agents understand not just what was chosen, but why it was valid at the time and when to reopen it.

## Workflow

1. State the decision in one sentence.
2. Capture context: constraints, repo state, user preference, and date.
3. List alternatives considered, including deferred options.
4. Record rationale and tradeoffs.
5. Define revisit triggers with concrete conditions.
6. Set status: active, deferred, superseded, or retired.
7. Append to `docs/memory/decision-log.md`.
8. Update `docs/memory/project-index.md`.
9. If architecture-wide, offer `architectural-decision-log` for an ADR.
10. Log file outputs in `docs/skill-outputs/SKILL-OUTPUTS.md`.

## Decision Template

```markdown
## YYYY-MM-D
…
````

---

## 34. `B4san/AC-framework` — `framework/mobile_development/.github/skills/acfm-spec-workflow/SKILL.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/B4san__AC-framework/framework/mobile_development/.github/skills/acfm-spec-workflow/SKILL.md`

Reported paths: `.acfm/config.yaml`, `.acmf/specs/`, `.acfm/changes/`, `.acfm/changes/`

````markdown
---
name: acfm-spec-workflow
description: Initialize and manage AC Framework spec-driven workflows using acfm CLI. Use when setting up spec workflows, checking project status, creating changes, or understanding the .acfm/ vs openspec/ directory structures. Essential first step before using any OpenSpec skills.
---

# AC Framework Spec-Driven Workflow

Guide for initializing and managing spec-driven development workflows using the AC Framework CLI (`acfm`).

## When to use this skill

Use this skill when:
- **Starting a new project** and need to initialize the spec workflow
- **Working on an existing project** and need to check if specs are initialized
- **Creating a new change/feature** using the spec-driven workflow
- **Unsure whether to use `.acfm/` or `openspec/`** directories
- **Need to understand CLI commands** for spec management
- **Migrating from legacy openspec/ to new .acfm/ structure**

## Quick start

```bash
# Check if project is initialized
acfm spec status --json

# Initialize new project (creates .acfm/)
acfm spec init

# Create a new change
acfm spec new my-feature --json

# Get instructions for next artifact
acfm spec instructions proposal --change my-feature --j
…
````

---

## 35. `talosprotocol/talos-sdk-ts` — `.agents/skills/cost-optimization/SKILL.md`

On disk: `/Users/angelcruz/Developer/driftwatch/test/discovery/repos/talosprotocol__talos-sdk-ts/.agents/skills/cost-optimization/SKILL.md`

Reported paths: `references/tagging-standards.md`, `references/tagging-standards.md`

```markdown
---
name: cost-optimization
description: "Optimize cloud costs through resource rightsizing, tagging strategies, reserved instances, and spending analysis. Use when reducing cloud expenses, analyzing infrastructure costs, or implementing c..."
risk: unknown
source: community
date_added: "2026-02-27"
---

# Cloud Cost Optimization

Strategies and patterns for optimizing cloud costs across AWS, Azure, and GCP.

## Do not use this skill when

- The task is unrelated to cloud cost optimization
- You need a different domain or tool outside this scope

## Instructions

- Clarify goals, constraints, and required inputs.
- Apply relevant best practices and validate outcomes.
- Provide actionable steps and verification.
- If detailed examples are required, open `resources/implementation-playbook.md`.

## Purpose

Implement systematic cost optimization strategies to reduce cloud spending while maintaining performance and reliability.

## Use this skill when

- Reduce cloud spending
- Right-size resources
- Implement cost governance
- Optimize multi-cloud costs
- Meet budget constraints

## Cost Optimization Framework

### 1. Visibility
- Implement cost allocation tags
- Use cloud cost manage
…
```

---

## Answer sheet

One line per document, in the order above. Write `this-repo` or `another-project` after
the arrow.

```
 1. eggjs/egg .github/copilot-instructions.md -> this-repo
 2. VAMFI/claude-user-memory .claude/commands/context.md -> this-repo
 3. open-software-network/os-clovy .agents/skills/speckit-implement/SKILL.md -> this-repo
 4. modem-dev/ossrules public/files/ag-ui/sdks/dotnet/AGENTS.md -> this-repo
 5. PyAutoLabs/PyAutoNerves AGENTS.md -> this-repo
 6. remix-run/react-router .agents/skills/react-router/SKILL.md -> this-repo
 7. faionfaion/faion-network skills/faion/knowledge/dev/abuse-case-test-cookbook/AGENTS.md -> this-repo
 8. qq986063761/study apps/react/next16-app/.cursor/skills/nextjs/SKILL.md -> this-repo
 9. ceroideas/backend_figma v2/apps/web/src/visx/core/data/CLAUDE.md ->
10. SkillfulAgents/public-skillset agents/open-slide-studio/artifacts/open-slide-studio/AGENTS.md -> this-repo
11. oliver-ostojic/logbook-writer .claude/agents/api-database-expert.md -> this-repo
12. 1amageek/SwiftAgent AGENTS.md ->  this-repo
13. docxology/docxology .github/ISSUE_TEMPLATE/AGENTS.md -> this-repo
14. docxology/p3if .github/workflows/AGENTS.md ->  this-repo
15. tradecatlabs/human_infra domains/c5-ecological-substrate/shellfish-biotoxin-harmful-algal-bloom-food-continuity/AGENTS.md ->  this-repo
16. willhama/md-file-study corpus_full/code-yeongyu__oh-my-openagent/files/packages/agents-md-core/AGENTS.md -> this-repo
17. u4mzu4/p4_camera managed_components/espressif__tinyusb/.claude/skills/build-doc/SKILL.md -> this-repo
18. calcom/cal.com AGENTS.md -> this-repo
19. metinpy/VOJ-SEC-Anonymous-Gateway managed_components/espressif__tinyusb/.claude/skills/build-doc/SKILL.md -> this-repo
20. Robertomirax/S3-DATALOGGER managed_components/espressif__tinyusb/.claude/skills/build-doc/SKILL.md -> this-repo
21. BuilderIO/agent-native community-templates/win-loss-memo/.agents/skills/external-agents/SKILL.md -> this-repo
22. ai-babai/bitgn-env codex-agent-native/local-rules/AGENTS.md -> this-repo
23. docxology/MetaInformAnt tests/structural_variants/AGENTS.md -> this-repo
24. cloudflare/workers-sdk AGENTS.md -> this-repo
25. mateusoliveiradev1/frescari .agents/skills/skill-writer/SKILL.md -> this-repo
26. Unkownboy0/geetorus2.0 geetorus-companies/geetorus-companies/agency-agents/agents/zk-steward/AGENTS.md -> this-repo
27. NeelakshSaxena/Vayu .agents/skills/lottie-animation/SKILL.md -> this-repo
28. furballroller/super_cat_game arduino_sketches/template+OTA/lib/FastLED-master/.claude/agents/platform-port-agent.md -> this-repo
29. cbbkrd-tech/jl-finishes .claude/skills/ln-001-standards-researcher/SKILL.md -> this-repo
30. CrossPaste/crosspaste-desktop CLAUDE.md -> this-repo
31. Zalamancer/autoStudio AutoAnimation/.claude/worktrees/agent-a2a64cf1/.claude/agents/gsd-codebase-mapper.md -> this-repo
32. HaoNgo232/agent-bridge-kit .cursor/rules/project-instructions.mdc -> this-repo
33. dvy1987/agent-loom .agents/skills/memory-decision/SKILL.md -> this-repo
34. B4san/AC-framework framework/mobile_development/.github/skills/acfm-spec-workflow/SKILL.md -> this-repo
35. talosprotocol/talos-sdk-ts .agents/skills/cost-optimization/SKILL.md -> this-repo
```

Nothing on this page is a precision, and none of it enters `CLASSIFICATION.md`.
