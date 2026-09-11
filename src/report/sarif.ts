/**
 * SARIF 2.1.0, for upload to GitHub Code Scanning.
 *
 * The half that is easy to skip is `tool.driver.rules`, and it is the half that
 * decides whether an alert is readable a month after it was raised: the result
 * carries a message about one line, the rule carries what the check means and
 * when it is wrong. Both come from the check itself — see `Check.description`.
 *
 * **No `partialFingerprints`.** Without them Code Scanning fingerprints on
 * location, so an alert reappears as new when the file shifts by a line. With
 * them we own a hashing decision for as long as the tool exists, and changing
 * it later re-raises every alert at once. The first cost is visible and
 * recoverable; the second is neither. Skipped deliberately, and this paragraph
 * is here so the question is not rediscovered.
 */
import { pathToFileURL } from 'node:url'
import type { Finding } from '../core/types.ts'
import { readVersion } from '../core/version.ts'
import type { RunResult } from '../run.ts'
import { CHECKS } from '../verify/checks/index.ts'
import type { FixEntry, FixOutcome } from './types.ts'

const SCHEMA = 'https://json.schemastore.org/sarif-2.1.0.json'
const INFORMATION_URI = 'https://github.com/abr4xas/driftwatch'
const GUIDE = `${INFORMATION_URI}/blob/main/docs/guide/checks.md`

/** The opaque name the locations resolve against. */
const SRCROOT = '%SRCROOT%'

export type SarifOptions = {
  /** What `--fix` did, when it ran. Absent on an ordinary run. */
  fixes?: FixOutcome
}

/**
 * The anchor GitHub renders for the heading that documents a check.
 *
 * GitHub's slug drops every character that is not a letter, a number or a
 * space, so a `## path/missing` heading is reachable at `#pathmissing`. The
 * same rule `parse/anchors.ts` canonicalises with, applied to an id we control
 * rather than to prose.
 */
function anchorFor(id: string): string {
  return id.replaceAll('/', '')
}

/**
 * One rule per check that **ran**, not per check that exists. A rule for a
 * check `--only` turned off describes an alert that cannot appear.
 */
function rulesFor(result: RunResult): Record<string, unknown>[] {
  const ran = new Set(result.checks)
  return CHECKS.filter((check) => ran.has(check.id)).map((check) => ({
    id: check.id,
    name: check.id,
    shortDescription: { text: check.title },
    fullDescription: { text: check.description },
    helpUri: `${GUIDE}#${anchorFor(check.id)}`,
    defaultConfiguration: { level: check.defaultSeverity },
    properties: { tags: ['drift', `tier-${check.tier}`] },
  }))
}

function locationOf(finding: Finding): Record<string, unknown> {
  const { claim } = finding
  return {
    physicalLocation: {
      artifactLocation: { uri: claim.source.path, uriBaseId: SRCROOT },
      region: {
        startLine: claim.range.line,
        startColumn: claim.range.column,
        endLine: claim.range.endLine,
        endColumn: claim.range.endColumn,
      },
    },
  }
}

/**
 * SARIF's own `fixes`, which is the same information `--format json` puts in a
 * `fix` field, written in the format's vocabulary rather than a property bag.
 *
 * Dry runs only, for the reason `report/json.ts` states at length: after a real
 * write the offsets index a file that no longer exists in that form.
 */
function fixOf(entry: FixEntry): Record<string, unknown> {
  return {
    description: { text: `Replace with ${entry.after}` },
    artifactChanges: [
      {
        artifactLocation: { uri: entry.file, uriBaseId: SRCROOT },
        replacements: [
          {
            deletedRegion: {
              charOffset: entry.range[0],
              charLength: entry.range[1] - entry.range[0],
            },
            insertedContent: { text: entry.after },
          },
        ],
      },
    ],
  }
}

function plannedBy(fixes: FixOutcome | undefined): Map<Finding, FixEntry> {
  if (fixes === undefined || !fixes.dryRun) return new Map()
  return new Map(fixes.entries.map((entry) => [entry.finding, entry]))
}

function resultOf(finding: Finding, entry: FixEntry | undefined): Record<string, unknown> {
  const { suggestion } = finding
  const text =
    suggestion === undefined ? finding.message : `${finding.message} → ${suggestion.value}?`
  return {
    ruleId: finding.check,
    level: finding.severity === 'error' ? 'error' : 'warning',
    message: { text: `${finding.claim.text}: ${text}` },
    locations: [locationOf(finding)],
    ...(entry === undefined ? {} : { fixes: [fixOf(entry)] }),
  }
}

export function renderSarif(result: RunResult, options: SarifOptions = {}): string {
  const planned = plannedBy(options.fixes)
  const document = {
    $schema: SCHEMA,
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'driftwatch',
            informationUri: INFORMATION_URI,
            semanticVersion: readVersion(),
            rules: rulesFor(result),
          },
        },
        // A trailing slash: SARIF resolves a relative uri against this, and
        // without it the last path segment of the root is dropped.
        originalUriBaseIds: { [SRCROOT]: { uri: `${pathToFileURL(result.root).href}/` } },
        results: result.findings.map((finding) => resultOf(finding, planned.get(finding))),
      },
    ],
  }
  return `${JSON.stringify(document, null, 2)}\n`
}
