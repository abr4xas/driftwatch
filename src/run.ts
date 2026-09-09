import { discoverSources } from './core/discover.ts'
import { type Counts } from './core/exit-codes.ts'
import type { Claim, Finding, Source } from './core/types.ts'
import { extractPathClaims } from './extract/paths.ts'
import { parseFrontmatter } from './parse/frontmatter.ts'
import { parseMarkdown } from './parse/markdown.ts'
import { buildLineTable } from './parse/positions.ts'
import type { CheckContext } from './verify/check.ts'
import { CHECKS, CHECK_IDS } from './verify/checks/index.ts'
import { gitIgnoredPaths, originSlug } from './verify/git.ts'
import { buildRepoIndex, findRepoRoot } from './verify/repo-index.ts'
import { resolveInRepo } from './verify/resolve.ts'

export type RunOptions = {
  cwd: string
  /** Positional arguments that narrow the scope. */
  paths: readonly string[]
}

export type RunResult = {
  root: string
  sources: readonly Source[]
  /** The ids of the registered checks. */
  checks: readonly string[]
  findings: readonly Finding[]
  counts: Counts
  fixable: number
  durationMs: number
}

function claimsFor(source: Source, origin: string | undefined): Claim[] {
  const doc = parseMarkdown(source.content)
  const frontmatter = parseFrontmatter(source.content)
  const table = buildLineTable(source.content)
  return extractPathClaims({ source, doc, frontmatter, table, origin })
}

function verify(claims: readonly Claim[], ctx: CheckContext): Finding[] {
  const findings: Finding[] = []
  for (const claim of claims) {
    for (const check of CHECKS) {
      if (!check.claimKinds.includes(claim.kind)) continue
      const finding = check.run(claim, ctx)
      if (finding !== null) findings.push(finding)
    }
  }
  return findings
}

/** An improbable name, to ask git about a directory's contents. */
const DIR_PROBE = '__driftwatch_probe__'

/** The paths the checks will look up, in both possible resolutions. */
function candidatePaths(claims: readonly Claim[]): string[] {
  const paths = new Set<string>()
  for (const claim of claims) {
    if (claim.kind !== 'path') continue
    for (const base of [claim.source.baseDir, '']) {
      const rel = resolveInRepo(base, claim.text)
      if (rel === undefined || rel === '') continue
      paths.add(rel)
      /**
       * A pattern like `pr-status/*` ignores the directory's *contents*, not
       * the directory. So for a directory claim we also ask about a made-up
       * child: if git would ignore what is inside, the directory is generated
       * output.
       *
       * Real case (vercel/next.js): `scripts/pr-status/`, with
       * `scripts/.gitignore` containing `pr-status/*`.
       */
      if (claim.text.endsWith('/')) paths.add(`${rel}/${DIR_PROBE}`)
    }
  }
  return [...paths]
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
  const index = await buildRepoIndex(root)
  const sources = await discoverSources(index, { paths: options.paths })

  const origin = await originSlug(root)
  const claims = sources.flatMap((source) => claimsFor(source, origin))

  // git is asked about every candidate path in one go, before running the
  // checks: a path git ignores cannot be claimed to be missing.
  const ctx: CheckContext = {
    index,
    ignoredByGit: await gitIgnoredPaths(root, candidatePaths(claims)),
  }

  const findings = sortFindings(verify(claims, ctx))

  return {
    root,
    sources,
    checks: CHECK_IDS,
    findings,
    counts: countBySeverity(findings),
    fixable: findings.filter((finding) => finding.suggestion?.fixable === true).length,
    durationMs: performance.now() - started,
  }
}
