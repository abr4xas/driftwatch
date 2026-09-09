import { discoverSources } from './core/discover.ts'
import { type Counts } from './core/exit-codes.ts'
import type { Claim, Finding, Source } from './core/types.ts'
import { extractPathClaims } from './extract/paths.ts'
import { parseFrontmatter } from './parse/frontmatter.ts'
import { parseMarkdown } from './parse/markdown.ts'
import { buildLineTable } from './parse/positions.ts'
import type { CheckContext } from './verify/check.ts'
import { CHECKS, CHECK_IDS } from './verify/checks/index.ts'
import { gitIgnoredPaths } from './verify/git.ts'
import { buildRepoIndex, findRepoRoot } from './verify/repo-index.ts'
import { resolveInRepo } from './verify/resolve.ts'

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

/** Nombre improbable, para preguntarle a git por el contenido de un directorio. */
const DIR_PROBE = '__driftwatch_probe__'

/** Las rutas que los checks van a consultar, en las dos resoluciones posibles. */
function candidatePaths(claims: readonly Claim[]): string[] {
  const paths = new Set<string>()
  for (const claim of claims) {
    if (claim.kind !== 'path') continue
    for (const base of [claim.source.baseDir, '']) {
      const rel = resolveInRepo(base, claim.text)
      if (rel === undefined || rel === '') continue
      paths.add(rel)
      /**
       * Un patron como `pr-status/*` ignora el *contenido* del directorio, no
       * el directorio. Asi que para una afirmacion de directorio se pregunta
       * tambien por un hijo inventado: si git ignoraria lo que hay adentro, el
       * directorio es salida generada.
       *
       * Caso real (vercel/next.js): `scripts/pr-status/`, con
       * `scripts/.gitignore` conteniendo `pr-status/*`.
       */
      if (claim.text.endsWith('/')) paths.add(`${rel}/${DIR_PROBE}`)
    }
  }
  return [...paths]
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

  const claims = sources.flatMap(claimsFor)

  // Se le pregunta a git por todas las rutas candidatas de una sola vez, antes
  // de correr los checks: una ruta que git ignora no se puede afirmar faltante.
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
