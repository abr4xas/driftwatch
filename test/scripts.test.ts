/**
 * The command parser and the Makefile reader.
 *
 * Both are unit-tested for the reason `ARCHITECTURE.md` § Testing gives: they
 * are wrong in a way a fixture would not localise. A fixture says "this finding
 * is missing"; these say which token was misread.
 */
import { describe, expect, it } from 'vitest'
import { parseCommand, splitCommands, withoutComment } from '../src/extract/scripts.ts'
import { readMakefile } from '../src/verify/manifest.ts'

/** The parse, flattened to what a reader of the test cares about. */
function parsed(segment: string): string | undefined {
  const command = parseCommand(segment)
  if (command === undefined) return undefined
  const { nameOffset, script } = command
  expect(segment.slice(nameOffset, nameOffset + script.length)).toBe(script)
  return `${command.runner}:${script}`
}

describe('parseCommand', () => {
  it('reads the explicit run form of every manager', () => {
    expect(parsed('npm run build')).toBe('package:build')
    expect(parsed('npm run-script build')).toBe('package:build')
    expect(parsed('pnpm run test:e2e')).toBe('package:test:e2e')
    expect(parsed('yarn run lint')).toBe('package:lint')
    expect(parsed('bun run dev')).toBe('package:dev')
    expect(parsed('deno task check')).toBe('deno:check')
    expect(parsed('make docs')).toBe('make:docs')
  })

  it('is not fooled by a word Object.prototype answers to', () => {
    // `MANAGERS` was a plain object and `MANAGERS['constructor']` is a
    // function, so a line beginning with one of these read as a known manager
    // with no keyword list and threw. Found by running over the wild corpus:
    // one repository in 2532 carries `constructor(private readonly repo: R) {}`
    // in a TypeScript example, and it took the whole audit down.
    for (const segment of [
      'constructor(private readonly repo: R) {}',
      'toString build',
      'valueOf x',
      'hasOwnProperty run build',
    ]) {
      expect(parseCommand(segment)).toBeUndefined()
    }
  })

  it('drops the bare form of the npm family, which may be a binary (ADR-0012)', () => {
    for (const segment of [
      'pnpm build',
      'yarn build',
      'pnpm vitest run test/x.test.ts',
      'yarn biome check --write .',
      'pnpm install',
      'pnpm add zod',
      'pnpm test',
      'npm start',
      'npm build',
      'bun build',
    ]) {
      expect(parsed(segment), segment).toBeUndefined()
    }
    // The explicit keyword says a script is what is being run.
    expect(parsed('pnpm run test')).toBe('package:test')
  })

  it('drops a line whose arguments are aligned, because it is a table', () => {
    expect(parsed('make            list the targets        make lint')).toBeUndefined()
    expect(parsed('make build      compile every target')).toBeUndefined()
  })

  it('drops a segment carrying a flag before the script name', () => {
    for (const segment of [
      'pnpm -r build',
      'pnpm --filter api build',
      'pnpm -F api build',
      'npm --prefix packages/api run build',
      'make -C docs html',
      'make -j 4 build',
    ]) {
      expect(parsed(segment), segment).toBeUndefined()
    }
  })

  it('drops a flag that points elsewhere wherever it sits', () => {
    for (const segment of [
      // `--if-present` says the author already decided the absence is fine.
      'npm run build --if-present',
      // These name another package, and answering from the nearest manifest
      // would offer a fixable correction from the wrong script list.
      'npm run buildd -w api',
      'npm run buildd --workspace=api',
      'pnpm run buildd --filter api',
      'pnpm run buildd -r',
    ]) {
      expect(parsed(segment), segment).toBeUndefined()
    }
  })

  it('ignores what belongs to the script rather than to the manager', () => {
    expect(parsed('npm run test -- --watch')).toBe('package:test')
    expect(parsed('CI=1 pnpm run build')).toBe('package:build')
    expect(parsed('$ pnpm run build')).toBe('package:build')
    expect(parsed('pnpm run "test:e2e"')).toBe('package:test:e2e')
  })

  it('drops a name that is a hole rather than a name', () => {
    for (const segment of [
      'npm run <script>',
      'npm run X',
      'make TARGET',
      'pnpm run a',
      'pnpm run {{task}}',
      'pnpm run $SCRIPT',
      'npm run your-script',
      'make foo',
      'npm run',
      'deno task',
      'make',
    ]) {
      expect(parsed(segment), segment).toBeUndefined()
    }
  })

  it('drops a name that is a path, because it is a file being run', () => {
    expect(parsed('bun run ./scripts/x.ts')).toBeUndefined()
    expect(parsed('bun run src/index.ts')).toBeUndefined()
  })

  it('says nothing about a manager it does not know', () => {
    for (const segment of ['cargo build', 'just build', 'node scripts/x.mjs', '']) {
      expect(parsed(segment), segment).toBeUndefined()
    }
  })
})

describe('splitCommands', () => {
  it('splits a line into the commands it chains, keeping the offsets', () => {
    const line = 'pnpm build && pnpm run test'
    const parts = splitCommands(line)
    expect(parts.map((part) => part.text)).toEqual(['pnpm build', 'pnpm run test'])
    for (const part of parts) {
      expect(line.slice(part.at, part.at + part.text.length)).toBe(part.text)
    }
  })

  it('splits on the other separators too', () => {
    expect(splitCommands('a; b | c || d & e').map((part) => part.text)).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ])
  })
})

describe('withoutComment', () => {
  it('cuts a trailing comment, so it lands in neither the text nor a fix', () => {
    expect(withoutComment('pnpm run build # the real one')).toBe('pnpm run build')
    expect(withoutComment('# just prose')).toBe('')
    // A hash that is not preceded by whitespace belongs to the command.
    expect(withoutComment('git show HEAD#nope')).toBe('git show HEAD#nope')
  })
})

describe('readMakefile', () => {
  it('reads the literal targets, one line or several', () => {
    const { tasks, enumerable } = readMakefile(
      ['build:', '\tpnpm build', '', 'lint test:', '\techo hi', ''].join('\n'),
    )
    expect(enumerable).toBe(true)
    expect([...tasks].toSorted()).toEqual(['build', 'lint', 'test'])
  })

  it('takes .PHONY prerequisites as targets and the special target as none', () => {
    const { tasks } = readMakefile(['.PHONY: build docs', 'build:', '\techo hi'].join('\n'))
    expect([...tasks].toSorted()).toEqual(['build', 'docs'])
  })

  it('ignores variable assignments in every spelling', () => {
    const { tasks } = readMakefile(
      ['CC := gcc', 'FLAGS ?= -O2', 'SRC = a.c', 'OBJ += b.o', 'build:', '\t$(CC) $(SRC)'].join(
        '\n',
      ),
    )
    expect([...tasks]).toEqual(['build'])
  })

  it('refuses to enumerate a file whose targets live elsewhere', () => {
    expect(readMakefile('include common.mk\nbuild:\n').enumerable).toBe(false)
    expect(readMakefile('-include common.mk\n').enumerable).toBe(false)
  })

  it('refuses to enumerate a computed or pattern target', () => {
    expect(readMakefile('%.o: %.c\n\t$(CC) -c $<\n').enumerable).toBe(false)
    expect(readMakefile('$(BINS):\n\techo hi\n').enumerable).toBe(false)
  })

  it('does not read a recipe line as a rule', () => {
    // The recipe holds a colon, and a tab is what makes it a recipe.
    const { tasks } = readMakefile(['build:', '\tssh host:/tmp && echo done:'].join('\n'))
    expect([...tasks]).toEqual(['build'])
  })
})
