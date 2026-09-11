import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { EXTRACTORS } from '../src/extract/index.ts'
import { CHECKS } from '../src/verify/checks/index.ts'

/**
 * Both registries promise the same thing, which ARCHITECTURE.md § Ordering
 * principle states as "a new check is a new file, without touching the rest":
 * the file exists and the registry lists it. The failure mode is silent — a
 * module nobody registered never runs, and every fixture still passes — which
 * is the reason `test/fixtures.test.ts` already guards its own list.
 */
function exportsOf(dir: string, pattern: RegExp): string[] {
  const base = new URL(`../src/${dir}/`, import.meta.url)
  const names: string[] = []
  for (const file of readdirSync(base)) {
    if (!file.endsWith('.ts') || file === 'index.ts' || file === 'context.ts') continue
    const source = readFileSync(new URL(file, base), 'utf8')
    for (const match of source.matchAll(pattern)) {
      const name = match[1]
      if (name !== undefined) names.push(name)
    }
  }
  return names.toSorted()
}

describe('the static registries', () => {
  it('every extractor in extract/ is registered', () => {
    const onDisk = exportsOf('extract', /^export function (extract\w+Claims)\(/gmu)
    expect(EXTRACTORS).toHaveLength(onDisk.length)
    expect(EXTRACTORS.map((extract) => extract.name).toSorted()).toEqual(onDisk)
  })

  it('every check in verify/checks/ is registered', () => {
    const onDisk = readdirSync(new URL('../src/verify/checks/', import.meta.url)).filter(
      (name) => name.endsWith('.ts') && name !== 'index.ts',
    )
    expect(CHECKS).toHaveLength(onDisk.length)
    expect(new Set(CHECKS.map((check) => check.id)).size).toBe(CHECKS.length)
  })
})
