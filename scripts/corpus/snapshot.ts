/**
 * The one module that knows what a certification snapshot looks like.
 *
 * `run.ts` writes it, and the bookkeeping test, the site data and `run.ts`'s
 * own counts read it. Each reader used to parse it by hand, with its own idea
 * of where the findings start and of what makes a finding fixable — one of
 * them decided that with `line.includes('fixable')`, which a claim whose text
 * says "fixable" would have satisfied.
 *
 * `renderSnapshot(readSnapshot(text)) === text` holds for every committed
 * snapshot, and the bookkeeping test checks it. That is what makes the parsed
 * shape trustworthy: nothing in the file is lost by reading it.
 */
import type { RunResult } from '../../src/index.ts'

export type SnapshotFinding = {
  path: string
  line: number
  column: number
  check: string
  context: string
  text: string
  suggestion: { value: string; confidence: number; fixable: boolean } | undefined
}

export type Snapshot = {
  repo: string
  errors: number
  warnings: number
  /** As `run` counted it, not recounted from the findings. */
  fixable: number
  sources: { kind: string; path: string }[]
  findings: SnapshotFinding[]
}

export function snapshotFromRun(repo: string, result: RunResult): Snapshot {
  return {
    repo,
    errors: result.counts.errors,
    warnings: result.counts.warnings,
    fixable: result.fixable,
    sources: result.sources.map((source) => ({ kind: source.kind, path: source.path })),
    findings: result.findings.map((finding) => ({
      path: finding.claim.source.path,
      line: finding.claim.range.line,
      column: finding.claim.range.column,
      check: finding.check,
      context: finding.claim.context,
      text: finding.claim.text,
      suggestion: finding.suggestion,
    })),
  }
}

/** Stable, diffable rendering. Time does not enter it: it says nothing about precision. */
export function renderSnapshot(snapshot: Snapshot): string {
  const lines = [
    `# ${snapshot.repo}`,
    '',
    `sources: ${snapshot.sources.length}`,
    `errors: ${snapshot.errors}`,
    `warnings: ${snapshot.warnings}`,
    `fixable: ${snapshot.fixable}`,
    '',
    '## sources',
    ...snapshot.sources.map((source) => `${source.kind}  ${source.path}`),
    '',
    '## findings',
  ]
  if (snapshot.findings.length === 0) lines.push('(none)')
  for (const finding of snapshot.findings) {
    const { suggestion } = finding
    const tail =
      suggestion === undefined
        ? ''
        : `  -> ${suggestion.value} (${suggestion.confidence}${suggestion.fixable ? ', fixable' : ''})`
    lines.push(
      `${finding.path}:${finding.line}:${finding.column}  [${finding.check}] ${finding.context}  ${finding.text}${tail}`,
    )
  }
  return `${lines.join('\n')}\n`
}

const FINDING =
  /^(?<path>.+?):(?<line>\d+):(?<column>\d+) {2}\[(?<check>[^\]]+)\] (?<context>\S+) {2}(?<rest>.*)$/u
// Anchored at the end: a claim can itself contain ` -> `, and the tail is
// always last.
const TAIL = /^(?<text>.*) {2}-> (?<value>.*) \((?<confidence>[\d.]+)(?<fixable>, fixable)?\)$/u

function count(text: string, key: string): number {
  const match = new RegExp(`^${key}: (\\d+)$`, 'mu').exec(text)
  if (match === null) throw new Error(`snapshot has no "${key}:" line`)
  return Number(match[1])
}

function findingOf(line: string): SnapshotFinding {
  const found = FINDING.exec(line)?.groups
  if (found === undefined) throw new Error(`not a snapshot finding: ${line}`)
  const rest = found['rest'] ?? ''
  const tail = TAIL.exec(rest)?.groups
  return {
    path: found['path'] ?? '',
    line: Number(found['line']),
    column: Number(found['column']),
    check: found['check'] ?? '',
    context: found['context'] ?? '',
    text: tail === undefined ? rest : (tail['text'] ?? ''),
    suggestion:
      tail === undefined
        ? undefined
        : {
            value: tail['value'] ?? '',
            confidence: Number(tail['confidence']),
            fixable: tail['fixable'] !== undefined,
          },
  }
}

/**
 * Reads a snapshot back. It throws rather than skipping a line it does not
 * understand: a reader that drops findings quietly would make every count
 * built on it agree with itself and be wrong.
 */
export function readSnapshot(text: string): Snapshot {
  const repo = /^# (.+)$/mu.exec(text)?.[1]
  if (repo === undefined) throw new Error('snapshot has no "# repo" heading')
  const [head = '', findings] = text.split('\n## findings\n')
  if (findings === undefined) throw new Error('snapshot has no "## findings" section')
  const sources = (head.split('\n## sources\n')[1] ?? '')
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => {
      const at = line.indexOf('  ')
      return { kind: line.slice(0, at), path: line.slice(at + 2) }
    })
  if (sources.length !== count(text, 'sources')) {
    throw new Error(
      `snapshot of ${repo} lists ${sources.length} sources and says ${count(text, 'sources')}`,
    )
  }
  const body = findings.trimEnd()
  return {
    repo,
    errors: count(text, 'errors'),
    warnings: count(text, 'warnings'),
    fixable: count(text, 'fixable'),
    sources,
    findings: body === '(none)' ? [] : body.split('\n').map(findingOf),
  }
}
