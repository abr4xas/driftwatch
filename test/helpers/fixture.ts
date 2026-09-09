import { expect } from 'vitest'
import type { Finding } from '../../src/core/types.ts'
import { run } from '../../src/run.ts'
import { makeTempRepo } from './temp-repo.ts'

/** La proyeccion de un finding que un fixture puede afirmar sin fragilidad. */
export type ExpectedFinding = {
  check: string
  severity: 'error' | 'warning'
  file: string
  line: number
  column: number
  text: string
  message: string
  suggestion?: { value: string; confidence: number; fixable: boolean }
}

/**
 * Un escenario: un mini-repo completo mas los findings que debe producir.
 *
 * Los archivos se declaran como datos y se materializan en un directorio
 * temporal en vez de vivir commiteados como `CLAUDE.md` de verdad. Si vivieran
 * en el arbol, driftwatch corrido sobre su propio repo los auditaria y
 * reportaria las rutas que estan rotas a proposito.
 */
export type Fixture = {
  name: string
  files: Record<string, string>
  expected: readonly ExpectedFinding[]
  git?: boolean
}

function project(finding: Finding): ExpectedFinding {
  const base: ExpectedFinding = {
    check: finding.check,
    severity: finding.severity,
    file: finding.claim.source.path,
    line: finding.claim.range.line,
    column: finding.claim.range.column,
    text: finding.claim.text,
    message: finding.message,
  }
  return finding.suggestion === undefined ? base : { ...base, suggestion: finding.suggestion }
}

export async function checkFixture(fixture: Fixture): Promise<void> {
  const root = makeTempRepo({ files: fixture.files, git: fixture.git ?? true })
  const result = await run({ cwd: root, paths: [] })
  expect(result.findings.map(project), `fixture ${fixture.name}`).toEqual([...fixture.expected])
}
