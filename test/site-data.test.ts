/**
 * The page's numbers are the corpus's numbers.
 *
 * `site/corpus-data.js` was written once by hand and then the corpus moved
 * under it: the site went on publishing **236 context files** and **92.4%**
 * for two rounds after the repository had corrected both to 341 and 87.9%.
 * Nothing recomputed it and nothing held it, so nobody found out.
 *
 * A page making a measurement claim that nothing checks is the failure this
 * tool exists to report, on the surface where a stranger reads it first. So
 * the data file is generated (`pnpm site-data`) and the prose around the
 * diagram is held to it here.
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { siteData } from '../scripts/corpus/site-data.ts'

const ROOT = resolve(import.meta.dirname, '..')
const page = readFileSync(join(ROOT, 'site', 'index.html'), 'utf8')
const { repos, summary } = siteData()

describe('the data file the page reads', () => {
  it('is what the snapshots say, regenerated', () => {
    const onDisk = readFileSync(join(ROOT, 'site', 'corpus-data.js'), 'utf8')
    expect(onDisk).toBe(`const CORPUS=${JSON.stringify(repos)};\n`)
  })

  it('carries every corpus repository and no other', () => {
    expect(repos).toHaveLength(summary.repos)
    expect(new Set(repos.map((repo) => repo.n)).size).toBe(summary.repos)
  })
})

describe('the survey the page prints', () => {
  it('counts the context files the corpus audited', () => {
    expect(page).toContain(`<span>${summary.sources} context files</span>`)
    expect(page).toContain(`aria-label="${summary.sources} context files`)
  })

  it('counts the lit files, the findings and the true ones together', () => {
    expect(page).toContain(
      `${summary.litFiles} of the ${summary.sources}, carrying ${summary.findings} findings`,
    )
    expect(page).toContain(`${summary.trueFindings} of those are`)
  })

  it('states the precision the corpus measures, not a better one', () => {
    expect(page).toContain(`<b>${summary.cleanRepos}</b><span>/ ${summary.repos}</span>`)
    expect(page).toContain(summary.cleanPct)
    // The page carried 92.4% long after the corpus read 87.9%. Naming the old
    // number keeps a stale figure from being reintroduced by hand.
    expect(page).not.toContain('92.4%')
  })

  it('states the validation half, which is the one that means anything', () => {
    expect(page).toContain(`<b>${summary.cleanValidation}</b><span>/ ${summary.validation}</span>`)
    expect(page).toContain(summary.cleanValidationPct)
  })

  it('counts the edits --fix would apply', () => {
    expect(page).toContain(`<dd><b>${summary.fixable}</b></dd>`)
  })

  it('says the same thing in the metadata a stranger sees first', () => {
    const claim = `${summary.cleanRepos} of ${summary.repos} real repositories`
    // Three copies: the meta description, the social card and the JSON-LD.
    expect([...page.matchAll(new RegExp(claim, 'gu'))].length).toBeGreaterThanOrEqual(3)
  })
})

describe('the version the page advertises', () => {
  const VERSION = (
    JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string }
  ).version

  it('is the one in package.json', () => {
    expect(page).toContain(`driftwatch ${VERSION}`)
    expect(page).toContain(`>${VERSION}</a>`)
  })
})
