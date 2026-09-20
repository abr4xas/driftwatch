/**
 * Reading back what happened, which is what makes a run resumable.
 *
 * Every stage appends to the journal and two of them read it to decide what
 * is left. A line the reader cannot parse must be skipped rather than
 * believed: a run killed mid-append leaves a torn line, and treating it as a
 * repository that finished would silently drop that repository from the
 * corpus.
 */
import { describe, expect, it } from 'vitest'
import { recordedIn } from '../scripts/discovery/journal.ts'

const line = (repo: string): string => JSON.stringify({ repo, ok: true })

describe('reading the results back', () => {
  it('names every repository already recorded, failures included', () => {
    const text = `${line('a/one')}\n${JSON.stringify({ repo: 'b/two', ok: false })}\n`
    expect(recordedIn(text)).toEqual(new Set(['a/one', 'b/two']))
  })

  it('survives the half-written last line of an interrupted run', () => {
    // This is the whole reason the file is JSONL rather than a JSON array. A
    // torn line must cost one repository; before this it threw, and one torn
    // line made `run` and `status` permanently unusable.
    expect(recordedIn(`${line('a/one')}\n{"repo":"b/tw`)).toEqual(new Set(['a/one']))
  })

  it('reads an absent file as nothing recorded', () => {
    expect(recordedIn('')).toEqual(new Set())
  })
})
