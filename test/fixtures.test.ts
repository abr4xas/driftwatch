import { describe, it } from 'vitest'
import { checkFixture } from './helpers/fixture.ts'
import { brokenPaths } from './fixtures/broken-paths.ts'
import { falsePositiveTraps } from './fixtures/false-positive-traps.ts'
import { happyPath } from './fixtures/happy-path.ts'
import { linksYFrontmatter } from './fixtures/links-y-frontmatter.ts'
import { suggestions } from './fixtures/suggestions.ts'

describe('fixtures', () => {
  for (const fixture of [
    happyPath,
    brokenPaths,
    falsePositiveTraps,
    suggestions,
    linksYFrontmatter,
  ]) {
    it(fixture.name, async () => {
      await checkFixture(fixture)
    })
  }
})
