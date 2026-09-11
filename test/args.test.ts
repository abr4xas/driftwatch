import { describe, expect, it } from 'vitest'
import { UserError } from '../src/core/errors.ts'
import { parseCliArgs } from '../src/cli/args.ts'

describe('parseCliArgs', () => {
  it('with no arguments it audits the cwd with the defaults', () => {
    const args = parseCliArgs([])
    expect(args.paths).toEqual([])
    expect(args.format).toBe('pretty')
    expect(args.fix).toBe(false)
    expect(args.strict).toBe(false)
    expect(args.help).toBe(false)
    expect(args.version).toBe(false)
  })

  it('accepts positional paths', () => {
    expect(parseCliArgs(['AGENTS.md', 'docs/']).paths).toEqual(['AGENTS.md', 'docs/'])
  })

  it('--json is sugar for --format json', () => {
    expect(parseCliArgs(['--json']).format).toBe('json')
  })

  it('an explicit --format wins over the default', () => {
    expect(parseCliArgs(['--format', 'sarif']).format).toBe('sarif')
  })

  it('rejects an unknown format with UserError', () => {
    expect(() => parseCliArgs(['--format', 'yaml'])).toThrow(UserError)
  })

  it('rejects an unknown flag with UserError', () => {
    expect(() => parseCliArgs(['--turbo'])).toThrow(UserError)
  })

  it('parses the comma-separated lists of --only and --skip', () => {
    const args = parseCliArgs(['--only', 'path,script', '--skip', 'dep/missing'])
    expect(args.only).toEqual(['path', 'script'])
    expect(args.skip).toEqual(['dep/missing'])
  })

  it('drops the empty entries of a badly written list', () => {
    expect(parseCliArgs(['--only', 'path,,']).only).toEqual(['path'])
  })

  it('recognizes the short aliases -h and -v', () => {
    expect(parseCliArgs(['-h']).help).toBe(true)
    expect(parseCliArgs(['-v']).version).toBe(true)
  })

  it('--no-tier2 and --no-config read as booleans', () => {
    const args = parseCliArgs(['--no-tier2', '--no-config'])
    expect(args.tier2).toBe(false)
    expect(args.config).toBe(false)
  })

  it('does not accept flags that are not in SPEC.md § 4', () => {
    // It used to be `--dry-run`, which SPEC § 8 specified and § 4's list did
    // not. Ticket `04` of M3 closed that gap, and the flag became real: this
    // test kept passing for the wrong reason, because a known flag can throw
    // too. Its example has to be a flag nobody plans to add.
    expect(() => parseCliArgs(['--rewrite-everything'])).toThrow(UserError)
  })

  it('--dry-run parses, and only together with --fix', () => {
    expect(parseCliArgs(['--fix', '--dry-run']).dryRun).toBe(true)
    expect(parseCliArgs(['--fix']).dryRun).toBe(false)
    // There is nothing else in the tool a dry run could be dry about.
    expect(() => parseCliArgs(['--dry-run'])).toThrow(UserError)
  })

  it('--config with a path stores the path', () => {
    expect(parseCliArgs(['--config', './dw.config.ts']).config).toBe('./dw.config.ts')
  })

  it('rejects --config and --no-config together, because they contradict', () => {
    expect(() => parseCliArgs(['--config', 'a.ts', '--no-config'])).toThrow(UserError)
  })
})
