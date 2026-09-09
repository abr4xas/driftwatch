import { describe, it } from 'vitest'
import { checkFixture } from './helpers/fixture.ts'
import { brokenPaths } from './fixtures/broken-paths.ts'
import { happyPath } from './fixtures/happy-path.ts'

describe('fixtures', () => {
  for (const fixture of [happyPath, brokenPaths]) {
    it(fixture.name, async () => {
      await checkFixture(fixture)
    })
  }
})
