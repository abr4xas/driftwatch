import { SKILL_ROOTS } from '../../core/discover.ts'
import { frontmatterFactOf } from '../../extract/frontmatter.ts'
import { skillFactOf } from '../../extract/skill.ts'
import { suggestKey } from '../../fix/suggest.ts'
import type { Claim, SkillFact, Suggestion } from '../../core/types.ts'
import type { Check, CheckReport } from '../check.ts'

/**
 * `SPEC.md` § 3: the five structural rules of a `SKILL.md` frontmatter.
 *
 * Structure, and only structure. Ticket `06` settled the division: a field
 * whose **type** is wrong is `frontmatter/invalid`'s finding, and a
 * `description` that is a list has no length to be too short. So every rule
 * here runs on a field whose type is already right, and a block that does not
 * parse produces one finding rather than six.
 */

/** The two fields the format requires. */
const REQUIRED: readonly string[] = ['name', 'description']

/**
 * `SPEC.md` § 3: "a poor description means the skill never gets invoked".
 */
const MIN_DESCRIPTION = 20

/**
 * Lowercase alphanumerics in hyphen-separated words.
 *
 * It answers four of the specification's five `name` rules at once — lowercase
 * alphanumerics and hyphens, no leading hyphen, no trailing hyphen, no
 * consecutive hyphens — because each of those is a way to fail this shape.
 */
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

/**
 * <https://agentskills.io/specification.md> caps `name` at 64 characters, and
 * `skills-ref validate` rejects a longer one — 64 accepted, 65 not.
 *
 * **This is a gate and not a rule**, and the difference is the scope of the
 * product. A name over the limit is not *drift*: it is as wrong on the day it
 * is written as it is a year later, nothing about the repository changed under
 * it, and `BRIEF.md` is about documents that describe a repository they no
 * longer match. Ticket `10` added it as a finding and it was withdrawn to this
 * on Angel's objection, having reported nothing anyway.
 *
 * What it is still needed for is the **autofix**. The fix rewrites a `name`
 * into its directory, so the directory has to be usable as a name — and a
 * kebab-case directory of 68 characters is not. Without this the tool offered
 * exactly that, producing a skill `skills-ref` rejects.
 *
 * Counting with `String.length` is UTF-16 code units rather than characters,
 * which is safe only because `KEBAB` is checked first: a name holding anything
 * outside `a-z0-9-` has already failed, so by here the two counts agree.
 */
const MAX_NAME = 64

/**
 * The keys the format documents. It is **not** an allowlist whose complement
 * is reported: an unknown key only produces a finding when it is a near-miss
 * of one of these (`suggestKey`), so a field added to the format after this
 * list was written goes undetected rather than reported.
 */
const KNOWN_KEYS: readonly string[] = [
  'name',
  'description',
  'license',
  // Documented by <https://agentskills.io/specification.md> and accepted by
  // `skills-ref validate`; the list had fallen a key behind it. Adding one can
  // only make this rule quieter, which is the direction it is allowed to move.
  'compatibility',
  'allowed-tools',
  'metadata',
  'model',
  'argument-hint',
  'disable-model-invocation',
  'user-invocable',
]

/**
 * The skill's directory name, which is the identity an agent invokes.
 *
 * `undefined` when the file sits directly in a skills root: there is no
 * directory of its own to compare a name against. The test is on the parent's
 * whole **path** and not on its name, so a skill legitimately called `skills`
 * (`.claude/skills/skills/SKILL.md`) keeps the rule.
 *
 * Every root `discover.ts` classifies counts, not just `.claude`. That was a
 * real bug the moment discovery widened: a `SKILL.md` in the root of
 * `.agents/skills/` had its name compared against `skills`, and was reported
 * for not matching a container it was never named after.
 */
function skillDirectoryOf(path: string): string | undefined {
  const segments = path.split('/')
  const parent = segments.slice(0, -1)
  const parentPath = parent.join('/')
  if (SKILL_ROOTS.some((root) => parentPath.endsWith(`${root}/skills`))) return undefined
  return parent.at(-1)
}

function finding(claim: Claim, message: string, suggestion?: Suggestion): CheckReport {
  return {
    claim,
    message,
    ...(suggestion === undefined ? {} : { suggestion }),
  }
}

/** The rules that need the block rather than a key: the two absences. */
function checkBlock(claim: Claim, fact: SkillFact): CheckReport | null {
  if (!fact.present) return finding(claim, 'frontmatter is missing')

  const missing = REQUIRED.filter((field) => !fact.keys.includes(field))
  if (missing.length === 0) return null
  // One claim yields one finding, and that turns out to be the better output:
  // a block missing both fields says so on one line.
  return finding(claim, `frontmatter has no ${missing.join(' or ')}`)
}

/**
 * The `name` rules, in the order that keeps them from doubling each other.
 *
 * A name that disagrees with its directory is reported as the disagreement,
 * not as its own spelling: the directory finding carries the fix, and
 * complaining about the case of a name that is about to be replaced wholesale
 * is noise. The kebab rule therefore fires when the name **agrees** with the
 * directory and both are wrong, which is the shape where the two names really
 * do have to change together.
 */
/**
 * Whether a string could be this skill's `name` without breaking a rule.
 *
 * Only the autofix asks. It is deliberately **stricter than what the check
 * reports**: `MAX_NAME` is a gate and not a finding, so a directory 68
 * characters long is refused as a replacement while a *name* 68 characters
 * long is passed over in silence. The asymmetry is the point — driftwatch is
 * not here to lint somebody's naming, but it must not hand them an edit that
 * makes their skill invalid.
 */
function usableAsName(value: string): boolean {
  return KEBAB.test(value) && value.length <= MAX_NAME
}

function checkName(claim: Claim, value: string): CheckReport | null {
  const directory = skillDirectoryOf(claim.source.path)

  if (directory !== undefined && value !== directory) {
    // `SPEC.md` § 8 lists this as the check's one autofix, and it is offered
    // only when the directory is itself usable as a name: a fix whose output
    // is a finding is not a fix, and one whose output the reference
    // implementation rejects is worse.
    const suggestion: Suggestion | undefined = usableAsName(directory)
      ? { value: directory, confidence: 1, fixable: true }
      : undefined
    return finding(claim, 'name does not match the directory', suggestion)
  }

  return KEBAB.test(value) ? null : finding(claim, 'name is not kebab-case')
}

function checkDescription(claim: Claim, value: string): CheckReport | null {
  const text = value.trim()
  if (text.length === 0) return finding(claim, 'description is empty')
  if (text.length < MIN_DESCRIPTION) {
    return finding(claim, `description is shorter than ${MIN_DESCRIPTION} characters`)
  }
  return null
}

export const skillFrontmatter: Check = {
  id: 'skill/frontmatter',
  title: 'A SKILL.md frontmatter is not invocable',
  description:
    'A SKILL.md is missing a required field, names itself something other than ' +
    'its directory, or carries a description too short to make the skill ' +
    'discoverable. Structure only: a field whose type is wrong is reported by ' +
    'frontmatter/invalid.',
  tier: 1,
  defaultSeverity: 'error',
  claimKinds: ['frontmatter'],

  run(claim) {
    const block = skillFactOf(claim)
    if (block !== undefined) return checkBlock(claim, block)

    // Only a skill has these rules. A subagent and a command have required
    // fields of their own and this check knows nothing about them.
    if (claim.source.kind !== 'skill') return null

    const fact = frontmatterFactOf(claim)
    if (fact?.subject !== 'key') return null

    /**
     * The unknown-key rule is answered **before** the type gates below,
     * because it does not read the value: `allowed_tools: [Read, Bash]` is the
     * commonest spelling of that mistake, and gating it on the value being a
     * string is how it went undetected in the first draft.
     */
    if (!REQUIRED.includes(fact.key)) {
      if (KNOWN_KEYS.includes(fact.key)) return null
      const suggestion = suggestKey(KNOWN_KEYS, fact.key)
      // No near-miss, no claim: a key nobody on the list resembles is far more
      // likely somebody's own than a mistake (ADR-0011).
      return suggestion === undefined ? null : finding(claim, 'unknown key', suggestion)
    }

    // An empty value is the absence of a value, and it reads the same for both
    // required fields. Any other wrong type is `frontmatter/invalid`'s finding.
    if (fact.type === 'empty') return finding(claim, `${fact.key} is empty`)
    if (fact.type !== 'string' || fact.scalar === undefined) return null

    return fact.key === 'name'
      ? checkName(claim, fact.scalar)
      : checkDescription(claim, fact.scalar)
  },
}
