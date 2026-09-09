import { discoverSources } from './core/discover.ts'
import { type Counts } from './core/exit-codes.ts'
import type { Claim, Finding, Source } from './core/types.ts'
import { extractPathClaims } from './extract/paths.ts'
import { parseFrontmatter } from './parse/frontmatter.ts'
import { parseMarkdown } from './parse/markdown.ts'
import { buildLineTable } from './parse/positions.ts'
import type { CheckContext } from './verify/check.ts'
import { CHECKS, CHECK_IDS } from './verify/checks/index.ts'
import { buildRepoIndex, findRepoRoot } from './verify/repo-index.ts'

export type RunOptions = {
  cwd: string
  /** Argumentos posicionales que limitan el alcance. */
  paths: readonly string[]
}

export type RunResult = {
  root: string
  sources: readonly Source[]
  /** Los ids de los checks registrados. */
  checks: readonly string[]
  findings: readonly Finding[]
  counts: Counts
  fixable: number
  durationMs: number
}

function claimsFor(source: Source): Claim[] {
  const doc = parseMarkdown(source.content)
  const frontmatter = parseFrontmatter(source.content)
  const table = buildLineTable(source.content)
  return extractPathClaims({ source, doc, frontmatter, table })
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

/** Orden estable: por archivo, y dentro del archivo por posicion. */
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
 * El pipeline completo: discover -> parse -> extract -> verify. El reporte queda
 * afuera a proposito, porque quien llama decide en que formato lo quiere.
 */
export async function run(options: RunOptions): Promise<RunResult> {
  const started = performance.now()
  const root = findRepoRoot(options.cwd)
  const index = await buildRepoIndex(root)
  const sources = await discoverSources(index, { paths: options.paths })

  const ctx: CheckContext = { index }
  const findings = sortFindings(sources.flatMap((source) => verify(claimsFor(source), ctx)))

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
