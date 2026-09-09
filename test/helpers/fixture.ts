import { expect } from 'vitest'
import type { Finding } from '../../src/core/types.ts'
import { run } from '../../src/run.ts'
import { makeTempRepo } from './temp-repo.ts'

/** The projection of a finding a fixture can assert on without being brittle. */
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
 * A scenario: a whole mini-repo plus the findings it must produce.
 *
 * The files are declared as data and materialized in a temporary directory
 * instead of living committed as real `CLAUDE.md` files. If they lived in the
 * tree, driftwatch run against its own repo would audit them and report the
 * paths that are broken on purpose.
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
