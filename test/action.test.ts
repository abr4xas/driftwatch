import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'

/**
 * There is no unit test for a YAML file, so these are the three things that
 * stand in for one. The CI job that actually runs the action is the real test;
 * what is here are the properties a green job would not notice.
 */

type Step = {
  id?: string
  uses?: string
  run?: string
  shell?: string
  'working-directory'?: string
  env?: Record<string, string>
}

type Action = {
  inputs: Record<string, { description: string; default?: string }>
  outputs: Record<string, { description: string; value: string }>
  runs: { using: string; steps: Step[] }
}

const SOURCE = readFileSync(resolve(import.meta.dirname, '../action.yml'), 'utf8')
const ACTION = parse(SOURCE) as Action

describe('action.yml', () => {
  it('is a composite action with steps', () => {
    expect(ACTION.runs.using).toBe('composite')
    expect(ACTION.runs.steps.length).toBeGreaterThan(0)
  })

  it('reads every input it declares', () => {
    // `inputs.sarif` is read by an `if:` and carries no `}}`, and a bare
    // `includes` would let `sarif` match `sarif-file`.
    const unread = Object.keys(ACTION.inputs).filter(
      (name) => !new RegExp(String.raw`inputs\.${name}(?![\w-])`, 'u').test(SOURCE),
    )
    // An input nobody reads is a documented lie: it shows up in the marketplace
    // listing, somebody sets it, and nothing happens.
    expect(unread).toEqual([])
  })

  it('never interpolates an input inside a run block', () => {
    const offenders = ACTION.runs.steps
      .filter((step) => step.run !== undefined && /\$\{\{\s*inputs\./u.test(step.run))
      .map((step) => step.id ?? step.run?.slice(0, 40))
    // The one rule in the file that is not about taste. An input interpolated
    // into a shell script is a shell injection in an action anybody can call,
    // so every value reaches bash through `env:` and is quoted there.
    expect(offenders).toEqual([])
  })

  it('names a real step in every output', () => {
    const ids = new Set(ACTION.runs.steps.map((step) => step.id).filter(Boolean))
    for (const output of Object.values(ACTION.outputs)) {
      const referenced = /steps\.([\w-]+)\./u.exec(output.value)?.[1]
      expect(ids.has(referenced)).toBe(true)
    }
  })

  it('gives every run step an explicit shell', () => {
    // A composite action without `shell` fails at call time, not at push time,
    // and the message names the step rather than the mistake.
    for (const step of ACTION.runs.steps) {
      if (step.run !== undefined) expect(step.shell).toBe('bash')
    }
  })
})
