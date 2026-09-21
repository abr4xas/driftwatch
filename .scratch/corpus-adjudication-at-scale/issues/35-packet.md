# Adjudication packet: thirty repositories, chosen blind

Pre-registered selection: even stride through `test/discovery/repos.txt`, whose order cycles
the twelve acquisition facets. No exclusion based on findings — not on count, not on
cleanliness, not on being a skill farm. Deterministic and reproducible.

**Nothing here is a ruling.** The order comes from `pnpm discovery queue`, whose signal was
scored at 94% against the 32 already-ruled findings — it says what to read first and decides
nothing. Every line below needs a person against the real repository.

## The twenty that produce no finding

Zero findings means zero false positives by construction. They need no reading.

- `boring-design/elastic-fruit-runner`  `46f1d04355d0e53bf0b4b3b38d2ba0cb9141be25`
- `hasseily/NoxArchaistCompanion`  `77fe10d12fc6187057e4df3f556e7ce831772226`
- `alperhankendi/Ctxo`  `9a71337018f5df47b5edba172bbb2b45016cf17a`
- `jaychempan/coding-with-beat`  `0c5eb49da6f82cb1e2fac9d9d8bf3f76986bf6a2`
- `NanoNative/nano`  `7ea67d0e31093fd922ca65a17d79db046aa09946`
- `Andersbakken/rtags`  `4abf149e27645dd2bd0e4f7557e114fa86822055`
- `6enta0/CPAplus`  `0662b85a1af87fe9dbafafb8773ed8edce51cdc3`
- `chippeddog/english.now`  `?`
- `RajX-dev/N3MO`  `?`
- `qingshanliuci/cnki-aigc---skill`  `?`
- `Canine89/hwpxskill`  `?`
- `fideus-labs/fidnii`  `?`
- `Stringmk/claude-code-bootcamp-excercises`  `?`
- `nadzbernardino/Chris-and-the-Jollibabees`  `?`
- `hosungseo/local-delegation-field-admin`  `?`
- `Compass-Brand/compass-engine`  `?`
- `Theycallmeholla/skills`  `?`
- `unbound-force/replicator`  `?`
- `AzureLocal/azurelocal-nutanix-migration`  `?`
- `andrewevans0102/reygent`  `?`

## The ten that need a person

Ordered cheapest-to-settle first. A repository is settled by its **first** false
positive, so the top row usually decides it; the rows under it are where to keep
reading if the top one turns out to be true drift.


### `hecateq/hecateq-openagent` — 4 findings · `?`

1. **AGENTS.md:290** · `.github/instructions/` · Jev: `another-tools-layout`
   > - **Test discipline meta-audits:** two files (`src/shared/mock-module-lifecycle-audit.test.ts` and `src/shared/prompt-async-route-audit.test.ts`) parse the entire codebase via the TS compiler API and FAIL the suite when an architectural invariant is violated (`mock.module()` without restore, raw `se

2. **src/mcp/AGENTS.md:16** · `LSP_TOOLS_MCP_PROJECT_CONFIG=.opencode/lsp.json` · Jev: `readers-project`
   > | **context7** | remote | `mcp.context7.com/mcp` | `CONTEXT7_API_KEY` (optional) | Library documentation | ⏎ | **grep_app** | remote | `mcp.grep.app` | None | GitHub code search | ⏎ | **lsp** | local (stdio, node/bun) | `node packages/lsp-tools-mcp/dist/cli.js mcp` or `bun packages/lsp-tools-mcp/src

3. **src/tools/look-at/AGENTS.md:47** · `src/agents/builtin-agents/multimodal-looker.ts` · Jev: `—`
   > ## DISTINCTION ⏎  ⏎ This is the TOOL that DELEGATES TO the `multimodal-looker` AGENT. The agent lives in `src/agents/builtin-agents/multimodal-looker.ts`; this tool is the invocation harness. ⏎  ⏎ ## NOTES

   *(and 1 more)*


### `eggjs/egg` — 6 findings · `d4129fca99e92fadaf0cb8d1f26688b743d582b9`

1. **AGENTS.md:95** · `src/global.d.ts` · Jev: `readers-project`
   > ## TypeScript Global Types ⏎  ⏎ - put package-wide global augmentations in a dedicated `src/global.ts` or `src/global.d.ts` ⏎ - shared cross-package global types belong in `@eggjs/typings`, not in one consumer package ⏎ - import shared global augmentations from the package entry that needs the type 

2. **tegg/CLAUDE.md:58** · `../egg` · Jev: `readers-project`
   > ## Development Commands ⏎  ⏎ **Note:** All commands below should be run from the **monorepo root** (`../egg`), not from the tegg directory. ⏎  ⏎ ### Build & Clean

3. **tegg/CLAUDE.md:96** · `../egg` · Jev: `readers-project`
   > ### Version Management ⏎  ⏎ **Note:** Run these commands from the monorepo root (`../egg`). ⏎  ⏎ ```bash

   *(and 3 more)*


### `CamilleScholtz/swmpc` — 9 findings · `?`

1. **.agents/skills/asc-whats-new-writer/SKILL.md:172** · `metadata/version/` · Jev: `placeholder`
   > - **Keywords:** `metadata/version/{latest-version}/{locale}.json` → `keywords` field ⏎ - **Current What's New:** `metadata/version/{latest-version}/{locale}.json` → `whatsNew` field ⏎ - **Latest version:** highest semver directory under `metadata/version/` ⏎ - The canonical `./Store` tree is what `a

2. **.agents/skills/asc-workflow/SKILL.md:204** · `.asc/workflow.json` · Jev: `—`
   > ## Safety rules ⏎  ⏎ - Treat `.asc/workflow.json` like code; only run trusted workflow files. ⏎ - Avoid running workflows from untrusted PRs with secrets. ⏎ - Keep workflow files in version control.

3. **.agents/skills/asc-workflow/SKILL.md:65** · `.asc/workflow.json` · Jev: `—`
   > ## File location and format ⏎  ⏎ - Default path: `.asc/workflow.json` ⏎ - Override path: `asc workflow run --file ./path/to/workflow.json <name>` ⏎ - JSONC comments are supported.

   *(and 6 more)*


### `MuLTiAcidi/claudeos` — 27 findings · `?`

1. **agents/subdomain-takeover/CLAUDE.md:98** · `herokucdn.com/error-pages/no-such-app.html` · Jev: `foreign-project`
   > | AWS S3           | `*.s3.amazonaws.com`, `*.s3-website-*.amazonaws.com`| `NoSuchBucket`, `The specified bucket does not exist`     | `aws s3 mb s3://<bucket>`                     | ⏎ | GitHub Pages     | `*.github.io`                                       | `There isn't a GitHub Pages site here.` 

2. **agents/magento-hunter/CLAUDE.md:594** · `app/etc/env.php` · Jev: `readers-project`
   > ## 18. Tips & Pitfalls ⏎  ⏎ - Magento 2 admin path is randomized by default. Look for it in `app/etc/env.php` (if leaked), JS references, or admin notification emails exposed via RSS. ⏎ - `magento_version` header may be missing on hardened sites — fall back to JS build versions in `pub/static/versio

3. **agents/wordpress-hunter/CLAUDE.md:577** · `wp-includes/version.php` · Jev: `foreign-project`
   > - WordPress sites behind Cloudflare may block wpscan — use `--random-user-agent` and throttle. ⏎ - Some sites hide `/wp-json/` behind auth — try `/?rest_route=/wp/v2/users` bypass. ⏎ - `readme.html` is often stripped; fall back to `license.txt`, `wp-includes/version.php` (if exposed), or fingerprint

   *(and 24 more)*


### `BuilderIO/agent-native` — 244 findings · `?`

1. **.agents/skills/new-branch/SKILL.md:26** · `feat/` · Jev: `placeholder`
   > ⏎ - The user said "fix the bug" / "open a PR" / "ship this" / "address review feedback" — those work on the **current** branch. PR and ship workflows in this repo push the current branch; they don't branch-then-push. ⏎ - The current branch name looks unusual (`ai_*`, `claude/*`, `codex/*`, `changes-

2. **community-templates/linkedin-icp-prospect-tracker/.agents/skills/portability/SKILL.md:92** · `netlify/functions/` · Jev: `foreign-project`
   > ### No platform-specific config in scaffolded template source ⏎  ⏎ Files like `netlify.toml`, `wrangler.toml`, `vercel.json`, and `netlify/functions/` must NOT appear in the CLI scaffold source (`packages/core/src/templates/`) — apps generated for users stay hosting-agnostic, with platform configura

3. **community-templates/call-follow-up-drafter/.agents/skills/external-agents/SKILL.md:457** · `.vscode/mcp.json` · Jev: `third-party-convention`
   > the `[mcp_servers.*]` block in `~/.codex/config.toml` for Codex, ⏎ `.cursor/mcp.json` / `~/.cursor/mcp.json` for Cursor, `opencode.json` / ⏎ `~/.config/opencode/opencode.json` for OpenCode, `.vscode/mcp.json` / VS Code ⏎ user `mcp.json` for GitHub Copilot / VS Code, and the Claude-Code JSON shape ⏎ 

   *(and 241 more)*


### `bmad-labs/skills` — 1 findings · `f2e09b317c6fc7cd1d926e424388adb52310dad7`

1. **CLAUDE.md:24** · `.claude/commands/` · Jev: `—`
   > - `spec/` — skills specification documentation ⏎ - `_bmad/` — BMAD workflow automation framework (roles, phases, orchestration) ⏎ - `.claude/commands/` — BMAD slash commands for Claude Code ⏎ - `books/` — source books used by book-related skills ⏎


### `BetterSEQTA/DesQTA` — 2 findings · `?`

1. **.cursor/skills/premium-ui-refinement/SKILL.md:170** · `../../docs/development/premium-animations-analysis.md` · Jev: `—`
   > ## Additional Resources ⏎  ⏎ For detailed analysis of premium animation patterns, see [docs/development/premium-animations-analysis.md](../../docs/development/premium-animations-analysis.md) ⏎

2. **AGENTS.md:163** · `src/lib/utils/netUtil.ts` · Jev: `—`
   > - **Settings (Rust):** `src-tauri/src/utils/settings.rs` – Settings struct, Default, load logic ⏎ - **Database Schemas/Queries:** `src-tauri/src/utils/database.rs` or `src/lib/services/idb.ts` ⏎ - **API Integration:** `src/lib/utils/netUtil.ts` & `src-tauri/src/utils/netgrab.rs` ⏎ - **Actions (click


### `TommyLike/KnowledgeBase` — 3 findings · `?`

1. **.claude/commands/kg-refresh.md:102** · `repo/CHANGELOG.md` · Jev: `—`
   > - 读 `repo/README.md`，提取：项目定位、核心算法/设计、关键 benchmark、使用场景 ⏎ - 读 `repo/docs/` 入口文件（如有），提取：架构说明、关键概念 ⏎ - 读 `repo/CHANGELOG.md` 或最近 3 个 GitHub Release（如有），提取：版本演进脉络 ⏎  ⏎ **步骤 B：读近期动态**

2. **.claude/commands/kg-refresh.md:100** · `repo/README.md` · Jev: `—`
   > ⏎ **步骤 A：读文档** ⏎ - 读 `repo/README.md`，提取：项目定位、核心算法/设计、关键 benchmark、使用场景 ⏎ - 读 `repo/docs/` 入口文件（如有），提取：架构说明、关键概念 ⏎ - 读 `repo/CHANGELOG.md` 或最近 3 个 GitHub Release（如有），提取：版本演进脉络

3. **.claude/commands/kg-refresh.md:101** · `repo/docs/` · Jev: `—`
   > **步骤 A：读文档** ⏎ - 读 `repo/README.md`，提取：项目定位、核心算法/设计、关键 benchmark、使用场景 ⏎ - 读 `repo/docs/` 入口文件（如有），提取：架构说明、关键概念 ⏎ - 读 `repo/CHANGELOG.md` 或最近 3 个 GitHub Release（如有），提取：版本演进脉络 ⏎


### `imarshallwidjaja/data-etl-dagster` — 4 findings · `?`

1. **services/dagster/etl_pipelines/AGENTS.md:13** · `data-lake/blobs/` · Jev: `—`
   > - Sensors are one-shot and archive processed manifests. ⏎ - Audit lifecycle events are recorded in `activity_logs`. ⏎ - Raw source archival writes `artifacts` that reference content-addressed `blobs` in `data-lake/blobs/`. ⏎ - Archive flow is hash-first, upload-second to avoid memory-heavy hashing w

2. **services/minio/AGENTS.md:9** · `landing-zone/archive/` · Jev: `—`
   > - Users write to `landing-zone`; pipeline writes to `data-lake`. ⏎ - Manifests live under `landing-zone/manifests/` and trigger runs. ⏎ - Processed manifests are archived under `landing-zone/archive/`. ⏎ - Raw source archival writes content-addressed blobs under `data-lake/blobs/` and links them via

3. **services/minio/AGENTS.md:8** · `landing-zone/manifests/` · Jev: `—`
   > ## Key invariants ⏎ - Users write to `landing-zone`; pipeline writes to `data-lake`. ⏎ - Manifests live under `landing-zone/manifests/` and trigger runs. ⏎ - Processed manifests are archived under `landing-zone/archive/`. ⏎ - Raw source archival writes content-addressed blobs under `data-lake/blobs/

   *(and 1 more)*
