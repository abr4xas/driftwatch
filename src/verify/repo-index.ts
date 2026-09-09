import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, parse, sep } from 'node:path'

/**
 * Directorios que nunca se recorren, con git o sin git. No dependen de
 * `.gitignore` porque un repo puede tener `dist/` commiteado y aun asi no
 * queremos indexar su contenido: son artefactos, no fuentes.
 */
const NEVER_WALK = ['node_modules', 'dist', 'build', '.next', 'vendor', 'target'] as const

export type Manifest = {
  /** Directorio que contiene el package.json, relativo a la raiz. '' es la raiz. */
  dir: string
  name: string | undefined
  scripts: Readonly<Record<string, string>>
}

export type RepoIndex = {
  root: string
  /** Todas las rutas de archivo relativas a la raiz, con separador posix. */
  files: ReadonlySet<string>
  dirs: ReadonlySet<string>
  /** 'auth.ts' -> ['src/auth.ts', 'test/auth.ts']. Alimenta las sugerencias. */
  byBasename: ReadonlyMap<string, readonly string[]>
  /** Lo mismo para directorios: 'router' -> ['src/lib/router']. */
  dirsByBasename: ReadonlyMap<string, readonly string[]>
  manifests: ReadonlyMap<string, Manifest>
  /** Si el listado vino de git o del fallback a glob. Se reporta en --json. */
  listing: 'git' | 'glob'
}

/** El directorio con `.git`, o el punto de partida si no hay repo. */
export function findRepoRoot(from: string): string {
  const { root } = parse(from)
  let dir = from
  while (true) {
    if (existsSync(join(dir, '.git'))) return dir
    if (dir === root) return from
    dir = dirname(dir)
  }
}

function toPosix(path: string): string {
  return sep === '/' ? path : path.split(sep).join('/')
}

function isExcluded(rel: string): boolean {
  const segments = rel.split('/')
  return segments.some((segment) => (NEVER_WALK as readonly string[]).includes(segment))
}

/**
 * `git ls-files` con `--others --exclude-standard` lista lo trackeado mas lo no
 * trackeado que no esta ignorado: exactamente el conjunto de archivos que el
 * repo considera suyos, ya filtrado por `.gitignore`, y mas rapido que caminar
 * el arbol nosotros.
 */
function listWithGit(root: string): string[] | undefined {
  try {
    const stdout = execFileSync(
      'git',
      ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'],
      { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
    )
    return stdout.split('\0').filter((entry) => entry.length > 0)
  } catch {
    // No hay git, no es un repo, o el binario fallo. El llamador usa el glob.
    return undefined
  }
}

/**
 * El camino frio: sin repo hay que caminar el arbol y aplicar `.gitignore` a
 * mano. Las dos dependencias se importan de forma dinamica para que el camino
 * caliente, que en cualquier repo real es git, no pague su carga.
 */
async function listWithGlob(root: string): Promise<string[]> {
  const { glob } = await import('tinyglobby')
  const found = await glob(['**/*'], {
    cwd: root,
    dot: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    ignore: NEVER_WALK.map((dir) => `**/${dir}/**`),
  })
  return applyGitignore(root, found)
}

async function applyGitignore(root: string, paths: readonly string[]): Promise<string[]> {
  let raw: string
  try {
    raw = readFileSync(join(root, '.gitignore'), 'utf8')
  } catch {
    // Sin .gitignore no hay nada que filtrar.
    return [...paths]
  }
  const { default: ignore } = await import('ignore')
  const matcher = ignore().add(raw)
  return paths.filter((path) => !matcher.ignores(path))
}

function readManifest(root: string, dir: string): Manifest | undefined {
  let raw: string
  try {
    raw = readFileSync(join(root, dir, 'package.json'), 'utf8')
  } catch {
    return undefined
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Un package.json roto es problema del proyecto, no nuestro. Se ignora en
    // vez de tumbar la corrida entera por un archivo que no pedimos auditar.
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined
  const record: Record<string, unknown> = parsed as Record<string, unknown>
  const scripts = record.scripts
  return {
    dir,
    name: typeof record.name === 'string' ? record.name : undefined,
    scripts:
      typeof scripts === 'object' && scripts !== null
        ? Object.fromEntries(
            Object.entries(scripts as Record<string, unknown>).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string',
            ),
          )
        : {},
  }
}

/**
 * Se construye una sola vez por corrida. A partir de aca cada verificacion es
 * una consulta en memoria: ni un `fs.stat` en el camino caliente.
 */
export async function buildRepoIndex(root: string): Promise<RepoIndex> {
  const fromGit = listWithGit(root)
  const listing: 'git' | 'glob' = fromGit === undefined ? 'glob' : 'git'
  const raw = fromGit ?? (await listWithGlob(root))

  const files = new Set<string>()
  const dirs = new Set<string>()
  const byBasename = new Map<string, string[]>()
  const dirsByBasename = new Map<string, string[]>()
  const manifests = new Map<string, Manifest>()

  for (const entry of raw) {
    const rel = toPosix(entry)
    if (rel.length === 0 || isExcluded(rel)) continue
    files.add(rel)

    const slash = rel.lastIndexOf('/')
    const basename = slash === -1 ? rel : rel.slice(slash + 1)
    const existing = byBasename.get(basename)
    if (existing === undefined) byBasename.set(basename, [rel])
    else existing.push(rel)

    // Cada prefijo de la ruta es un directorio que existe.
    let cut = slash
    while (cut > 0) {
      const dir = rel.slice(0, cut)
      if (dirs.has(dir)) break
      dirs.add(dir)
      const dirBase = dir.slice(dir.lastIndexOf('/') + 1)
      const sameName = dirsByBasename.get(dirBase)
      if (sameName === undefined) dirsByBasename.set(dirBase, [dir])
      else sameName.push(dir)
      cut = dir.lastIndexOf('/')
    }

    if (basename === 'package.json') {
      const dir = slash === -1 ? '' : rel.slice(0, slash)
      const manifest = readManifest(root, dir)
      if (manifest !== undefined) manifests.set(dir, manifest)
    }
  }

  return { root, files, dirs, byBasename, dirsByBasename, manifests, listing }
}

export function hasFile(index: RepoIndex, rel: string): boolean {
  return index.files.has(rel)
}

export function hasDir(index: RepoIndex, rel: string): boolean {
  return index.dirs.has(rel)
}

export function candidatesFor(index: RepoIndex, basename: string): readonly string[] {
  return index.byBasename.get(basename) ?? []
}

export function dirCandidatesFor(index: RepoIndex, basename: string): readonly string[] {
  return index.dirsByBasename.get(basename) ?? []
}

/**
 * Si alguna ruta del repo **termina** con `rel`, tomando segmentos enteros.
 *
 * Es la respuesta al patron mas comun de los archivos de contexto reales: la
 * prosa nombra un directorio ("dentro de `packages/next`") y despues las rutas
 * se escriben relativas a el (`src/cli/next-dev.ts`). Ni el baseDir de la
 * fuente ni la raiz del repo las resuelven, y no hay senal sintactica que
 * distinga eso de una ruta rota.
 *
 * La busqueda arranca por el ultimo segmento, asi que solo compara contra los
 * homonimos y no recorre el indice.
 */
export function someEntryEndsWith(index: RepoIndex, rel: string): boolean {
  const basename = rel.slice(rel.lastIndexOf('/') + 1)
  const suffix = `/${rel}`
  const matches = (candidate: string): boolean => candidate.endsWith(suffix)
  return (
    (index.byBasename.get(basename) ?? []).some(matches) ||
    (index.dirsByBasename.get(basename) ?? []).some(matches)
  )
}

/** El manifiesto mas cercano subiendo desde `dir`. Es lo que hace andar monorepos. */
export function manifestFor(index: RepoIndex, dir: string): Manifest | undefined {
  let current = dir
  while (true) {
    const found = index.manifests.get(current)
    if (found !== undefined) return found
    if (current === '') return undefined
    const slash = current.lastIndexOf('/')
    current = slash === -1 ? '' : current.slice(0, slash)
  }
}
