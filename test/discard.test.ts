import { describe, expect, it } from 'vitest'
import { discardReason, normalizePathText } from '../src/extract/discard.ts'
import { evaluatePathText } from '../src/extract/paths.ts'

/**
 * Una regla por bloque, en el orden de ARCHITECTURE.md. Cada caso de aca tiene
 * su gemelo en el fixture `false-positive-traps`: los unit tests fijan la regla,
 * el fixture fija el resultado observable.
 */
describe('regla 1: URLs', () => {
  it.each([
    'https://ejemplo.com/docs/guia.md',
    'http://cdn.ejemplo.com/lib/app.js',
    'file:///tmp/salida/reporte.json',
    'ftp://host/archivo.txt',
    '//cdn.ejemplo.com/x.js',
  ])('descarta %s', (text) => {
    expect(discardReason(text)).toBe('url')
  })
})

describe('regla 2: globs y placeholders', () => {
  it.each([
    'src/**/*.test.ts',
    'test/fixtures/*.json',
    '.scratch/<feature>/issues/',
    '{{ruta}}/plantilla.md',
    '$HOME/.config/app.json',
    'packages/[nombre]/src',
    'docs/pagina?.md',
  ])('descarta %s', (text) => {
    expect(discardReason(text)).toBe('glob-o-placeholder')
  })
})

describe('regla 3: palabras sueltas', () => {
  it.each(['index.ts', 'tsconfig.json', 'pnpm', 'build', 'README.md'])(
    'descarta %s, porque no fija una ubicacion (ADR-0003)',
    (text) => {
      expect(discardReason(text)).toBe('palabra-suelta')
    },
  )

  it('no descarta algo que si tiene barra', () => {
    expect(discardReason('src/index.ts')).toBeUndefined()
  })
})

describe('regla 4: parece archivo y no lo es', () => {
  it.each(['node.js', 'next.js', 'vue.js', 'nuxt.js', 'd.ts', '1.0', 'v2.1.3'])(
    'descarta %s',
    (text) => {
      expect(discardReason(text)).not.toBeUndefined()
    },
  )

  it('descarta el nombre de tecnologia incluso con barra delante', () => {
    expect(discardReason('runtime/node.js')).toBe('no-es-un-archivo')
  })

  it('no descarta un archivo real con nombre parecido', () => {
    expect(discardReason('src/node.ts')).toBeUndefined()
  })
})

describe('regla 5: normalizacion', () => {
  it('quita el ./ inicial', () => {
    expect(normalizePathText('./src/index.ts')).toBe('src/index.ts')
  })

  it('quita una referencia a linea, y a linea y columna', () => {
    expect(normalizePathText('src/index.ts:12')).toBe('src/index.ts')
    expect(normalizePathText('src/index.ts:12:4')).toBe('src/index.ts')
  })

  it('quita backticks residuales', () => {
    expect(normalizePathText('`src/index.ts`')).toBe('src/index.ts')
  })

  it('quita la puntuacion final, que es de la oracion y no de la ruta', () => {
    expect(normalizePathText('src/index.ts.')).toBe('src/index.ts')
    expect(normalizePathText('src/index.ts,')).toBe('src/index.ts')
    expect(normalizePathText('(src/index.ts)')).toBe('(src/index.ts')
  })

  it('no toca una ruta que ya esta limpia', () => {
    expect(normalizePathText('src/index.ts')).toBe('src/index.ts')
    expect(normalizePathText('src/lib/')).toBe('src/lib/')
  })
})

describe('evaluatePathText', () => {
  it('devuelve la ruta normalizada cuando sobrevive a todo', () => {
    expect(evaluatePathText('./src/index.ts:12')).toEqual({
      kind: 'path',
      text: 'src/index.ts',
    })
  })

  it('descarta lo que despues de normalizar ya no tiene forma de ruta', () => {
    expect(evaluatePathText('a/b:1')).toEqual({ kind: 'discarded', reason: 'sin-forma-de-ruta' })
  })

  it('el orden importa: una URL se descarta antes de normalizarse', () => {
    expect(evaluatePathText('https://x.com/a.md.')).toEqual({ kind: 'discarded', reason: 'url' })
  })
})
