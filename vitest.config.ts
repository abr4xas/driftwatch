import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Both corpora bring other people's tests, which are not ours. The
    // discovery clones hold 60 `*.test.ts` that the include glob above
    // matches; something has been keeping them out — the directory is
    // gitignored — and the suite has run 46 files either way. Saying it here
    // makes it a decision rather than a coincidence, which is what `tsconfig`
    // was relying on until a stranger's `route.ts` broke typecheck.
    exclude: ['test/corpus/**', 'test/discovery/**', 'node_modules/**', 'dist/**'],
  },
})
