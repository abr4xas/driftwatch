/**
 * `--migrate-config`: the way off the formats
 * [ADR-0013](../docs/adr/0013-a-config-is-data-not-a-program.md) withdrew.
 *
 * It is the one place left that imports a config module, and that is the case
 * the ADR says was never the problem: the user's own file, in the user's own
 * repository, executed once because they asked for it by name.
 *
 * The original is **not** deleted. Removing a file the user wrote, as a side
 * effect of a conversion, is a bigger promise than this command needs to make;
 * and the config it just wrote is inert until the old one goes, which is a
 * state the message has to explain rather than the code silently resolve.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'
import { validateConfig } from '../src/core/config.ts'
import { migrateConfig } from '../src/cli/migrate.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

function repo(files: Record<string, string>): string {
  return makeTempRepo({ files })
}

async function failure(root: string): Promise<string> {
  try {
    await migrateConfig(root)
  } catch (error) {
    const user = error as { message: string; hint?: string }
    return `${user.message} ${user.hint ?? ''}`
  }
  throw new Error('expected the migration to fail')
}

describe('migrateConfig', () => {
  it('converts a .ts config to YAML the loader accepts', async () => {
    const root = repo({
      'driftwatch.config.ts': [
        'export default {',
        "  sources: ['docs/**/*.md'],",
        "  checks: { 'path/missing': 'off' },",
        '}',
        '',
      ].join('\n'),
    })

    const result = await migrateConfig(root)
    expect(result.written).toBe('driftwatch.config.yaml')
    expect(result.from).toBe('driftwatch.config.ts')

    const text = readFileSync(join(root, 'driftwatch.config.yaml'), 'utf8')
    // Round-trips through the real validator, not just through YAML: a file
    // this command writes has to be one `loadConfig` would accept.
    expect(validateConfig(parse(text), 'driftwatch.config.yaml')).toEqual({
      sources: ['docs/**/*.md'],
      checks: { 'path/missing': 'off' },
    })
  })

  it('converts a .js config too', async () => {
    const root = repo({
      'driftwatch.config.js': "export default { sources: ['AGENTS.md'] }\n",
    })
    const result = await migrateConfig(root)
    expect(result.from).toBe('driftwatch.config.js')
    expect(parse(readFileSync(join(root, result.written), 'utf8'))).toEqual({
      sources: ['AGENTS.md'],
    })
  })

  it('leaves the original in place', async () => {
    const root = repo({ 'driftwatch.config.ts': 'export default {}\n' })
    await migrateConfig(root)
    expect(existsSync(join(root, 'driftwatch.config.ts'))).toBe(true)
  })

  it('refuses when there is nothing to migrate', async () => {
    const root = repo({ 'driftwatch.config.yaml': 'sources: []\n' })
    expect(await failure(root)).toMatch(/no \.ts or \.js config/u)
  })

  it('refuses rather than overwrite an existing YAML config', async () => {
    // The repo would then hold three configs, and the loader takes the first
    // in its order -- which is the one being migrated away from.
    const root = repo({
      'driftwatch.config.ts': 'export default {}\n',
      'driftwatch.config.yaml': 'sources: []\n',
    })
    expect(await failure(root)).toMatch(/already exists/u)
  })

  it('validates before writing, so an invalid config produces no file', async () => {
    const root = repo({
      'driftwatch.config.ts': "export default { sources: 'not-a-list' }\n",
    })
    await failure(root)
    expect(existsSync(join(root, 'driftwatch.config.yaml'))).toBe(false)
  })

  it('reports a config that cannot be imported without a stack trace', async () => {
    const root = repo({ 'driftwatch.config.ts': 'this is not valid typescript ===\n' })
    const text = await failure(root)
    expect(text).toMatch(/could not be loaded/u)
    expect(text).not.toMatch(/\bat \w+ \(/u)
  })

  it('writes nothing when the module exports no config object', async () => {
    const root = repo({ 'driftwatch.config.ts': 'export default 42\n' })
    await failure(root)
    expect(existsSync(join(root, 'driftwatch.config.yaml'))).toBe(false)
  })
})

describe('migrating a config that imports defineConfig', () => {
  // The shape `docs/guide/usage.md` taught until 2026-09-18, and the one that
  // breaks hardest: `npx` installs nothing in the target repo, so `from
  // 'driftwatch'` cannot resolve — and after ADR-0013 the export is gone even
  // when the package *is* installed. A migrator that cannot read the configs
  // its own documentation produced is not a migration route.
  it('migrates a config importing defineConfig from the package', async () => {
    const root = repo({
      'driftwatch.config.ts': [
        "import { defineConfig } from 'driftwatch'",
        '',
        'export default defineConfig({',
        "  sources: ['docs/**/*.md'],",
        "  checks: { 'path/missing': 'off' },",
        '})',
        '',
      ].join('\n'),
    })

    const result = await migrateConfig(root)
    expect(parse(readFileSync(join(root, result.written), 'utf8'))).toEqual({
      sources: ['docs/**/*.md'],
      checks: { 'path/missing': 'off' },
    })
  })

  it('migrates the scoped package name too', async () => {
    const root = repo({
      'driftwatch.config.ts': [
        "import { defineConfig } from '@abr4xas/driftwatch'",
        "export default defineConfig({ sources: ['AGENTS.md'] })",
        '',
      ].join('\n'),
    })
    const result = await migrateConfig(root)
    expect(parse(readFileSync(join(root, result.written), 'utf8'))).toEqual({
      sources: ['AGENTS.md'],
    })
  })

  it('leaves no temporary file behind', async () => {
    const root = repo({
      'driftwatch.config.ts': [
        "import { defineConfig } from 'driftwatch'",
        'export default defineConfig({})',
        '',
      ].join('\n'),
    })
    await migrateConfig(root)
    const strays = readdirSync(root).filter((name) => name.includes('migrate'))
    expect(strays).toEqual([])
  })

  it('leaves no temporary file behind when the config throws', async () => {
    const root = repo({
      'driftwatch.config.ts': [
        "import { defineConfig } from 'driftwatch'",
        "throw new Error('boom')",
        'export default defineConfig({})',
        '',
      ].join('\n'),
    })
    await failure(root)
    const strays = readdirSync(root).filter((name) => name.includes('migrate'))
    expect(strays).toEqual([])
  })

  it('still resolves the repo’s own relative imports', async () => {
    // The neutralised copy has to sit in the same directory as the original,
    // or a config importing a sibling stops resolving.
    const root = repo({
      'shared.ts': "export const SOURCES = ['AGENTS.md']\n",
      'driftwatch.config.ts': [
        "import { defineConfig } from 'driftwatch'",
        "import { SOURCES } from './shared.ts'",
        'export default defineConfig({ sources: SOURCES })',
        '',
      ].join('\n'),
    })
    const result = await migrateConfig(root)
    expect(parse(readFileSync(join(root, result.written), 'utf8'))).toEqual({
      sources: ['AGENTS.md'],
    })
  })
})
