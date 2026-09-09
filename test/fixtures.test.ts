import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ALL_FIXTURES } from './fixtures/index.ts'
import { checkFixture } from './helpers/fixture.ts'

describe('fixtures', () => {
  it('el registro incluye todos los archivos de fixture del directorio', () => {
    const onDisk = readdirSync(new URL('./fixtures/', import.meta.url))
      .filter((name) => name.endsWith('.ts') && name !== 'index.ts')
      .toSorted()
    expect(ALL_FIXTURES).toHaveLength(onDisk.length)
    expect(new Set(ALL_FIXTURES.map((f) => f.name)).size).toBe(ALL_FIXTURES.length)
  })

  for (const fixture of ALL_FIXTURES) {
    it(fixture.name, async () => {
      await checkFixture(fixture)
    })
  }
})
