# Using it

```bash
npx @abr4xas/driftwatch            # audit the whole repo
driftwatch docs/ AGENTS.md         # only these paths
```

Needs Node 24 or newer ([ADR-0002](../adr/0002-node-24-floor.md)). No configuration, no API key, no network.

## Options

| Option | What it does |
|---|---|
| `--fix` | apply the unambiguous corrections — see [fixing.md](./fixing.md) |
| `--dry-run` | with `--fix`, show the diff and write nothing |
| `--json` | JSON on stdout, the same as `--format json` |
| `--format <fmt>` | `pretty` (default), `json`, `github`, `sarif` — see [output.md](./output.md) |
| `--only <ids>` | run only these checks; a prefix works: `--only path` |
| `--skip <ids>` | run everything except these |
| `--strict` | warnings count as errors for the exit code |
| `--no-tier2` | turn off every tier 2 check |
| `--config <path>` | use this config file |
| `--no-config` | ignore any config found |
| `--quiet` | problems only, no summary (`pretty` only) |
| `--init` | write a commented `driftwatch.config.yaml` and exit |
| `--migrate-config` | convert a `.ts` or `.js` config to YAML and exit |
| `--version`, `-v` | print the version |
| `--help`, `-h` | print the options |

`--only` and `--skip` take a comma-separated list and accept a prefix, so `--only path,script` and `--only path/missing` both work. **A selection that leaves no check enabled is refused** rather than run: reporting `no drift` after verifying nothing is the failure this tool exists to catch elsewhere.

One flag parses and then tells you it is not implemented, naming the milestone it belongs to: `--watch`.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | no errors — there may be warnings, unless `--strict` |
| `1` | at least one error was found |
| `2` | the tool itself failed — bad config, a path that does not exist, a crash |

With `--fix`, the code describes what is left **after** fixing: a repo whose only error was autofixable exits `0`. The code never depends on the output format.

## What it reads

| Kind | Where |
|---|---|
| `agents-md` | `AGENTS.md`, at any depth |
| `claude-md` | `CLAUDE.md`, `CLAUDE.local.md` |
| `skill` | `.claude/skills/**/SKILL.md`, and the same under `.agents/` and `.cursor/` |
| `subagent` | `.claude/agents/*.md` |
| `command` | `.claude/commands/**/*.md` |
| `cursor-rule` | `.cursorrules`, `.cursor/rules/**/*.mdc` |
| `copilot` | `.github/copilot-instructions.md` |

Discovery uses `git ls-files`, so `.gitignore` is respected for free; a repo with no `.git` falls back to a glob walk. Byte-identical `AGENTS.md` and `CLAUDE.md` files in the same directory are audited once and reported as aliases, because counting the same problem twice is its own kind of noise.

## Configuration

Optional. `driftwatch.config.yaml`, `.yml`, `.ts`, `.js`, `.json`, or a `driftwatch` key in `package.json`.

`driftwatch --init` writes a commented `driftwatch.config.yaml` for you, with the inert keys commented out so the file does not promise more than the tool does. It refuses if any config is already there — including a `driftwatch` key in `package.json` — rather than overwrite it, and it writes to the repo root wherever you run it from.

**YAML is the default because driftwatch is not a Node tool.** It audits Go, Rust and Python repositories as readily as JavaScript ones, and a `.ts` config assumes otherwise — in a TypeScript repo it is worse than an odd file, because it can land inside the tsconfig include, the lint glob and the build. A `.ts` config still works, and in this repository that is what is used.

```yaml
sources:
  - 'docs/agent-notes.md'

# Where your skills live, if it is not one of the six roots driftwatch knows.
# A container is a directory whose children are skill directories.
skillRoots:
  - 'skills'

checks:
  'link/broken': 'warning'
  'frontmatter/invalid': 'off'
```

The same thing as JSON, if you would rather not add a YAML file:

```json
{
  "sources": ["docs/agent-notes.md"],
  "checks": {
    "link/broken": "warning",
    "frontmatter/invalid": "off"
  }
}
```

**Quote the severity.** `off` is one of the three values and also a boolean in YAML 1.1; the parser here implements 1.2, where the unquoted form is a string and works, but a file edited elsewhere may not survive the round trip. If a severity ever arrives as a boolean the error says so rather than blaming your check ids.

**A config is data, not a program.** `.ts`, `.js` and `.mjs` configs were accepted until 2026-09-18 and are not loaded any more — [ADR-0013](../adr/0013-a-config-is-data-not-a-program.md) withdrew them rather than keep a path by which driftwatch runs code it finds in a repository. If you have one, `driftwatch --migrate-config` converts it to YAML and tells you to delete the original.

**An unknown key fails the run** instead of being ignored. A typo in a key that silently disables what it was meant to configure is worse than a red run.

Three keys in `SPEC.md` § 7 are accepted and validated but **do nothing yet**: `ignore`, `knownPaths` and `staleThreshold`. The first two land with the checks that need them, `staleThreshold` with `stale/churn` in M5.

## Ignore directives

Inside any Markdown source:

```markdown
<!-- driftwatch-ignore-next-line -->
`src/planned/feature.ts` does not exist yet, it is the plan

<!-- driftwatch-ignore path/missing -->

<!-- driftwatch-ignore-file -->
```

With no id it silences every check on that line; with an id, only that one. Directives apply to findings rather than to claims, so an id you misspell silences nothing and the finding still shows up.

## Running it from source

Needs Node 24+ and pnpm.

```bash
pnpm install
pnpm build
node ./dist/cli.js [paths...]
```
