# driftwatch — Especificación funcional

Todo lo que sigue describe **comportamiento observable**. La implementación está en `ARCHITECTURE.md`.

---

## 1. Modelo conceptual

driftwatch opera sobre tres conceptos:

**Fuente (`Source`)** — un archivo de contexto de agente. Es lo que se audita.

**Afirmación (`Claim`)** — un fragmento de una fuente que asegura algo verificable sobre el repo. Ejemplo: el texto `` `src/lib/auth.ts` `` en la línea 12 afirma que ese archivo existe.

**Veredicto (`Verdict`)** — el resultado de verificar una afirmación: `ok`, `broken`, `suspect` o `skipped`.

El trabajo de la herramienta es: descubrir fuentes → extraer afirmaciones → verificarlas → reportar.

---

## 2. Descubrimiento de fuentes

Por defecto, desde la raíz del repo (el directorio con `.git`, o el cwd si no hay):

| Patrón | Tipo |
|---|---|
| `CLAUDE.md`, `CLAUDE.local.md` (en cualquier directorio) | `claude-md` |
| `AGENTS.md` (en cualquier directorio) | `agents-md` |
| `.claude/skills/**/SKILL.md` | `skill` |
| `.claude/agents/*.md` | `subagent` |
| `.claude/commands/**/*.md` | `command` |
| `.cursor/rules/**/*.mdc`, `.cursorrules` | `cursor-rule` |
| `.github/copilot-instructions.md` | `copilot` |

Reglas:
- Se respeta `.gitignore`. Nunca se entra a `node_modules`, `dist`, `build`, `.next`, `vendor`, `target`.
- Los archivos anidados se resuelven **relativos a su propio directorio**. Un `packages/api/CLAUDE.md` que menciona `src/db.ts` se refiere a `packages/api/src/db.ts`.
- Argumentos posicionales limitan el alcance: `driftwatch CLAUDE.md .claude/skills` audita solo eso.

---

## 3. Checks

Cada check tiene un **id estable** (usado en config e ignores) y un **nivel de confianza** que determina si emite error o aviso.

### Tier 1 — Alta confianza (emiten `error`)

Extraen afirmaciones sintácticamente inequívocas. Deben tener falsos positivos ~0.

#### `path/missing`
Una ruta que no existe en el repo.

Se extrae de: código inline (`` `src/foo.ts` ``), links relativos de Markdown (`[x](./docs/y.md)`), y valores de frontmatter que sean rutas.

Se considera ruta si cumple **alguna**:
- Contiene `/` y un segmento final con extensión conocida.
- Empieza con `./`, `../` o `/` y contiene `/`.
- Termina en `/` (directorio).

Se **descarta** si: es una URL, contiene glob (`*`, `?`, `{`), contiene un placeholder (`<...>`, `{{...}}`, `$VAR`, `[nombre]`), o es una ruta absoluta fuera del repo.

Cuando falla, se busca un candidato por nombre de basename en el repo y se sugiere: `→ src/auth/index.ts?`. Si hay exactamente un candidato, es autofixable.

#### `script/missing`
Un comando de gestor de paquetes cuyo script no existe.

Detecta `npm run X`, `pnpm run X`, `pnpm X`, `yarn X`, `bun run X`, `deno task X`, `make X` en bloques de código y en código inline. Verifica contra `package.json#scripts` (el más cercano en el árbol, para monorepos), `Makefile`, o `deno.json#tasks`.

Si el script no existe pero hay uno con nombre parecido (distancia de edición ≤ 2), se sugiere y es autofixable.

#### `skill/frontmatter`
Problemas estructurales en el frontmatter de un `SKILL.md`:
- Falta `name` o `description`.
- `name` no coincide con el nombre del directorio contenedor.
- `name` no es kebab-case.
- `description` vacía o de menos de 20 caracteres (una descripción pobre hace que la skill nunca se invoque).
- Claves desconocidas en el frontmatter.

#### `link/broken`
Un link relativo de Markdown a un archivo que no existe, o a un ancla (`#seccion`) que no existe en el archivo destino.

#### `frontmatter/invalid`
YAML de frontmatter que no parsea, o campos con el tipo equivocado.

### Tier 2 — Confianza media (emiten `warning`)

Requieren inferencia. Se activan por defecto pero son degradables a `off` en config.

#### `dep/missing`
El texto nombra una tecnología que no está en el manifiesto del proyecto.

Solo dispara con nombres de un **diccionario curado** de dependencias populares (`prisma`, `drizzle`, `tailwind`, `vitest`, `jest`, `playwright`, `zod`, `trpc`, …), y solo cuando el nombre aparece con un verbo de uso cerca (`usamos`, `we use`, `built with`, `powered by`) o en código inline. Verifica contra `package.json` (todas las secciones de deps), `requirements.txt`, `pyproject.toml`, `go.mod`, `Cargo.toml`.

Nunca dispara por una mención suelta en prosa sin marca de uso. Este check es el de mayor riesgo de falso positivo: ante la duda, no reportar.

#### `symbol/missing`
Un identificador referenciado como `` `funcionX()` `` o `` `ClaseY` `` que no aparece exportado en ningún archivo fuente.

Solo se aplica a identificadores en código inline con forma de símbolo (camelCase con paréntesis, o PascalCase). Búsqueda textual sobre archivos fuente, no análisis semántico. Si aparece en *cualquier* lugar del código, se considera `ok`.

#### `stale/churn`
La fuente no se ha modificado desde hace N commits mientras que los archivos que menciona cambiaron mucho.

Heurística: si un archivo mencionado tiene ≥ `staleThreshold` commits (default 15) posteriores al último commit que tocó la fuente, se avisa. Es una señal de "revisá esto", no una afirmación de error. Requiere git; se salta silenciosamente si no hay repo.

#### `command/unknown`
Un comando de shell en un bloque de código cuyo binario no está en `PATH` ni en `node_modules/.bin` ni es un builtin conocido.

Solo la primera palabra de la línea. Lista blanca amplia de builtins POSIX. Se salta bloques marcados con un lenguaje que no sea shell.

---

## 4. Interfaz de línea de comandos

```
driftwatch [paths...] [opciones]

Opciones
  --fix                  Aplica las correcciones inequívocas
  --json                 Salida JSON en stdout (ver §6)
  --format <fmt>         pretty | json | github | sarif   (default: pretty)
  --only <ids>           Solo estos checks (coma-separados, acepta prefijo: --only path)
  --skip <ids>           Excluye estos checks
  --strict               Los warnings cuentan como errores para el exit code
  --no-tier2             Desactiva todos los checks de tier 2
  --config <ruta>        Ruta explícita al config
  --no-config            Ignora cualquier config encontrado
  --quiet                Solo muestra problemas, sin resumen
  --watch                Re-ejecuta al cambiar cualquier fuente
  --init                 Escribe un driftwatch.config.ts comentado
  --version, -v
  --help, -h
```

Sin argumentos: audita todo el repo con la configuración por defecto.

### Exit codes

| Code | Significado |
|---|---|
| `0` | Sin errores (puede haber warnings, salvo `--strict`) |
| `1` | Se encontró al menos un error |
| `2` | Fallo de la propia herramienta (config inválido, ruta inexistente, crash) |

Con `--fix`, el exit code refleja lo que **queda** después de corregir.

---

## 5. Salida `pretty`

```
CLAUDE.md
  ✗ 12  src/lib/auth.ts                  ruta no existe  → src/auth/index.ts?
  ✗ 34  pnpm run test:e2e                script no existe en package.json
  ⚠ 51  "usamos Prisma para el ORM"      no está en dependencies

2 archivos · 5 problemas (4 errores, 1 aviso) · 340ms
```

Reglas de formato:
- Agrupado por archivo, ordenado por línea.
- `file:line` debe ser clickeable en terminales modernas (formato `archivo:línea:columna` en la ruta del encabezado cuando `--no-group`).
- Colores: rojo para error, amarillo para warning, dim para sugerencias. Se desactivan si `NO_COLOR` está seteado o si stdout no es TTY.
- El fragmento citado se trunca a 40 caracteres con `…`.
- Si no hay problemas: `✓ 14 archivos · sin drift · 210ms`.
- Sin emojis. Símbolos `✗ ⚠ ✓` solamente.
- Cuando hay autofixes disponibles, cerrar con: `3 corregibles con --fix`.

### Formato `github`
Emite `::error file=X,line=Y::mensaje` para anotaciones nativas en GitHub Actions.

### Formato `sarif`
SARIF 2.1.0 para subir a GitHub Code Scanning.

---

## 6. Salida JSON

Contrato estable. Cambios rompientes solo en major.

```jsonc
{
  "version": 1,
  "root": "/abs/path/to/repo",
  "durationMs": 340,
  "summary": { "sources": 14, "claims": 212, "errors": 4, "warnings": 1, "fixable": 3 },
  "findings": [
    {
      "check": "path/missing",
      "severity": "error",
      "file": "CLAUDE.md",
      "line": 12,
      "column": 4,
      "endColumn": 19,
      "text": "src/lib/auth.ts",
      "message": "ruta no existe",
      "suggestion": { "value": "src/auth/index.ts", "confidence": 0.86, "fixable": true }
    }
  ]
}
```

`file` siempre relativo a `root`. `line` y `column` son 1-indexados.

---

## 7. Configuración

Opcional. Se busca `driftwatch.config.ts`, `.js`, `.json`, o la clave `driftwatch` en `package.json`.

```ts
import { defineConfig } from 'driftwatch'

export default defineConfig({
  // Fuentes adicionales más allá de las descubiertas por defecto
  sources: ['docs/agent-notes.md'],

  // Excluir del descubrimiento
  ignore: ['**/fixtures/**'],

  // Ajustar severidad por check: 'error' | 'warning' | 'off'
  checks: {
    'dep/missing': 'off',
    'stale/churn': 'warning',
    'symbol/missing': 'error',
  },

  // Alias para rutas que existen pero no en disco (ej. rutas de build)
  knownPaths: ['dist/**', '.next/**'],

  staleThreshold: 15,
})
```

### Ignores en línea

Dentro de cualquier fuente Markdown:

```markdown
<!-- driftwatch-ignore-next-line -->
`src/planned/feature.ts` todavía no existe, es el plan

<!-- driftwatch-ignore path/missing -->
<!-- driftwatch-ignore-file -->
```

Un ignore sin id aplica a todos los checks de esa línea. Con id, solo a ese check.

---

## 8. Comportamiento de `--fix`

Solo se aplica cuando la corrección es **inequívoca**: existe exactamente un candidato y su confianza supera 0.8.

Autofixable:
- `path/missing` con un único candidato por basename.
- `script/missing` con un único script a distancia de edición ≤ 2.
- `skill/frontmatter`: `name` que no coincide con el directorio (se corrige al del directorio).
- `link/broken` con un único destino candidato.

Nunca autofixable: cualquier check de tier 2, y cualquier caso con más de un candidato.

Reglas:
- Preserva el formato original del archivo. Solo reemplaza el rango exacto de la afirmación.
- Imprime un diff resumido de lo aplicado.
- Con `--fix --dry-run`, muestra el diff sin escribir.
- Si el working tree tiene cambios sin commitear en un archivo a modificar, avisa pero procede (no es una herramienta de git).

---

## 9. Rendimiento

Presupuesto, medido en un repo de 5.000 archivos con 20 fuentes:

| Fase | Budget |
|---|---|
| Descubrimiento + índice del repo | < 200 ms |
| Parseo de fuentes | < 50 ms |
| Verificación (todos los checks tier 1) | < 100 ms |
| **Total end-to-end** | **< 500 ms** |

El arranque en frío del CLI (require + parse de args) debe estar bajo 80 ms. Esto excluye dependencias pesadas en el camino principal: nada de `typescript`, `ts-morph`, ni `esbuild` cargados eagerly.
