import { describe, expect, it } from 'vitest'
import { parentSimilarity, suggestPath } from '../src/fix/suggest.ts'
import { buildRepoIndex } from '../src/verify/repo-index.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

describe('parentSimilarity', () => {
  it('dos directorios iguales son identicos', () => {
    expect(parentSimilarity('src/lib', 'src/lib')).toBe(1)
    expect(parentSimilarity('', '')).toBe(1)
  })

  it('mide segmentos compartidos sobre el directorio mas corto', () => {
    expect(parentSimilarity('src/lib', 'src/auth')).toBe(0.5)
    expect(parentSimilarity('src', 'src/auth')).toBe(1)
    expect(parentSimilarity('a/b/c', 'x/y/z')).toBe(0)
  })

  it('la raiz no se parece a ningun subdirectorio', () => {
    expect(parentSimilarity('', 'src')).toBe(0)
    expect(parentSimilarity('src', '')).toBe(0)
  })
})

async function indexWith(files: Record<string, string>) {
  return buildRepoIndex(makeTempRepo({ files }))
}

describe('suggestPath', () => {
  it('sin homonimos no sugiere nada', async () => {
    const index = await indexWith({ 'src/otro.ts': '' })
    expect(suggestPath(index, 'src/auth.ts')).toBeUndefined()
  })

  it('un candidato unico en un directorio parecido da confianza 1 y es corregible', async () => {
    const index = await indexWith({ 'src/auth/auth.ts': '' })
    expect(suggestPath(index, 'src/lib/auth.ts')).toEqual({
      value: 'src/auth/auth.ts',
      confidence: 1,
      fixable: true,
    })
  })

  it('un candidato unico en un directorio distinto da 0.6 y no es corregible', async () => {
    const index = await indexWith({ 'paquetes/interno/auth.ts': '' })
    expect(suggestPath(index, 'src/lib/auth.ts')).toEqual({
      value: 'paquetes/interno/auth.ts',
      confidence: 0.6,
      fixable: false,
    })
  })

  it('varios homonimos dan 0.3 y nunca son corregibles', async () => {
    const index = await indexWith({ 'src/auth.ts': '', 'test/auth.ts': '' })
    const suggestion = suggestPath(index, 'src/lib/auth.ts')
    expect(suggestion?.confidence).toBe(0.3)
    expect(suggestion?.fixable).toBe(false)
  })

  it('con varios homonimos propone el del directorio mas parecido', async () => {
    const index = await indexWith({ 'src/auth.ts': '', 'vendor/legacy/auth.ts': '' })
    expect(suggestPath(index, 'src/lib/auth.ts')?.value).toBe('src/auth.ts')
  })

  it('con empate de parecido elige el primero por orden alfabetico, para ser estable', async () => {
    const index = await indexWith({ 'b/x/auth.ts': '', 'a/y/auth.ts': '' })
    expect(suggestPath(index, 'z/auth.ts')?.value).toBe('a/y/auth.ts')
  })

  it('sugiere para un directorio, no solo para un archivo', async () => {
    const index = await indexWith({ 'src/imagenes/logo.png': '' })
    expect(suggestPath(index, 'public/imagenes')).toBeUndefined()
  })
})
