# 23: A TypeScript example takes the whole audit down

**What to decide:** nothing. A lookup table indexed by a word from a document found a key
`Object.prototype` supplies, and the audit died on the repository rather than on the line.

**Type:** bug

**Blocked by:** nothing

**Status: resolved 2026-09-20.** `MANAGERS` is a `Map`. See §"Answer".

## The repository that found it

`HoangNguyen0403/agent-skills-standard`, one of 2532 the discovery corpus audited when the
whole-corpus discard pass ran on 2026-09-20. It carries an ordinary TypeScript example:

```ts
constructor(private readonly repository: UserRepository) {}
```

`extractScriptClaims` splits a fenced block into command segments and hands each to
`parseCommand`, which takes the first token and asks whether it names a package manager:

```ts
const grammar = MANAGERS[manager]
if (grammar === undefined) return undefined
```

`MANAGERS` was an object literal. `MANAGERS['constructor']` is `Function` — not `undefined`,
so the guard passes — and the next line reads `grammar.keywords.includes(...)` off a function
that has no `keywords`:

```
TypeError: Cannot read properties of undefined (reading 'includes')
    at parseCommand (src/extract/scripts.ts:232)
```

`toString`, `valueOf` and `hasOwnProperty` do the same thing.

## Why it matters more than one line

The throw is not caught per claim. It unwinds out of `extractClaims` and out of `run`, so the
repository produces **nothing** — 336 sources and 91 findings lost to one word in an example.
The discard pass recorded it as one failure among 2532, which is exactly how a crash of this
shape stays invisible: the summary line says `2532 read, 1 failed` and the table below it
looks complete.

## Answer

Resolved 2026-09-20. **`MANAGERS` is a `ReadonlyMap`.**

A `Map` has no inherited keys, so the class of bug is gone rather than defended against. The
alternative — `Object.hasOwn(MANAGERS, manager)` before the lookup — fixes this line and
leaves the next table somebody indexes by a word from a document to be found the same way,
by a stranger's repository, a year from now.

### The third one this corpus has found

| ticket | what | how it was found |
|---|---|---|
| `13` | a source `git ls-files` lists that the sparse checkout does not carry | 700-repo run |
| `15` | a YAML alias in `.mdc` frontmatter | 231-repo run |
| `23` | a word `Object.prototype` answers to | 2532-repo run |

None of the three has a fixture that would have caught it, and none is about a rule being
wrong. They are about the difference between documents somebody wrote to be parsed and
documents somebody wrote. That difference is what the discovery corpus is for, and it is the
part of it that produces changes to `src/` — which is the only part that has to.

### The bill

A test in `test/scripts.test.ts` naming all four words, written first and failing with the
same `TypeError`. 753 tests in 46 files. The certification corpus is unchanged at 66 repos ·
341 sources · 37 findings: no repository in it contains the word at the head of a command.

### What is left undone

The discard pass that found it ran without this repository, so `discards.jsonl` is missing
its share — 336 sources' worth, out of 2532 repositories. Not worth an hour of re-running for
one repository, and worth writing down rather than leaving as a silent gap.
