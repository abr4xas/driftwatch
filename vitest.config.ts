import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // The corpus clones bring their own tests, which are not ours.
    exclude: ['test/corpus/**', 'node_modules/**', 'dist/**'],
  },
})
