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
  it('walks up to the directory holding .git', async () => {
    const root = makeTempRepo({ files: { 'packages/api/src/db.ts': '' } })
    expect(findRepoRoot(`${root}/packages/api/src`)).toBe(root)
  })

  it('with no repo it returns the cwd as is', async () => {
    const root = makeTempRepo({ files: { 'a.ts': '' }, git: false })
    expect(findRepoRoot(root)).toBe(root)
  })
})

describe('buildRepoIndex', () => {
  it('indexes files and directories with relative paths and posix separators', async () => {
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

  it('respects .gitignore when there is a repo', async () => {
    const root = makeTempRepo({
      files: { '.gitignore': 'secret.txt\n', 'secret.txt': '', 'visible.txt': '' },
    })
    const index = await buildRepoIndex(root)
    expect(hasFile(index, 'visible.txt')).toBe(true)
    expect(hasFile(index, 'secret.txt')).toBe(false)
  })

  it('respects .gitignore in the no-git fallback too', async () => {
    const root = makeTempRepo({
      files: { '.gitignore': 'secret.txt\n', 'secret.txt': '', 'visible.txt': '' },
      git: false,
    })
    const index = await buildRepoIndex(root)
    expect(hasFile(index, 'visible.txt')).toBe(true)
    expect(hasFile(index, 'secret.txt')).toBe(false)
  })

  it('never walks into the build directories, with or without git', async () => {
    const files = {
      'node_modules/package/index.js': '',
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

  it('byBasename groups the namesakes to feed the suggestions', async () => {
    const root = makeTempRepo({
      files: { 'src/auth.ts': '', 'test/auth.ts': '', 'src/only.ts': '' },
    })
    const index = await buildRepoIndex(root)
    expect([...candidatesFor(index, 'auth.ts')].toSorted()).toEqual(['src/auth.ts', 'test/auth.ts'])
    expect(candidatesFor(index, 'only.ts')).toEqual(['src/only.ts'])
    expect(candidatesFor(index, 'does-not-exist.ts')).toEqual([])
  })
})

describe('manifestFor', () => {
  it('resolves the nearest package.json upwards', async () => {
    const root = makeTempRepo({
      files: {
        'package.json': JSON.stringify({ name: 'root', scripts: { build: 'tsdown' } }),
        'packages/api/package.json': JSON.stringify({ name: 'api', scripts: { dev: 'node .' } }),
        'packages/api/src/db.ts': '',
        'packages/web/src/app.ts': '',
      },
    })
    const index = await buildRepoIndex(root)
    expect(manifestFor(index, 'packages/api/src')?.name).toBe('api')
    expect(manifestFor(index, 'packages/web/src')?.name).toBe('root')
    expect(manifestFor(index, '')?.name).toBe('root')
  })

  it('an unreadable package.json does not break the index', async () => {
    const root = makeTempRepo({ files: { 'package.json': '{ this is not json' } })
    const index = await buildRepoIndex(root)
    expect(manifestFor(index, '')).toBeUndefined()
  })

  it('with no package.json anywhere it returns undefined', async () => {
    const index = await buildRepoIndex(makeTempRepo({ files: { 'a.ts': '' } }))
    expect(manifestFor(index, '')).toBeUndefined()
  })
})
