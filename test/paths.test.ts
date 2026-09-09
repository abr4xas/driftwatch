import { describe, expect, it } from 'vitest'
import { looksLikePath } from '../src/extract/paths.ts'
import { discardReason } from '../src/extract/discard.ts'
import { resolveInRepo } from '../src/verify/resolve.ts'

describe('looksLikePath', () => {
  it('acepta lo que tiene barra y extension conocida', () => {
    for (const text of ['src/foo.ts', 'a/b/c.json', 'docs/spec/SPEC.md']) {
      expect(looksLikePath(text), text).toBe(true)
    }
  })

  it('acepta lo que empieza con un marcador de ruta', () => {
    for (const text of ['./scripts/release.sh', '../paquete/src/x', '/src/index.ts']) {
      expect(looksLikePath(text), text).toBe(true)
    }
  })

  it('acepta lo que termina en barra, que es un directorio', () => {
    for (const text of ['test/', 'src/lib/', 'node_modules/']) {
      expect(looksLikePath(text), text).toBe(true)
    }
  })

  it('rechaza una palabra sola, con o sin punto', () => {
    for (const text of ['foo', 'build', 'pnpm', 'index.ts', 'v1.2.3', '']) {
      expect(looksLikePath(text), text).toBe(false)
    }
  })

  it('rechaza una barra con un ultimo segmento sin extension conocida', () => {
    for (const text of ['npm run build', 'foo/bar', 'a/b.desconocido']) {
      expect(looksLikePath(text), text).toBe(false)
    }
  })
})

describe('discardReason', () => {
  it('descarta URLs con protocolo', () => {
    for (const text of ['https://ejemplo.com/a.md', 'http://x/y', 'file:///tmp/a.ts']) {
      expect(discardReason(text), text).toBe('url')
    }
  })

  it('descarta URLs sin protocolo pero con doble barra', () => {
    expect(discardReason('//cdn.ejemplo.com/lib.js')).toBe('url')
  })

  it('no descarta una ruta normal', () => {
    expect(discardReason('src/index.ts')).toBeUndefined()
  })
})

describe('resolveInRepo', () => {
  it('resuelve contra el baseDir de la fuente', () => {
    expect(resolveInRepo('packages/api', 'src/db.ts')).toBe('packages/api/src/db.ts')
    expect(resolveInRepo('', 'src/db.ts')).toBe('src/db.ts')
  })

  it('una barra inicial se lee desde la raiz del repo, no del filesystem', () => {
    expect(resolveInRepo('packages/api', '/src/db.ts')).toBe('src/db.ts')
  })

  it('normaliza ./ y ../', () => {
    expect(resolveInRepo('packages/api', './src/db.ts')).toBe('packages/api/src/db.ts')
    expect(resolveInRepo('packages/api', '../web/app.ts')).toBe('packages/web/app.ts')
  })

  it('quita la barra final de un directorio', () => {
    expect(resolveInRepo('', 'src/lib/')).toBe('src/lib')
  })

  it('devuelve undefined si la ruta se escapa de la raiz', () => {
    expect(resolveInRepo('', '../afuera/x.ts')).toBeUndefined()
    expect(resolveInRepo('packages/api', '../../../x.ts')).toBeUndefined()
  })
})
