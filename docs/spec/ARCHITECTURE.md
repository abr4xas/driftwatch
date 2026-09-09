# driftwatch — Arquitectura

## Principio ordenador

El pipeline es lineal y cada etapa tiene una frontera de datos angosta:

```
discover  →  parse  →  extract  →  verify  →  report
 Source[]    Doc[]     Claim[]    Finding[]   stdout
```

Ninguna etapa conoce a la siguiente. Un check nuevo es un archivo nuevo en `extract/` y/o `verify/`, sin tocar el resto. Un formato de salida nuevo es un archivo en `report/`.

El CLI queda fuera del pipeline: `cli/` traduce argumentos a una configuración y una configuración a un exit code, y no sabe nada de checks. El pipeline no importa nada de `cli/`.

Esto importa para el proyecto en sí: la mayor parte del trabajo futuro es *agregar checks*, y esa operación tiene que costar un archivo.

---

## Estructura de directorios

```
src/
  cli.ts               entrypoint del bin  (único que toca process)
  index.ts             API pública: run(), defineConfig, tipos
  run.ts               el pipeline completo; devuelve findings, no salida
  cli/
    main.ts            el cuerpo del CLI; recibe el entorno, devuelve el exit code
    args.ts            parseo de flags sobre node:util parseArgs
    help.ts            el texto de --help, que es el contrato de SPEC.md § 4
  core/
    types.ts           Source, Claim, Finding, Verdict, Config
    errors.ts          UserError y los helpers de normalización de excepciones
    exit-codes.ts      los tres exit codes y cómo se derivan de un recuento
    version.ts         lee la versión del package.json más cercano
    discover.ts        encuentra fuentes, respeta .gitignore
    config.ts          carga y valida config, mergea con defaults
    ignores.ts         parsea directivas <!-- driftwatch-ignore -->
  parse/
    markdown.ts        mdast + posiciones, extrae inline code / links / code fences
    positions.ts       offset absoluto -> línea y columna 1-indexadas
    frontmatter.ts     YAML del bloque inicial
  extract/
    paths.ts           Claim[] de tipo path
    discard.ts         las reglas de descarte del extractor de rutas
    scripts.ts         Claim[] de tipo script (npm/pnpm/make/deno)
    deps.ts            Claim[] de tipo dependency
    symbols.ts         Claim[] de tipo symbol
    links.ts           Claim[] de tipo link
  verify/
    repo-index.ts      índice del repo en memoria (el corazón)
    check.ts           la forma de un check y su contexto
    resolve.ts         texto de una claim -> ruta relativa a la raíz
    manifest.ts        lee package.json / Makefile / pyproject / go.mod / Cargo
    git.ts             churn por archivo, último commit de una fuente
    checks/
      path-missing.ts
      script-missing.ts
      skill-frontmatter.ts
      link-broken.ts
      dep-missing.ts
      symbol-missing.ts
      stale-churn.ts
      command-unknown.ts
  fix/
    apply.ts           aplica ediciones por rango, preserva formato
    suggest.ts         candidatos + scoring de confianza
  report/
    colors.ts          decide si hay color (NO_COLOR, tty) una sola vez
    pretty.ts
    json.ts
    github.ts
    sarif.ts
test/
  fixtures/            repos sintéticos completos por escenario
  corpus/              repos reales clonados (gitignored, ver §Corpus)
```

---

## Modelo de datos

```ts
type Source = {
  path: string            // relativo a root
  absPath: string
  kind: 'claude-md' | 'agents-md' | 'skill' | 'subagent' | 'command' | 'cursor-rule' | 'copilot'
  content: string
  baseDir: string         // directorio contra el que se resuelven rutas relativas
}

type Claim = {
  kind: 'path' | 'script' | 'dep' | 'symbol' | 'link' | 'frontmatter'
  source: Source
  text: string            // el fragmento exacto afirmado
  range: { line: number; column: number; endLine: number; endColumn: number }
  offset: [number, number]  // offsets absolutos en content, para --fix
  context: 'inline-code' | 'code-fence' | 'link' | 'frontmatter' | 'prose'
  meta?: Record<string, unknown>   // ej. { manager: 'pnpm' } para scripts
}

type Finding = {
  check: string           // 'path/missing'
  severity: 'error' | 'warning'
  claim: Claim
  message: string
  suggestion?: { value: string; confidence: number; fixable: boolean }
}
```

`offset` es lo que hace posible `--fix` sin reformatear: se reemplaza exactamente ese rango de bytes.

---

## El índice del repo

`verify/repo-index.ts` es la pieza de la que depende el presupuesto de performance. Se construye **una vez** por ejecución:

```ts
type RepoIndex = {
  files: Set<string>                    // todas las rutas relativas
  dirs: Set<string>
  byBasename: Map<string, string[]>     // 'auth.ts' → ['src/auth.ts', 'test/auth.ts']
  manifests: Map<string, Manifest>      // dir → package.json parseado (monorepo)
}
```

Decisiones:
- Un solo recorrido del árbol con `fast-glob` o `tinyglobby`, honrando `.gitignore`.
- Si hay git disponible, usar `git ls-files` — es más rápido y ya respeta ignores. Fallback a glob si no hay repo.
- `byBasename` es lo que alimenta las sugerencias de `--fix`. Es un `Map` de arrays, no una búsqueda difusa: la búsqueda difusa solo se corre sobre los candidatos de ese basename, nunca sobre todo el índice.
- Todo en memoria. En un repo de 100k archivos son unos pocos MB; aceptable.

Las verificaciones son entonces `O(1)` por claim. Ninguna llamada a `fs.stat` en el camino caliente.

---

## Parseo de Markdown

Usar **mdast** (`remark-parse` + `unist-util-visit`), no regex sobre el texto crudo.

La razón no es purismo: es que necesitamos saber **en qué contexto** aparece cada fragmento. `` `src/foo.ts` `` dentro de un bloque de código de ejemplo, dentro de una cita, o dentro de una tabla tiene distinto peso. Con regex esa distinción se pierde y aparecen los falsos positivos que matan el proyecto.

mdast da `node.position` con line/column/offset, que mapea directo al `range` y `offset` de `Claim`.

Del árbol nos interesan cuatro tipos de nodo:
- `inlineCode` → fuente principal de claims de path, script, dep, symbol
- `code` (fences) → claims de script y command; se ignora si `lang` es un lenguaje que no es shell
- `link` → claims de link
- `yaml` (frontmatter) → claims de frontmatter

La prosa cruda (`text`) **no** se escanea por defecto, con una excepción: `dep/missing` la mira buscando verbos de uso. Escanear prosa en general es la fuente número uno de ruido.

---

## Extracción de rutas: el detalle que define la calidad

Este es el algoritmo con más matiz del proyecto. Orden de las reglas:

1. Descartar si parsea como URL con protocolo.
2. Descartar si contiene caracteres de glob o placeholder: `* ? { } < > $ [ ]`.
3. Descartar si es una sola palabra sin `/` y sin extensión conocida (`foo` no es una ruta, `foo.ts` sí, `src/foo` sí).
4. Descartar extensiones no-archivo comunes que confunden: `1.0`, `v2.1`, `node.js` cuando no hay `/` (lista negra de palabras: `node.js`, `next.js`, `nuxt.js`, `vue.js`, `d.ts` suelto).
5. Normalizar: quitar `./` inicial, quitar `:línea` final, quitar backticks residuales, quitar puntuación final (`.`, `,`, `)`).
6. Resolver contra `source.baseDir`.
7. Consultar `index.files` y `index.dirs`.

Si falla, generar sugerencia: buscar `basename` en `index.byBasename`. Confianza = 1.0 si hay un único candidato y el directorio padre es similar; 0.6 si hay un único candidato con directorio distinto; 0.3 si hay varios.

**Cada regla de descarte debe tener un caso en `test/fixtures/`.** Es el contrato contra la regresión de falsos positivos.

---

## Stack

| Decisión | Elección | Por qué |
|---|---|---|
| Lenguaje | TypeScript, ESM puro | Es lo que el ecosistema objetivo usa |
| Runtime mínimo | Node 24 | LTS con `node:` builtins estables |
| Build | `tsdown` o `unbuild` | Salida ESM + tipos, sin ceremonia |
| Args | parseo propio sobre `node:util parseArgs` | Un CLI de 12 flags no justifica una dependencia |
| Markdown | `remark-parse` + `unist-util-visit` | Posiciones exactas |
| Frontmatter | `yaml` | Parser correcto; no regex |
| Glob | `tinyglobby` | Rápido, chico; solo si no hay git |
| Colores | `picocolors` | 2 kB, respeta `NO_COLOR` |
| Config | `jiti` o import dinámico | Para cargar `.ts` config; **lazy**, solo si hay config |
| Tests | `vitest` | Estándar del ecosistema |

**Restricción dura:** el camino de `npx driftwatch` sin config no puede cargar más de ~6 dependencias. El arranque en frío es parte del producto.

---

## Testing

Tres niveles, en orden de importancia:

### 1. Fixtures (el grueso)
`test/fixtures/<escenario>.ts` **declara** un mini-repo completo: el mapa de archivos (`CLAUDE.md`, `package.json`, algunos archivos fuente) y los findings esperados. Un helper lo materializa en un directorio temporal, corre el pipeline y compara.

Los archivos se declaran como datos en vez de vivir commiteados como `CLAUDE.md` de verdad por una razón concreta: si vivieran en el árbol, driftwatch corrido sobre su propio repo los descubriría como fuentes y reportaría las rutas que están rotas a propósito. Un fixture tiene que poder mentir sin contaminar al repo que lo contiene.

Escenarios mínimos:
- `happy-path` — todo correcto, cero findings
- `broken-paths` — rutas rotas con y sin sugerencia
- `monorepo` — CLAUDE.md anidados, resolución relativa, package.json múltiples
- `skills` — frontmatter válido e inválido
- `false-positive-traps` — el más importante: URLs, globs, placeholders, versiones, `node.js`, rutas en bloques de ejemplo, texto entre comillas. **Expected: cero findings.**
- `ignores` — directivas en línea funcionando
- `no-git` — repo sin `.git`, fallback a glob

### 2. Corpus de repos reales
Un script `scripts/corpus.ts` clona una lista de repos públicos con `CLAUDE.md`/`AGENTS.md` reales, corre driftwatch y **guarda el output como snapshot**. No se afirma que sea correcto — se afirma que no cambia sin intención. Cada cambio en el snapshot se revisa a mano.

Es la única forma de medir falsos positivos en la práctica.

### 3. Unit
Solo para el extractor de rutas y el scoring de sugerencias. El resto se cubre por fixtures.

---

## Extensibilidad (post-v1)

Un check es un módulo con esta forma:

```ts
export const check: Check = {
  id: 'path/missing',
  tier: 1,
  defaultSeverity: 'error',
  claimKinds: ['path'],
  run(claim, ctx): Finding | null { /* ... */ },
}
```

`ctx` expone `index`, `manifests`, `git`, `config`. Registro estático en `verify/checks/index.ts` — sin carga dinámica de plugins en v1. Los plugins de terceros son una decisión de v2 y no deben condicionar el diseño ahora.
