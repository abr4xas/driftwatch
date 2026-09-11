import { loadConfig, type CheckSeverity, type Config } from './core/config.ts'
import { discoverSources } from './core/discover.ts'
import { type Counts } from './core/exit-codes.ts'
import { isIgnored, parseIgnores, type IgnoreIndex } from './core/ignores.ts'
import type { Claim, ClaimKind, Finding, Source } from './core/types.ts'
import { proseGatesFor } from './extract/context-prose.ts'
import { extractFrontmatterClaims } from './extract/frontmatter.ts'
import { extractLinkClaims } from './extract/links.ts'
import { extractPathClaims } from './extract/paths.ts'
import { extractScriptClaims } from './extract/scripts.ts'
import { extractSkillClaims } from './extract/skill.ts'
import { parseFrontmatter } from './parse/frontmatter.ts'
import { parseMarkdown } from './parse/markdown.ts'
import { buildLineTable } from './parse/positions.ts'
import { buildAnchorIndex } from './verify/anchor-index.ts'
import type { Check, CheckContext } from './verify/check.ts'
import { CHECKS } from './verify/checks/index.ts'
import { buildTaskIndex } from './verify/manifest.ts'
import { selectChecks, severityOf } from './verify/selection.ts'
import { gitIgnoredPaths, originSlug } from './verify/git.ts'
import { gitQueriesFor } from './verify/ignored.ts'
import { buildRepoIndex, findRepoRoot } from './verify/repo-index.ts'

export type RunOptions = {
  cwd: string
  /** Positional arguments that narrow the scope. Absent means the whole repo. */
  paths?: readonly string[]
  /** `--config <path>`, or `false` for `--no-config`. Absent means look it up. */
  config?: string | false
  /** `--only`. Absent means every check. */
  only?: readonly string[]
  /** `--skip`. Absent means none. */
  skip?: readonly string[]
  /** `false` when `--no-tier2` was passed. Absent means tier 2 runs. */
  tier2?: boolean
}

export type RunResult = {
  root: string
  /** The config that was in effect, and the file it came from if there was one. */
  config: Config
  configPath: string | undefined
  sources: readonly Source[]
  /**
   * The ids of the checks that ran. Not the registry: it is the only thing
   * that distinguishes a clean audit from a vacuous one.
   */
  checks: readonly string[]
  findings: readonly Finding[]
  counts: Counts
  fixable: number
  durationMs: number
}

/** What the sources contribute to the run: their claims and what they silence. */
type Analysis = {
  claims: readonly Claim[]
  ignores: ReadonlyMap<Source, IgnoreIndex>
}

/**
 * One parse per source feeds both the extractor and the ignore directives.
 * They come from the same mdast tree, so parsing twice would be the only cost
 * of keeping them apart.
 */
function analyze(sources: readonly Source[], origin: string | undefined): Analysis {
  const claims: Claim[] = []
  const ignores = new Map<Source, IgnoreIndex>()
  for (const source of sources) {
    const doc = parseMarkdown(source.content)
    const frontmatter = parseFrontmatter(source.content)
    const table = buildLineTable(source.content)
    // One set of gates per source, shared by every extractor: the section scan
    // they start with is over the whole document.
    const context = {
      source,
      doc,
      frontmatter,
      table,
      prose: proseGatesFor(source.content, origin),
    }
    claims.push(
      ...extractPathClaims(context),
      ...extractScriptClaims(context),
      ...extractLinkClaims(context),
      ...extractFrontmatterClaims(context),
      ...extractSkillClaims(context),
    )
    ignores.set(source, parseIgnores(doc, table))
  }
  return { claims, ignores }
}

/**
 * Ignores are applied to **findings**, not to claims: a directive naming a
 * check can only be honoured once the check that fired is known, and doing it
 * here keeps every check ignorant of the mechanism.
 */
function applyIgnores(
  findings: readonly Finding[],
  ignores: ReadonlyMap<Source, IgnoreIndex>,
): Finding[] {
  return findings.filter((finding) => {
    const index = ignores.get(finding.claim.source)
    if (index === undefined) return true
    return !isIgnored(index, finding.check, finding.claim.range.line)
  })
}

/**
 * A check reports what it found; the id and the severity are stamped here. That
 * is what makes the config's `checks` key (SPEC.md § 7) an override rather than
 * five edits in five check bodies.
 */
function verify(
  claims: readonly Claim[],
  checks: readonly Check[],
  ctx: CheckContext,
  configured: Readonly<Record<string, CheckSeverity>> | undefined,
): Finding[] {
  const severities = new Map(checks.map((check) => [check.id, severityOf(check, configured)]))
  const findings: Finding[] = []
  for (const claim of claims) {
    for (const check of checks) {
      if (!check.claimKinds.includes(claim.kind)) continue
      const report = check.run(claim, ctx)
      if (report === null) continue
      findings.push({
        check: check.id,
        severity: severities.get(check.id) ?? check.defaultSeverity,
        ...report,
      })
    }
  }
  return findings
}

/** Whether any enabled check reads claims of this kind. */
function consumes(checks: readonly Check[], kind: ClaimKind): boolean {
  return checks.some((check) => check.claimKinds.includes(kind))
}

/** Stable order: by file, and within the file by position. */
function sortFindings(findings: Finding[]): Finding[] {
  return findings.toSorted((a, b) => {
    const byFile = a.claim.source.path.localeCompare(b.claim.source.path)
    if (byFile !== 0) return byFile
    if (a.claim.range.line !== b.claim.range.line) return a.claim.range.line - b.claim.range.line
    return a.claim.range.column - b.claim.range.column
  })
}

function countBySeverity(findings: readonly Finding[]): Counts {
  let errors = 0
  let warnings = 0
  for (const finding of findings) {
    if (finding.severity === 'error') errors += 1
    else warnings += 1
  }
  return { errors, warnings }
}

/**
 * The full pipeline: discover -> parse -> extract -> verify. Reporting is left
 * outside on purpose, because the caller decides which format it wants.
 */
export async function run(options: RunOptions): Promise<RunResult> {
  const started = performance.now()
  const root = findRepoRoot(options.cwd)
  const { config, path: configPath } = await loadConfig({
    root,
    cwd: options.cwd,
    explicit: options.config,
  })
  const checks = selectChecks(CHECKS, {
    ...(options.only === undefined ? {} : { only: options.only }),
    ...(options.skip === undefined ? {} : { skip: options.skip }),
    tier2: options.tier2 !== false,
    ...(config.checks === undefined ? {} : { configured: config.checks }),
  })

  const index = await buildRepoIndex(root)
  const sources = await discoverSources(index, {
    paths: options.paths ?? [],
    ...(config.sources === undefined ? {} : { sources: config.sources }),
  })

  const { claims, ignores } = analyze(sources, await originSlug(root))

  // git is asked about every candidate path in one go, before running the
  // checks: a path git ignores cannot be claimed to be missing.
  const ctx: CheckContext = {
    index,
    ignoredByGit: await gitIgnoredPaths(root, gitQueriesFor(claims)),
    // Reading the target files is real I/O, so it is skipped entirely when no
    // enabled check consumes a link claim (`--only path`, or the config
    // turning `link/broken` off).
    anchors: consumes(checks, 'link') ? await buildAnchorIndex(root, claims) : new Map(),
    // Same reasoning: the Makefiles and Deno configs are real I/O, so nothing
    // is read when no enabled check consumes a script claim.
    tasks: consumes(checks, 'script') ? await buildTaskIndex(root, index, claims) : new Map(),
  }

  const findings = sortFindings(applyIgnores(verify(claims, checks, ctx, config.checks), ignores))

  return {
    root,
    config,
    configPath,
    sources,
    checks: checks.map((check) => check.id),
    findings,
    counts: countBySeverity(findings),
    fixable: findings.filter((finding) => finding.suggestion?.fixable === true).length,
    durationMs: performance.now() - started,
  }
}
