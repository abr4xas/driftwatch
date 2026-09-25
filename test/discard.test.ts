import { describe, expect, it } from 'vitest'
import { discardReason, normalizePathText } from '../src/extract/discard.ts'
import { evaluatePathText } from '../src/extract/paths.ts'

/**
 * One rule per block, in ARCHITECTURE.md order. Every case here has its twin in
 * the `false-positive-traps` fixture: the unit tests pin the rule, the fixture
 * pins the observable result.
 */
describe('rule 1: URLs', () => {
  it.each([
    'https://example.com/docs/guide.md',
    'http://cdn.example.com/lib/app.js',
    'file:///tmp/output/report.json',
    'ftp://host/file.txt',
    '//cdn.example.com/x.js',
  ])('discards %s', (text) => {
    expect(discardReason(text)).toBe('url')
  })
})

describe('module specifiers that start with an at sign', () => {
  // Real cases from the discovery corpus, 128 distinct texts in 69
  // repositories. Two shapes and both are a resolver's business: an npm
  // scoped package, and the `paths` alias a tsconfig or a Vite config maps
  // onto `src/`.
  it.each([
    '@n8n/typeorm/',
    '@rails/request.js',
    '@blackbelt-technology/pi-dashboard-shared/test-support/setup-home.ts',
    '@/engine/',
    '@/components/ui/',
    '@/api/',
    '@skills/testing/test-driven-development/SKILL.md',
  ])('discards %s', (text) => {
    expect(discardReason(text)).toBe('module-specifier')
  })

  it('does not discard a path that merely contains an at sign later on', () => {
    expect(discardReason('docs/guide@v2.md')).toBeUndefined()
  })

  // The admitted cost, pinned so that closing it is a deliberate change: this
  // is Claude Code's import syntax and it really is a path claim. 5 candidates
  // in 1 352 382 discards, none of which resolves.
  it('gives up Claude Code’s @./file import, which is a path wearing a sigil', () => {
    expect(discardReason('@../AGENTS.md')).toBe('module-specifier')
  })
})

describe('module specifiers, which start with a hash', () => {
  // Real case (vercel-labs/marketing-team-eve-template): `#lib/` is the `#*`
  // subpath declared under `imports` in package.json, not a directory.
  it.each(['#lib/', '#lib/format.ts', '#evals/run.ts', '#internal/deep/thing.ts'])(
    'discards %s',
    (text) => {
      expect(discardReason(text)).toBe('module-specifier')
    },
  )

  it('does not discard a path that merely contains a hash later on', () => {
    expect(discardReason('docs/guide.md#section')).toBeUndefined()
  })
})

describe('paths on the reader own machine', () => {
  // Real case (mattpocock/course-video-manager): the skill roots its reading
  // at `~/repos/ai/course-builder/apps/ai-hero/src/`.
  it.each(['~', '~/', '~/repos/other/src/', '~/.config/app/token.json'])('discards %s', (text) => {
    expect(discardReason(text)).toBe('home-path')
  })

  it('does not discard a path that merely contains a tilde', () => {
    expect(discardReason('src/~backup/file.ts')).toBeUndefined()
  })
})

describe('rule 2: globs and placeholders', () => {
  it.each([
    'src/**/*.test.ts',
    'test/fixtures/*.json',
    '.scratch/<feature>/issues/',
    '{{path}}/template.md',
    '$HOME/.config/app.json',
    'packages/[name]/src',
    'docs/page?.md',
  ])('discards %s', (text) => {
    expect(discardReason(text)).toBe('glob-or-placeholder')
  })
})

describe('rule 3: bare words', () => {
  it.each(['index.ts', 'tsconfig.json', 'pnpm', 'build', 'README.md'])(
    'discards %s, because it does not pin a location (ADR-0003)',
    (text) => {
      expect(discardReason(text)).toBe('bare-word')
    },
  )

  it('does not discard something that does have a slash', () => {
    expect(discardReason('src/index.ts')).toBeUndefined()
  })
})

describe('rule 4: looks like a file and is not', () => {
  it.each(['node.js', 'next.js', 'vue.js', 'nuxt.js', 'd.ts', '1.0', 'v2.1.3'])(
    'discards %s',
    (text) => {
      expect(discardReason(text)).not.toBeUndefined()
    },
  )

  it('discards the technology name even with a slash in front', () => {
    expect(discardReason('runtime/node.js')).toBe('not-a-file')
  })

  it('does not discard a real file with a similar name', () => {
    expect(discardReason('src/node.ts')).toBeUndefined()
  })
})

/**
 * `path/to/…` is the metasyntactic *path*, and it is a sequence rather than a
 * word — which is why it cannot live in `METASYNTACTIC`, whose members are
 * tested one segment at a time. `path` and `to` are both ordinary directory
 * names on their own.
 */
describe('the metasyntactic path', () => {
  it.each([
    'path/to/file.ts',
    'path/to/your-file.md',
    'path/to/',
    'some/path/to/thing.ts',
    'Path/To/File.ts',
  ])('discards %s', (text) => {
    expect(discardReason(text)).toBe('metasyntactic')
  })

  it.each(['src/path/resolve.ts', 'lib/to/index.ts', 'path/index.ts', 'docs/to-do.md'])(
    'leaves %s alone, because the two words are only a placeholder together',
    (text) => {
      expect(discardReason(text)).toBeUndefined()
    },
  )
})

/**
 * A leading slash: an endpoint, a URL on a site, or a path on a machine — and
 * almost never a file in this repository.
 *
 * Measured over the 66-repo corpus: **306 claims are written as an absolute
 * path and 5 of them resolve to anything in the repo**. The other 301 are
 * `/v1/responses`, `/embeddings`, `/etc/`, `/docs/app/glossary`.
 */
describe('absolute paths', () => {
  it.each(['/docs/app/glossary', '/docs/app/', '/v1/responses', '/etc/', '/usr/local/bin/tool'])(
    'discards %s',
    (text) => {
      expect(discardReason(text)).toBe('absolute-path')
    },
  )

  it('leaves a relative path alone', () => {
    expect(discardReason('docs/app/glossary.md')).toBeUndefined()
    expect(discardReason('src/index.ts')).toBeUndefined()
  })

  it('does not mistake a protocol-relative url for one', () => {
    // `//cdn.example.com/x.js` is rule 1's, and it must stay rule 1's: the
    // reason is what the tests pin.
    expect(discardReason('//cdn.example.com/x.js')).toBe('url')
  })
})

describe('rule 5: normalization', () => {
  it('strips the leading ./', () => {
    expect(normalizePathText('./src/index.ts')).toBe('src/index.ts')
  })

  it('strips a line reference, and a line-and-column one', () => {
    expect(normalizePathText('src/index.ts:12')).toBe('src/index.ts')
    expect(normalizePathText('src/index.ts:12:4')).toBe('src/index.ts')
  })

  it('strips leftover backticks', () => {
    expect(normalizePathText('`src/index.ts`')).toBe('src/index.ts')
  })

  it('strips trailing punctuation, which belongs to the sentence not the path', () => {
    expect(normalizePathText('src/index.ts.')).toBe('src/index.ts')
    expect(normalizePathText('src/index.ts,')).toBe('src/index.ts')
    expect(normalizePathText('(src/index.ts)')).toBe('(src/index.ts')
  })

  it('leaves an already clean path alone', () => {
    expect(normalizePathText('src/index.ts')).toBe('src/index.ts')
    expect(normalizePathText('src/lib/')).toBe('src/lib/')
  })
})

describe('evaluatePathText', () => {
  it('returns the normalized path when it survives everything', () => {
    expect(evaluatePathText('./src/index.ts:12')).toEqual({
      kind: 'path',
      text: 'src/index.ts',
    })
  })

  it('discards what is no longer path-shaped after normalizing', () => {
    expect(evaluatePathText('a/b:1')).toEqual({ kind: 'discarded', reason: 'not-path-shaped' })
  })

  it('order matters: a URL is discarded before being normalized', () => {
    expect(evaluatePathText('https://x.com/a.md.')).toEqual({ kind: 'discarded', reason: 'url' })
  })
})

describe('a host with the scheme left off', () => {
  it('discards a bare host, which is what prose writes half the time', () => {
    expect(discardReason('linkedin.com/in/')).toBe('url')
    expect(discardReason('nextjs.org/docs/messages/')).toBe('url')
    expect(discardReason('herokucdn.com/error-pages/no-such-app.html')).toBe('url')
    expect(discardReason('ctbk.s3.amazonaws.com/index.html')).toBe('url')
  })

  it('does not fire on a .NET project directory, which is why the match is case-sensitive', () => {
    // Over 12 439 distinct first segments in 2599 repositories, the
    // case-insensitive version matched `GameOfLife3D.NET` and one real host.
    // This is the whole reason the rule is not /iu.
    expect(discardReason('GameOfLife3D.NET/src/main.cs')).toBeUndefined()
    expect(discardReason('Foo.NET/README')).toBeUndefined()
  })

  it('leaves a file extension alone: the TLD list carries none', () => {
    expect(discardReason('docs.md/guide')).toBeUndefined()
    expect(discardReason('build.sh/x')).toBeUndefined()
    expect(discardReason('main.go/x')).toBeUndefined()
  })

  it('covers io, dev, ai, app and co, which the first pass held back', () => {
    // Held back on the argument that they are also ordinary directory names,
    // and on the condition that measurement would decide. Ticket `39`
    // measured: 222 discarded candidates carry them and none resolves,
    // against one real first segment in 12 439 — `forecast.io`.
    expect(discardReason('packages.io/x')).toBe('url')
    expect(discardReason('my.app/config.json')).toBe('url')
  })

  it('needs a path after the host, so this rule does not claim a dotted word', () => {
    // Both are discarded, by the bare-word rule rather than by this one: a
    // host on its own names no file either way, and letting this rule claim
    // it would blur which rule is answering for what.
    expect(discardReason('release.notes.com')).not.toBe('url')
    expect(discardReason('config.tech')).not.toBe('url')
  })

  it('still reports an ordinary dotted path', () => {
    expect(discardReason('src/app.component.ts')).toBeUndefined()
    expect(discardReason('.github/workflows/ci.yml')).toBeUndefined()
  })
})

describe('a drive letter is the reader’s machine', () => {
  it('discards a Windows path, with either separator', () => {
    expect(discardReason('D:/Projects/app/.claude/references/ai-evals.md')).toBe('home-path')
    expect(discardReason('G:/Claude/')).toBe('home-path')
    expect(discardReason('C:\\Users\\me\\notes.md')).toBe('home-path')
  })

  it('covers the lowercase form the scheme rule was catching by accident', () => {
    // `SCHEME` is lowercase-only, so `d:/x` was a module-specifier and `D:/x`
    // was a finding. Both are the same thing and both are discarded now.
    expect(discardReason('d:/projects/app/notes.md')).toBeDefined()
    expect(discardReason('D:/projects/app/notes.md')).toBe('home-path')
  })

  it('leaves an ordinary path with a colon alone', () => {
    expect(discardReason('src/App:Component.tsx')).not.toBe('home-path')
    expect(discardReason('docs/a/b.md')).toBeUndefined()
  })
})

describe('the TLDs ticket 39 measured in', () => {
  it('discards the five that were held back in the first pass', () => {
    expect(discardReason('mise.jdx.dev/tasks/')).toBe('url')
    expect(discardReason('nvcr.io/')).toBe('url')
    expect(discardReason('peonping.github.io/registry/index.json')).toBe('url')
    expect(discardReason('us-docker.pkg.dev/moonrhythm-containers/gcr.io/')).toBe('url')
    expect(discardReason('claude.ai/code/')).toBe('url')
  })

  it('still leaves every file extension alone', () => {
    // The refusal that did not move: a rule must not be the thing deciding
    // whether `docs.md/` is a directory.
    expect(discardReason('docs.md/guide')).toBeUndefined()
    expect(discardReason('build.sh/x')).toBeUndefined()
    expect(discardReason('main.go/x')).toBeUndefined()
  })

  it('still reports GameOfLife3D.NET, which is why the match is case-sensitive', () => {
    expect(discardReason('GameOfLife3D.NET/src/main.cs')).toBeUndefined()
  })
})

describe('an interior ellipsis is an abbreviation', () => {
  it('discards a path whose middle was elided, in either spelling', () => {
    expect(discardReason('core/.../sql/parser/')).toBe('metasyntactic')
    expect(discardReason('datagsm-common/src/main/kotlin/.../domain/')).toBe('metasyntactic')
    expect(discardReason('tests/…/sqliteStore.test.js')).toBe('metasyntactic')
    expect(discardReason('src/main/resources/META-INF/…/proxy-config.json')).toBe('metasyntactic')
  })

  it('leaves a trailing ... alone, which is the whole care in the rule', () => {
    // `steps-c/...` normalises to `steps-c/`, which usually exists: 91 such
    // candidates come back exists:true. A rule written as "contains an
    // ellipsis" would look the same and rest on that normalisation.
    expect(discardReason('steps-c/...')).not.toBe('metasyntactic')
    expect(discardReason('.claude/skills/...')).not.toBe('metasyntactic')
  })

  it('leaves a real path with dots alone', () => {
    expect(discardReason('src/app.component.ts')).toBeUndefined()
    expect(discardReason('../sibling/file.ts')).toBeUndefined()
  })
})

describe('a directory variable with its sigil left off', () => {
  it('discards the names that end in a directory word', () => {
    expect(discardReason('SKILL_DIR/wiki/')).toBe('metasyntactic')
    expect(discardReason('EXP_ROOT/user_workload.yaml')).toBe('metasyntactic')
    expect(discardReason('SPECIFY_FEATURE_DIRECTORY/spec.md')).toBe('metasyntactic')
    expect(discardReason('FEATURE_DIR/checklists/requirements.md')).toBe('metasyntactic')
  })

  it('leaves a SCREAMING_SNAKE directory that is a real one', () => {
    // The five that exist in 12 439 first segments, and `ZION_OS/` is live:
    // Yose144/Zion-v3.0.0 names `ZION_OS/dashboard/app.py` and it resolves.
    // This is why the rule asks for the suffix instead of the case.
    expect(discardReason('ZION_OS/dashboard/app.py')).toBeUndefined()
    expect(discardReason('README_IMAGES/logo.png')).toBeUndefined()
    expect(discardReason('FINAL_RELEASE_CHANGES/notes.md')).toBeUndefined()
  })

  it('does not fire on NN or XX, which mean neural network', () => {
    // 66 findings of real mass, refused: of 1 858 219 real segments, 32 carry
    // the shape and they are `NN-example-cifar10`, `NN_Lib_Tests`, `HP8XX.mod`.
    expect(discardReason('docs/adr/NNNN-short-title.md')).toBeUndefined()
    expect(discardReason('NN-example-cifar10/train.py')).toBeUndefined()
  })
})
