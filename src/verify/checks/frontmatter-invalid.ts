import { frontmatterFactOf } from '../../extract/frontmatter.ts'
import type { FrontmatterType } from '../../parse/frontmatter.ts'
import type { SourceKind } from '../../core/types.ts'
import type { Check } from '../check.ts'

/**
 * `SPEC.md` § 3: frontmatter YAML that does not parse, or fields with the
 * wrong type.
 *
 * Those are two checks wearing one id, and they carry very different risk. The
 * first is a fact: the block either is YAML or it is not, and a parser we did
 * not write says which. The second needs a **schema**, and a schema we get
 * wrong reports a field every real consumer accepts — so the table below only
 * holds keys whose type the format fixes, and everything else in a block is
 * the author's business.
 */

/** The types a key may hold. Anything else is a finding. */
type AcceptedTypes = readonly FrontmatterType[]

const STRING: AcceptedTypes = ['string']
/** Both spellings are documented for the tool lists, and both are common. */
const STRING_OR_LIST: AcceptedTypes = ['string', 'list']
const BOOLEAN: AcceptedTypes = ['boolean']

/**
 * The curated table, by source kind.
 *
 * `claude-md`, `agents-md`, `copilot` and `configured` are **absent on
 * purpose**: no format defines a frontmatter for a `CLAUDE.md`, so whatever is
 * in one belongs to whoever put it there and its type is not ours to judge.
 * The parse half still covers them — invalid YAML is invalid whoever wrote it.
 *
 * `argument-hint` is absent for a different reason: `argument-hint:
 * [issue-number]` parses as a list, and writing the placeholder in brackets is
 * the established idiom. Claiming it would report a convention.
 */
const SCHEMAS: Readonly<Partial<Record<SourceKind, Readonly<Record<string, AcceptedTypes>>>>> = {
  skill: {
    name: STRING,
    description: STRING,
    'allowed-tools': STRING_OR_LIST,
  },
  subagent: {
    name: STRING,
    description: STRING,
    model: STRING,
    tools: STRING_OR_LIST,
  },
  command: {
    description: STRING,
    model: STRING,
    'allowed-tools': STRING_OR_LIST,
    'disable-model-invocation': BOOLEAN,
  },
  'cursor-rule': {
    description: STRING,
    globs: STRING_OR_LIST,
    alwaysApply: BOOLEAN,
  },
}

/**
 * Words a YAML 1.1 parser reads as booleans and `yaml` — which implements 1.2
 * core — reads as strings. Half the ecosystem still loads frontmatter with a
 * 1.1 parser, and we cannot tell which one the author had in mind, so a
 * boolean field accepts them. The permissive direction is the only one that
 * cannot report a file that works.
 */
const BOOLEAN_WORDS = new Set(['true', 'false', 'yes', 'no', 'on', 'off'])

/** How each type is named in a message. Exhaustive, so a new type breaks here. */
const TYPE_NAMES: Readonly<Record<FrontmatterType, string>> = {
  string: 'a string',
  number: 'a number',
  boolean: 'a boolean',
  list: 'a list',
  mapping: 'a mapping',
  empty: 'nothing',
}

function expectation(accepted: AcceptedTypes): string {
  return accepted.map((type) => TYPE_NAMES[type]).join(' or ')
}

export const frontmatterInvalid: Check = {
  id: 'frontmatter/invalid',
  tier: 1,
  defaultSeverity: 'error',
  claimKinds: ['frontmatter'],

  run(claim) {
    const fact = frontmatterFactOf(claim)
    if (fact === undefined) return null

    if (fact.problem === 'parse') {
      return {
        check: frontmatterInvalid.id,
        severity: frontmatterInvalid.defaultSeverity,
        claim,
        // The parser's own reason. `Map keys must be unique` and `Tabs are not
        // allowed as indentation` say more than any rewording of ours, and a
        // duplicate key is real drift: one of the two values is lost silently.
        message: `invalid YAML: ${fact.reason}`,
      }
    }

    const accepted = SCHEMAS[claim.source.kind]?.[fact.key]
    if (accepted === undefined) return null
    if (accepted.includes(fact.type)) return null
    if (
      accepted.includes('boolean') &&
      fact.scalar !== undefined &&
      BOOLEAN_WORDS.has(fact.scalar.toLowerCase())
    ) {
      return null
    }

    return {
      check: frontmatterInvalid.id,
      severity: frontmatterInvalid.defaultSeverity,
      claim,
      message: `expected ${expectation(accepted)}, found ${TYPE_NAMES[fact.type]}`,
      // No suggestion, and never fixable. Quoting somebody's value is an edit
      // `--fix` (M3) decides on with the corpus in hand, not here.
    }
  },
}
