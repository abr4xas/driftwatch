# ADR-0013 — A config is data, not a program

- **Status:** accepted, amended 2026-09-20 by ADR-0014 (see "The flag is gone, the route is not")
- **Date:** 2026-09-18

## Context

`SPEC.md` § 7 lists five config formats: `driftwatch.config.ts`, `.js`, `.json`, `.yaml`, `.yml`, plus the `driftwatch` key in `package.json`. The first two are loaded with `await import(pathToFileURL(path).href)`, which **executes them**.

That was uncontroversial while driftwatch ran in the repository of whoever invoked it. Running your own config is not a risk anyone needs protecting from, and `defineConfig` gave TypeScript repos autocompletion.

The exploration in [`.scratch/corpus-adjudication-at-scale/`](../../.scratch/corpus-adjudication-at-scale/spec.md) puts the tool somewhere else. A **discovery corpus** would run driftwatch over one to two thousand repositories nobody has read, cloned from GitHub for the purpose. Every `driftwatch.config.ts` in that population is arbitrary code from a stranger, executed by a tool whose entire product claim is that it is deterministic and offline. The corpus is not shipped behaviour, but it is *our* use of our own tool, and it is the use that made the property visible.

Two smaller facts decided the timing:

- **Nobody is using the executable formats.** Zero of the 66 corpus repositories carry a driftwatch config of any kind. The only two `.ts` configs in existence are this repository's own.
- **`--init` already writes YAML**, and has since the flag landed. [`ROADMAP.md`](../spec/ROADMAP.md) records why: driftwatch audits Go, Rust and Python repositories as readily as Node ones, and a `.ts` file at the root of a Cargo workspace is an artefact nobody there can explain. The format the tool *recommends* was already declarative; the loader simply accepted more than the tool advised.

## Decision

**The loader accepts data formats only**: `driftwatch.config.json`, `.yaml`, `.yml`, and the `driftwatch` key in `package.json`. `.ts`, `.js` and `.mjs` are no longer loaded, and `defineConfig` is withdrawn from the public API along with them.

A config in a withdrawn format is **an error with a fix in it**, not a silent skip: driftwatch says the format is no longer supported and names the command that converts it.

`driftwatch --migrate-config` performs that conversion. It imports the existing `.ts`/`.js` config **once**, validates the result, writes `driftwatch.config.yaml` beside it, and leaves the original in place for the user to delete.

`--init` is unchanged: YAML, commented, as before.

### The flag is gone, the route is not

Amended 2026-09-20, by the release that froze the surface. **`--migrate-config` was withdrawn in
`1.0.0`**, after existing in exactly one published release. It was a flag that ran a user's code
on request, and `1.0.0` is where the surface stopped carrying anything it would not want to
carry for the life of a major version.

What does not change is the obligation below: a withdrawn format with no route off it moves a
cost onto the user. The route is now a version rather than a flag — `npx
@abr4xas/driftwatch@0.5.0 --migrate-config`, the last release that carries the converter, which
needs no install because `npx` is the advertised way to run this tool anyway. The loader's
refusal says exactly that, so a reader meets the route at the moment they need it rather than
here.

A reader who finds the paragraphs below promising a command and then finds no command has not
found a lost feature. They have found this note.

## Why

**Executing a config buys a convenience and sells a guarantee.** [`PRODUCT.md`](../../PRODUCT.md) positions driftwatch as deterministic, offline, no network, no API key — the argument against every competitor that calls a model. "And it does not run code it finds in the repository" belongs in that list, and it cannot be said while two of five formats are modules.

**The convenience it buys is small and already available.** What a `.ts` config offers over YAML is type checking and autocompletion on five keys, three of which the loader validates and nobody reads yet. YAML holds the comments the template is mostly made of, which is the same information delivered at the moment it is needed.

**The cost is bounded by measurement rather than by argument.** The formats being withdrawn have no users outside this repository. That will not stay true, which is the reason to do it now rather than after the first release that acquires some.

**The migration is the part that makes this honest.** Withdrawing a format without a route off it pushes work onto users to buy ourselves a property. `--migrate-config` is that route, and it is allowed to execute the config precisely because the user asked it to, in their own repository, once — the case that was never the problem.

## What is lost

**Computed configuration.** A `.ts` config can build its `sources` list from a glob, read an environment variable, or share a constant with the repo's build. None of that is expressible in YAML, and anyone doing it has to write the result out by hand.

No such config exists today, and the shape of this config discourages it: `sources`, `ignore` and `knownPaths` are already glob lists, so the computation a module would do is the computation the loader does anyway.

**`defineConfig` leaves the public API**, which is a breaking change to `@abr4xas/driftwatch`'s exports for a function whose entire body is `return config`. It exists to attach a type to an object literal, and with no module configs there is no object literal to attach it to.

## Consequences

- `loadConfig` no longer imports anything at runtime. The dynamic `import()` in `config.ts` is gone, and with it the only path by which driftwatch executed code that was not its own.
- The two configs in this repository — `driftwatch.config.ts` and `driftwatch.docs.config.ts` — are converted to YAML, so the tool is auditing itself through the same loader it offers everyone else.
- `SPEC.md` § 7's format list is the loader's list again.
- The discovery corpus of the `.scratch/` exploration loses one of its two reasons to pass `--no-config`. The other one — comparability across repositories — stands on its own and is recorded in that directory's ticket `06`.
