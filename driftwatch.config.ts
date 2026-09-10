import { defineConfig } from './src/index.ts'

/**
 * driftwatch auditing itself.
 *
 * `docs/agents/` holds instructions the agent is pointed at from `AGENTS.md`
 * § "Agent skills", so it is agent context in fact even though discovery does
 * not classify it: `classifySource` is right to refuse a `docs/` directory in
 * general, because in someone else's repo it is documentation for humans.
 *
 * `docs/spec/`, `docs/adr/` and the README are **deliberately absent**. See
 * ADR-0008: a specification quotes paths from other repositories and from
 * hypothetical ones, so `path/missing` over it produces nothing but noise.
 */
export default defineConfig({
  sources: ['docs/agents/**/*.md'],
})
