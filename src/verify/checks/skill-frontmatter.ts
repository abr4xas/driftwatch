import { SKILL_CONTAINERS } from '../../core/discover.ts'
import { frontmatterFactOf } from '../../extract/frontmatter.ts'
import { skillFactOf } from '../../extract/skill.ts'
import type { Claim, SkillFact, Suggestion } from '../../core/types.ts'
import type { Check, CheckReport } from '../check.ts'

/**
 * A `SKILL.md` that names itself something other than its directory.
 *
 * **One rule, and it is the only one of the original five that is drift.** The
 * directory gets renamed and the frontmatter does not follow, which is the
 * sentence `BRIEF.md` opens with: a document describing a convention the repo
 * has already changed.
 *
 * The other four went with ticket `14`, and the argument is in `BRIEF.md`
 * § Non-goals rather than anywhere new:
 *
 * > It is not a Markdown linter (it does not check style, formatting or
 * > spelling). It does not judge whether the content is *good*, only whether it
 * > is *true*.
 *
 * A `description` under twenty characters is not false. `allowed_tools` for
 * `allowed-tools` is not false. A `name` in snake_case is not false. They are
 * format and they are quality, and both are named there as things this tool
 * does not do. Measured over 700 repositories before the rules were removed:
 * the three of them produced 23 findings from **five distinct mistakes**, while
 * the rule that stays produced 23 from 23.
 *
 * What is left beside it is not a fifth rule, it is the **precondition** for
 * the first: with no frontmatter, or no `name` in it, there is nothing to
 * compare a directory against. Those say "could not look", not "is malformed".
 *
 * Ticket `06` settled the other division and it still holds: a field whose
 * **type** is wrong is `frontmatter/invalid`'s finding, so the rule here runs
 * on a field whose type is already right.
 */

/** The two fields the format requires. */
const REQUIRED: readonly string[] = ['name', 'description']

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
function skillDirectoryOf(path: string, declared: readonly string[]): string | undefined {
  const parent = path.split('/').slice(0, -1)
  const parentPath = parent.join('/')
  const containers = [...SKILL_CONTAINERS, ...declared]
  // The file sits directly in a container, so there is no directory of its own.
  // `endsWith` on the whole path and not on the name, so a skill legitimately
  // called `skills` (`.claude/skills/skills/SKILL.md`) keeps the rule.
  if (containers.some((c) => parentPath === c || parentPath.endsWith(`/${c}`))) return undefined
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

function checkName(claim: Claim, value: string, declared: readonly string[]): CheckReport | null {
  const directory = skillDirectoryOf(claim.source.path, declared)

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

  // A name that agrees with its directory is this check's business finished.
  // Whether either is well-formed is `skills-ref validate`'s question.
  return null
}

export const skillFrontmatter: Check = {
  id: 'skill/frontmatter',
  title: 'A SKILL.md names itself something other than its directory',
  description:
    'The directory was renamed and the frontmatter did not follow, so the name ' +
    'and the folder disagree. Reported with the frontmatter that is missing ' +
    'outright, or missing a name, because without one there is nothing to ' +
    'compare. Format is not checked: see BRIEF.md, Non-goals.',
  tier: 1,
  defaultSeverity: 'error',
  claimKinds: ['frontmatter'],

  run(claim, ctx) {
    const block = skillFactOf(claim)
    if (block !== undefined) return checkBlock(claim, block)

    // Only a skill has these rules. A subagent and a command have required
    // fields of their own and this check knows nothing about them.
    if (claim.source.kind !== 'skill') return null

    const fact = frontmatterFactOf(claim)
    if (fact?.subject !== 'key') return null

    // Somebody else's key is somebody else's business. The near-miss rule that
    // used to live here went with ticket `14`: `allowed_tools` for
    // `allowed-tools` is a real mistake and it is not a false statement about
    // this repository.
    if (!REQUIRED.includes(fact.key)) return null

    // An empty value is the absence of a value, and it reads the same for both
    // required fields — the same "could not look" as a missing key rather than
    // a judgement about the text. Any other wrong type is
    // `frontmatter/invalid`'s finding.
    if (fact.type === 'empty') return finding(claim, `${fact.key} is empty`)
    if (fact.type !== 'string' || fact.scalar === undefined) return null

    return fact.key === 'name' ? checkName(claim, fact.scalar, ctx.skillRoots) : null
  },
}
