import { describe, expect, it } from 'vitest'
import { classifySource, discoverSources } from '../src/core/discover.ts'
import { buildRepoIndex } from '../src/verify/repo-index.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

describe('classifySource', () => {
  it('reconoce los siete patrones de SPEC.md § 2', () => {
    expect(classifySource('CLAUDE.md')).toBe('claude-md')
    expect(classifySource('packages/api/CLAUDE.local.md')).toBe('claude-md')
    expect(classifySource('AGENTS.md')).toBe('agents-md')
    expect(classifySource('.claude/skills/deploy/SKILL.md')).toBe('skill')
    expect(classifySource('.claude/agents/reviewer.md')).toBe('subagent')
    expect(classifySource('.claude/commands/ship/release.md')).toBe('command')
    expect(classifySource('.cursor/rules/estilo.mdc')).toBe('cursor-rule')
    expect(classifySource('.cursorrules')).toBe('cursor-rule')
    expect(classifySource('.github/copilot-instructions.md')).toBe('copilot')
  })

  it('reconoce los patrones anclados tambien anidados en un monorepo', () => {
    expect(classifySource('packages/api/.claude/skills/build/SKILL.md')).toBe('skill')
    expect(classifySource('apps/web/.github/copilot-instructions.md')).toBe('copilot')
  })

  it('no clasifica markdown que no es una fuente de contexto', () => {
    for (const rel of [
      'README.md',
      'docs/spec/SPEC.md',
      '.claude/skills/deploy/referencia.md',
      '.claude/agents/anidado/demasiado.md',
      '.cursor/rules/notas.md',
      'CLAUDE.md.bak',
      'src/CLAUDE.ts',
    ]) {
      expect(classifySource(rel), rel).toBeUndefined()
    }
  })
})

describe('discoverSources', () => {
  const files = {
    'CLAUDE.md': '# raiz\n',
    'packages/api/CLAUDE.md': '# api\n',
    '.claude/skills/deploy/SKILL.md': '---\nname: deploy\n---\n',
    'README.md': '# no es fuente\n',
    '.gitignore': 'ignorado/\n',
    'ignorado/CLAUDE.md': '# no deberia aparecer\n',
  }

  it('encuentra las fuentes y saltea lo que no lo es', async () => {
    const root = makeTempRepo({ files })
    const sources = await discoverSources(await buildRepoIndex(root), { paths: [] })
    expect(sources.map((s) => s.path)).toEqual([
      '.claude/skills/deploy/SKILL.md',
      'CLAUDE.md',
      'packages/api/CLAUDE.md',
    ])
  })

  it('respeta .gitignore', async () => {
    const root = makeTempRepo({ files })
    const sources = await discoverSources(await buildRepoIndex(root), { paths: [] })
    expect(sources.some((s) => s.path.startsWith('ignorado/'))).toBe(false)
  })

  it('cada fuente lleva su propio baseDir, que es su directorio', async () => {
    const root = makeTempRepo({ files })
    const sources = await discoverSources(await buildRepoIndex(root), { paths: [] })
    const byPath = new Map(sources.map((s) => [s.path, s]))
    expect(byPath.get('CLAUDE.md')?.baseDir).toBe('')
    expect(byPath.get('packages/api/CLAUDE.md')?.baseDir).toBe('packages/api')
    expect(byPath.get('.claude/skills/deploy/SKILL.md')?.baseDir).toBe('.claude/skills/deploy')
  })

  it('lee el contenido de cada fuente', async () => {
    const root = makeTempRepo({ files })
    const sources = await discoverSources(await buildRepoIndex(root), { paths: [] })
    expect(sources.find((s) => s.path === 'CLAUDE.md')?.content).toBe('# raiz\n')
  })

  it('un argumento posicional que es directorio limita el alcance', async () => {
    const root = makeTempRepo({ files })
    const sources = await discoverSources(await buildRepoIndex(root), { paths: ['packages'] })
    expect(sources.map((s) => s.path)).toEqual(['packages/api/CLAUDE.md'])
  })

  it('un argumento posicional que es archivo audita solo ese archivo', async () => {
    const root = makeTempRepo({ files })
    const sources = await discoverSources(await buildRepoIndex(root), { paths: ['CLAUDE.md'] })
    expect(sources.map((s) => s.path)).toEqual(['CLAUDE.md'])
  })

  it('un posicional que no contiene fuentes no devuelve nada, sin error', async () => {
    const root = makeTempRepo({ files })
    const sources = await discoverSources(await buildRepoIndex(root), { paths: ['README.md'] })
    expect(sources).toEqual([])
  })

  it('un prefijo de directorio no matchea un nombre de directorio parcial', async () => {
    const root = makeTempRepo({
      files: { 'pack/CLAUDE.md': '#\n', 'packages/api/CLAUDE.md': '#\n' },
    })
    const sources = await discoverSources(await buildRepoIndex(root), { paths: ['pack'] })
    expect(sources.map((s) => s.path)).toEqual(['pack/CLAUDE.md'])
  })
})
