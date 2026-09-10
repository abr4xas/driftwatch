import type { Fixture } from '../helpers/fixture.ts'
import { anchors } from './anchors.ts'
import { brokenPaths } from './broken-paths.ts'
import { configuredSources } from './configured-sources.ts'
import { falsePositiveTraps } from './false-positive-traps.ts'
import { frontmatter } from './frontmatter.ts'
import { happyPath } from './happy-path.ts'
import { ignores } from './ignores.ts'
import { linksAndFrontmatter } from './links-and-frontmatter.ts'
import { monorepo } from './monorepo.ts'
import { noGit } from './no-git.ts'
import { suggestions } from './suggestions.ts'

/**
 * Every scenario. The list is maintained by hand, but a test compares it
 * against the files in the directory: a new fixture someone forgets to register
 * here fails the suite instead of silently never running, which is what
 * happened once.
 */
export const ALL_FIXTURES: readonly Fixture[] = [
  happyPath,
  brokenPaths,
  falsePositiveTraps,
  suggestions,
  linksAndFrontmatter,
  monorepo,
  noGit,
  configuredSources,
  ignores,
  anchors,
  frontmatter,
]
