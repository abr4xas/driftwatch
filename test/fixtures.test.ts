import { describe, it } from 'vitest'
import { checkFixture } from './helpers/fixture.ts'
import { brokenPaths } from './fixtures/broken-paths.ts'
import { falsePositiveTraps } from './fixtures/false-positive-traps.ts'
import { happyPath } from './fixtures/happy-path.ts'

describe('fixtures', () => {
  for (const fixture of [happyPath, brokenPaths, falsePositiveTraps]) {
    it(fixture.name, async () => {
      await checkFixture(fixture)
    })
  }
})
