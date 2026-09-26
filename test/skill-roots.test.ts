/**
 * Ticket `12`: a repository declaring where its skills are.
 *
 * The built-in list reaches 1103 of the 2793 `SKILL.md` files in 700 sampled
 * repositories, and 76 of those repositories have skills it sees none of. The
 * list cannot simply grow to cover them: 74 of the 106 repositories with a
 * skill outside a known root put it in a bare `skills/`, which is not a
 * `<root>/skills` pair and has no root above it.
 *
 * So the key takes **containers**, and it is additive — a typo costs the entry
 * and nothing else. Silence is the failure this exists to fix, and a replacing
 * list would be a new way to produce it.
 */
import { describe, expect, it } from 'vitest'
import { run } from '../src/run.ts'
import { makeTempRepo } from './helpers/temp-repo.ts'

const SKILL = ['---', 'name: deploy', 'description: Ships the build to production', '---', ''].join(
  '\n',
)

/** The same repository every time: one skill, in a bare `skills/`. */
function repoWith(config: string | undefined): string {
  return makeTempRepo({
    files: {
      'AGENTS.md': '# Agents\n',
      'skills/deploy/SKILL.md': SKILL,
      ...(config === undefined ? {} : { 'driftwatch.config.yaml': config }),
    },
  })
}

describe('skillRoots', () => {
  it('sees nothing there without it, which is the problem', async () => {
    const result = await run({ cwd: repoWith(undefined), paths: [] })
    expect(result.sources.map((source) => source.kind)).toEqual(['agents-md'])
  })

  it('classifies the skill once the repository says where it is', async () => {
    const result = await run({ cwd: repoWith('skillRoots:\n  - skills\n'), paths: [] })
    expect(result.sources.filter((source) => source.kind === 'skill')).toHaveLength(1)
  })
})
