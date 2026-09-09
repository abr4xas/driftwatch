import { describe, expect, it } from 'vitest'
import {
  buildRepoIndex,
  candidatesFor,
  findRepoRoot,
  hasDir,
  hasFile,
  manifestFor,
} from '../src/verify/repo-index.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

describe('findRepoRoot', () => {
  it('sube hasta el directorio con .git', async () => {
    const root = makeTempRepo({ files: { 'packages/api/src/db.ts': '' } })
    expect(findRepoRoot(`${root}/packages/api/src`)).toBe(root)
  })

  it('sin repo devuelve el cwd tal cual', async () => {
    const root = makeTempRepo({ files: { 'a.ts': '' }, git: false })
    expect(findRepoRoot(root)).toBe(root)
  })
})

describe('buildRepoIndex', () => {
  it('indexa archivos y directorios con rutas relativas y separador posix', async () => {
    const root = makeTempRepo({
      files: { 'src/auth/index.ts': '', 'README.md': '' },
    })
    const index = await buildRepoIndex(root)
    expect(hasFile(index, 'src/auth/index.ts')).toBe(true)
    expect(hasFile(index, 'README.md')).toBe(true)
    expect(hasDir(index, 'src')).toBe(true)
    expect(hasDir(index, 'src/auth')).toBe(true)
    expect(hasFile(index, 'src')).toBe(false)
    expect(hasDir(index, 'src/auth/index.ts')).toBe(false)
  })

  it('respeta .gitignore cuando hay repo', async () => {
    const root = makeTempRepo({
      files: { '.gitignore': 'secreto.txt\n', 'secreto.txt': '', 'visible.txt': '' },
    })
    const index = await buildRepoIndex(root)
    expect(hasFile(index, 'visible.txt')).toBe(true)
    expect(hasFile(index, 'secreto.txt')).toBe(false)
  })

  it('respeta .gitignore tambien en el fallback sin git', async () => {
    const root = makeTempRepo({
      files: { '.gitignore': 'secreto.txt\n', 'secreto.txt': '', 'visible.txt': '' },
      git: false,
    })
    const index = await buildRepoIndex(root)
    expect(hasFile(index, 'visible.txt')).toBe(true)
    expect(hasFile(index, 'secreto.txt')).toBe(false)
  })

  it('nunca entra a los directorios de build, con git o sin git', async () => {
    const files = {
      'node_modules/paquete/index.js': '',
      'dist/cli.js': '',
      'build/out.js': '',
      '.next/server.js': '',
      'vendor/lib.php': '',
      'target/debug/bin': '',
      'src/real.ts': '',
    }
    for (const git of [true, false]) {
      const index = await buildRepoIndex(makeTempRepo({ files, git }))
      expect(hasFile(index, 'src/real.ts'), `git=${git}`).toBe(true)
      for (const excluded of Object.keys(files).filter((f) => f !== 'src/real.ts')) {
        expect(hasFile(index, excluded), `git=${git} ${excluded}`).toBe(false)
      }
    }
  })

  it('byBasename agrupa los homonimos para alimentar las sugerencias', async () => {
    const root = makeTempRepo({
      files: { 'src/auth.ts': '', 'test/auth.ts': '', 'src/solo.ts': '' },
    })
    const index = await buildRepoIndex(root)
    expect([...candidatesFor(index, 'auth.ts')].toSorted()).toEqual(['src/auth.ts', 'test/auth.ts'])
    expect(candidatesFor(index, 'solo.ts')).toEqual(['src/solo.ts'])
    expect(candidatesFor(index, 'no-existe.ts')).toEqual([])
  })
})

describe('manifestFor', () => {
  it('resuelve el package.json mas cercano hacia arriba', async () => {
    const root = makeTempRepo({
      files: {
        'package.json': JSON.stringify({ name: 'raiz', scripts: { build: 'tsdown' } }),
        'packages/api/package.json': JSON.stringify({ name: 'api', scripts: { dev: 'node .' } }),
        'packages/api/src/db.ts': '',
        'packages/web/src/app.ts': '',
      },
    })
    const index = await buildRepoIndex(root)
    expect(manifestFor(index, 'packages/api/src')?.name).toBe('api')
    expect(manifestFor(index, 'packages/web/src')?.name).toBe('raiz')
    expect(manifestFor(index, '')?.name).toBe('raiz')
  })

  it('un package.json ilegible no rompe el indice', async () => {
    const root = makeTempRepo({ files: { 'package.json': '{ esto no es json' } })
    const index = await buildRepoIndex(root)
    expect(manifestFor(index, '')).toBeUndefined()
  })

  it('sin package.json en ningun lado devuelve undefined', async () => {
    const index = await buildRepoIndex(makeTempRepo({ files: { 'a.ts': '' } }))
    expect(manifestFor(index, '')).toBeUndefined()
  })
})
