import {
  chmodSync,
  lstatSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { replaceFile } from '../src/fix/atomic.ts'

function scratch(): string {
  return mkdtempSync(join(tmpdir(), 'driftwatch-atomic-'))
}

describe('replaceFile', () => {
  it('replaces the content and leaves no temporary file behind', async () => {
    const dir = scratch()
    const path = join(dir, 'AGENTS.md')
    writeFileSync(path, 'old\n')
    await replaceFile(path, 'new\n')
    expect(readFileSync(path, 'utf8')).toBe('new\n')
    expect(readdirSync(dir)).toEqual(['AGENTS.md'])
  })

  it('writes through a symlink instead of replacing the link with a file', async () => {
    const dir = scratch()
    writeFileSync(join(dir, 'AGENTS.md'), 'old\n')
    symlinkSync('AGENTS.md', join(dir, 'CLAUDE.md'))
    await replaceFile(join(dir, 'CLAUDE.md'), 'new\n')
    expect(lstatSync(join(dir, 'CLAUDE.md')).isSymbolicLink()).toBe(true)
    expect(readFileSync(join(dir, 'AGENTS.md'), 'utf8')).toBe('new\n')
  })

  it('keeps the mode the file had', async () => {
    const dir = scratch()
    const path = join(dir, 'run.md')
    writeFileSync(path, 'old\n')
    chmodSync(path, 0o755)
    await replaceFile(path, 'new\n')
    expect(statSync(path).mode & 0o777).toBe(0o755)
  })
})
