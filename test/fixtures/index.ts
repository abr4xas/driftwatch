import type { Fixture } from '../helpers/fixture.ts'
import { brokenPaths } from './broken-paths.ts'
import { falsePositiveTraps } from './false-positive-traps.ts'
import { happyPath } from './happy-path.ts'
import { linksYFrontmatter } from './links-y-frontmatter.ts'
import { monorepo } from './monorepo.ts'
import { noGit } from './no-git.ts'
import { suggestions } from './suggestions.ts'

/**
 * Todos los escenarios. La lista se mantiene a mano, pero hay un test que la
 * compara contra los archivos del directorio: un fixture nuevo que se olvide
 * de registrar acá hace fallar la suite en vez de quedar sin correr en
 * silencio, que es lo que pasó una vez.
 */
export const ALL_FIXTURES: readonly Fixture[] = [
  happyPath,
  brokenPaths,
  falsePositiveTraps,
  suggestions,
  linksYFrontmatter,
  monorepo,
  noGit,
]
