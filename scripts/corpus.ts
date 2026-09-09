/**
 * El corpus de repos reales.
 *
 * Un fixture verde no prueba nada sobre falsos positivos: lo escribimos
 * nosotros, con las trampas que ya sabemos que existen. El corpus corre la
 * herramienta sobre archivos de contexto que escribieron otras personas, sin
 * saber que driftwatch existe, y guarda la salida como snapshot.
 *
 * El snapshot **no afirma ser correcto**. Afirma no cambiar sin intencion. Cada
 * diff se revisa a mano, y esa revision es la unica senal real de regresion de
 * precision que tiene el proyecto.
 *
 * Uso:
 *   pnpm corpus                    clona lo que falte y reescribe los snapshots
 *   pnpm corpus --check            falla si algun snapshot difiere del guardado
 *   pnpm corpus --only <patron>    solo los repos que matcheen el patron
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { run } from '../src/run.ts'

type CorpusRepo = {
  repo: string
  /**
   * Conjunto de validacion. Estos repos se agregaron **despues** de ajustar las
   * heuristicas, y no se miraron para derivar ninguna regla. Su tasa de falsos
   * positivos es la unica estimacion honesta de precision fuera de muestra: el
   * numero del grupo de calibracion esta contaminado por haber sido el material
   * con el que se escribieron las reglas.
   *
   * Condicion 9 de ADR-0006: si se **inspeccionan** los findings o los descartes
   * de un repo de este grupo, ese repo pasa a calibracion y hay que sumar otro
   * nuevo aca. Clasificar sus findings es la medicion y no contamina; abrir el
   * repo a ver que descarto la herramienta, si.
   */
  holdout?: boolean
  /**
   * Commit fijo. Sin pinnear, el snapshot cambiaria cada vez que el repo de
   * arriba se mueve, y el diff dejaria de significar "cambio driftwatch".
   */
  sha: string
}

/**
 * Repos publicos con `AGENTS.md` o `CLAUDE.md` reales, verificados a mano.
 *
 * Son 34: 26 de calibracion y 8 de validacion, que es lo que pide la condicion
 * 8 de ADR-0006.
 *
 * Clonarlos todos cuesta ~2.7 GB, asi que la lista se mantiene deliberadamente
 * corta y los agregados nuevos se eligen chicos. `oven-sh/bun` y
 * `supabase/supabase` tienen archivos de contexto buenos pero suman ~1.5 GB
 * entre los dos, y no hacen falta. Si se agregan, conviene avisar del tamano
 * antes de arrancar la descarga.
 *
 * Con `--only <patron>` se corre un subconjunto sin volver a clonar el resto.
 */
const CORPUS: readonly CorpusRepo[] = [
  { repo: 'openai/codex', sha: '73a1148c9c775c2a4616ce5096291740a00ed68a' },
  { repo: 'sst/opencode', sha: '830d5eb5354874105cc31599635a80c1662609e8' },
  { repo: 'cloudflare/workers-sdk', sha: 'a549e58af707e84d6aeddaadc6566103ae236dbb' },
  { repo: 'vercel/next.js', sha: '59b76e42ba93e5323484283ee5d1b81176c83d2d' },
  { repo: 'withastro/astro', sha: 'de5cc2d54e92d8746959e39fee1a8f0b4ddfe4bf' },
  { repo: 'browserbase/stagehand', sha: '9f4f878e99ac82cd35480a7dd841dfe3dbb78093' },
  { repo: 'calcom/cal.com', sha: 'b3321936c347744a759e0f36a9793bb78c9bca78' },
  { repo: 'prisma/prisma', sha: 'a51922e3252a2a9d94a00d11b9f9e9008f5ddf74' },
  { repo: 'BerriAI/litellm', sha: '47b15ffb677902fc4550a4471b82e09f77ec77d7' },
  { repo: 'langchain-ai/langchain', sha: 'f092c9a78b3c532ef4c01935c0d4514209ff9f96' },
  { repo: 'remix-run/react-router', sha: 'a05ad5bbda1759d0adfbde13fd17eaca4c86db42' },
  { repo: 'modelcontextprotocol/servers', sha: 'd73f99efbfd40c3aa1b61e88728b3d49fb52608f' },
  { repo: 'block/goose', sha: 'e84de9fe08eb27cd42eca022c2bf59e13baed39e' },

  // Fueron validacion en la primera ronda. Sus dos findings se revisaron y de
  // ahi salio la regla de placeholders en mayusculas, asi que pasaron a ser
  // material de calibracion: ya no pueden medir precision fuera de muestra.
  { repo: 'microsoft/playwright-mcp', sha: '8a13ef8e9f7385a0f89477922127f31cbfde9761' },
  { repo: 'anthropics/anthropic-sdk-typescript', sha: 'ba14b1f4fdf2e840a7b32297965342a099f6201d' },
  { repo: 'github/spec-kit', sha: '4dd2402ea6d644ee655b78213a1f6d679fc88b0b' },
  { repo: 'unjs/nitro', sha: '3b8980bb824e8552053426243a4755a71a44b377' },
  { repo: 'colinhacks/zod', sha: '36f17960d1defca5d0896d9424f4e1059fbbf081' },

  // Fueron validacion en la segunda ronda. De uno de sus findings salio la
  // regla de nombres de relleno posesivos y la de instrucciones de crear, asi
  // que tambien pasaron a calibracion.
  { repo: 'charmbracelet/crush', sha: 'aee8760458b9b7eaeb58655aee150e3ffef21cd0' },
  { repo: 'tursodatabase/turso', sha: '85e234697d687d4482b693483ac13fb6c93ae99d' },
  { repo: 'sveltejs/svelte', sha: 'ce89035ecbf88ee131838527d29584b968d450fb' },

  // Fueron validacion en la cuarta ronda. Se inspeccionaron sus descartes para
  // entender por que el grupo salia mudo, y de ahi salio la correccion de la
  // ventana de prosa. Por la condicion 9 de ADR-0006 eso los contamina:
  // inspeccionar es contaminar, aunque el cambio que sale sea a favor de
  // reportar mas y no de reportar menos.
  { repo: 'jina-ai/reader', sha: '1574bfd380d249c86c82db4dace0d9c8fe17e2b1' },
  { repo: 'simonw/llm', sha: '1df47ddcac20d58726a993949da8ef84f4081085' },
  { repo: 'cyanheads/git-mcp-server', sha: 'd34d83af201dc0c9012ca501336c3df6171da932' },
  { repo: 'unjs/h3', sha: 'aa50e96a4a3da1732aa54542c498b37e0f8e3508' },

  // Fue validacion en la quinta ronda. Su unico finding,
  // `test_action_EventNameHere.py`, era un placeholder en CamelCase, y de ahi
  // salio la regla PLACEHOLDER_CAMEL. Por la condicion 9, pasa a calibracion.
  //
  // La medicion que produjo, 3 verdaderos sobre 4 findings = 75%, queda como la
  // ultima medicion valida de precision fuera de muestra. No se reemplaza por el
  // numero que daria ahora: seria una medicion tomada sobre la misma muestra que
  // decidio el arreglo.
  { repo: 'browser-use/browser-use', sha: '2b1f9d377999a59fe7627c1a5aa88c12aa42e11f' },

  // --- Validacion: nunca inspeccionados ---
  // Ocho repos, que es lo que pide la condicion 8 de ADR-0006. Se eligen chicos
  // a proposito, porque el corpus completo ya pesa ~2.7 GB de clones, y se
  // clonan solo cuando hace falta medir: `pnpm corpus --only <patron>`.
  { repo: 'vitest-dev/vitest', sha: 'c119be016295b45a005e2a36367ea7d133b4f385', holdout: true },
  {
    repo: 'rust-lang/rust-analyzer',
    sha: 'f3120321073d8046795c6824976be8b0ae92c999',
    holdout: true,
  },
  { repo: 'nuxt/nuxt', sha: '03e9df01a1256d214ac5c5c14514f95803ecb244', holdout: true },
  { repo: 'openai/openai-node', sha: 'b4168065d3839b3008d557fdbb8972da2e247f24', holdout: true },
  {
    repo: 'modelcontextprotocol/typescript-sdk',
    sha: '5119ee7fd7790e335a3fb60ef36f85334e2a6326',
    holdout: true,
  },
  {
    repo: 'modelcontextprotocol/python-sdk',
    sha: '9972c21aa42054fb1450c5fc614761ed11847ec6',
    holdout: true,
  },
  { repo: 'openai/openai-python', sha: 'f348ec87b934c98889102668913e0a3ae7fc303d', holdout: true },
  { repo: 'railwayapp/cli', sha: 'dee356855b6a88ed52cb3fac42956da7a9200474', holdout: true },
]

const HERE = dirname(fileURLToPath(import.meta.url))
const CORPUS_DIR = join(HERE, '..', 'test', 'corpus')
const REPOS_DIR = join(CORPUS_DIR, 'repos')
const SNAPSHOTS_DIR = join(CORPUS_DIR, 'snapshots')

function slugOf(repo: string): string {
  return repo.replace('/', '__')
}

function git(args: readonly string[], cwd?: string): void {
  execFileSync('git', [...args], {
    cwd,
    stdio: ['ignore', 'ignore', 'inherit'],
    timeout: 10 * 60 * 1000,
  })
}

/**
 * Clona superficial y se para en el commit fijado. Si el directorio ya esta y
 * apunta al sha correcto, no se toca: el corpus se clona una vez y despues es
 * cache local.
 */
function ensureClone({ repo, sha }: CorpusRepo): string {
  const dir = join(REPOS_DIR, slugOf(repo))

  if (existsSync(join(dir, '.git'))) {
    const head = execFileSync('git', ['-C', dir, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
    }).trim()
    if (head === sha) return dir
    // El pin cambio: se rehace, porque un clon superficial no puede navegar.
    rmSync(dir, { recursive: true, force: true })
  }

  mkdirSync(dirname(dir), { recursive: true })
  git(['init', '-q', dir])
  git(['remote', 'add', 'origin', `https://github.com/${repo}.git`], dir)
  git(['fetch', '-q', '--depth', '1', 'origin', sha], dir)
  git(['checkout', '-q', 'FETCH_HEAD'], dir)
  return dir
}

/** Rendering estable y diffeable de una corrida. */
async function snapshotOf(repo: string, dir: string): Promise<string> {
  const result = await run({ cwd: dir, paths: [] })
  const lines: string[] = [
    `# ${repo}`,
    '',
    `fuentes: ${result.sources.length}`,
    `errores: ${result.counts.errors}`,
    `avisos: ${result.counts.warnings}`,
    `corregibles: ${result.fixable}`,
    '',
    '## fuentes',
    ...result.sources.map((source) => `${source.kind}  ${source.path}`),
    '',
    '## findings',
  ]

  if (result.findings.length === 0) {
    lines.push('(ninguno)')
  } else {
    for (const finding of result.findings) {
      const { source, range, text, context } = finding.claim
      const suggestion =
        finding.suggestion === undefined
          ? ''
          : `  -> ${finding.suggestion.value} (${finding.suggestion.confidence}${
              finding.suggestion.fixable ? ', corregible' : ''
            })`
      lines.push(
        `${source.path}:${range.line}:${range.column}  [${finding.check}] ${context}  ${text}${suggestion}`,
      )
    }
  }

  // El tiempo no entra al snapshot: cambia en cada corrida y no dice nada
  // sobre precision.
  return `${lines.join('\n')}\n`
}

/** `--only <patron>`: corre solo los repos cuyo nombre contiene el patron. */
function onlyPattern(argv: readonly string[]): string | undefined {
  const at = argv.indexOf('--only')
  return at === -1 ? undefined : argv[at + 1]
}

async function main(): Promise<number> {
  const check = process.argv.includes('--check')
  const only = onlyPattern(process.argv)
  mkdirSync(SNAPSHOTS_DIR, { recursive: true })

  let differing = 0
  let totalFindings = 0
  let totalSources = 0
  let holdoutFindings = 0

  for (const entry of CORPUS) {
    // Con --only se saltean los demas sin tocar su snapshot, para poder sumar
    // un repo nuevo sin volver a clonar los gigabytes de todo el corpus.
    if (only !== undefined && !entry.repo.includes(only)) continue
    process.stderr.write(`${entry.repo}${entry.holdout === true ? ' [validacion]' : ''} ... `)
    let dir: string
    try {
      dir = ensureClone(entry)
    } catch {
      process.stderr.write('no se pudo clonar, se saltea\n')
      continue
    }

    const snapshot = await snapshotOf(entry.repo, dir)
    const path = join(SNAPSHOTS_DIR, `${slugOf(entry.repo)}.txt`)

    const findings = snapshot.split('\n## findings\n')[1] ?? ''
    const n = findings.trim() === '(ninguno)' ? 0 : findings.trim().split('\n').length
    totalFindings += n
    if (entry.holdout === true) holdoutFindings += n
    totalSources += Number(/fuentes: (\d+)/u.exec(snapshot)?.[1] ?? 0)

    if (check) {
      const previous = existsSync(path) ? readFileSync(path, 'utf8') : ''
      if (previous !== snapshot) {
        differing += 1
        process.stderr.write('CAMBIO\n')
      } else {
        process.stderr.write(`ok (${n})\n`)
      }
      continue
    }

    writeFileSync(path, snapshot, 'utf8')
    process.stderr.write(`${n} findings\n`)
  }

  const snapshotCount = existsSync(SNAPSHOTS_DIR)
    ? readdirSync(SNAPSHOTS_DIR).filter((name) => name.endsWith('.txt')).length
    : 0

  process.stderr.write(
    `\n${snapshotCount} repos · ${totalSources} fuentes · ${totalFindings} findings\n` +
      `  calibracion: ${totalFindings - holdoutFindings} · validacion: ${holdoutFindings}\n`,
  )

  if (check && differing > 0) {
    process.stderr.write(
      `\n${differing} snapshot(s) cambiaron. Revisa el diff a mano antes de aceptarlo:\n` +
        `ese diff es la unica senal real de regresion de precision.\n`,
    )
    return 1
  }
  return 0
}

process.exit(await main())
