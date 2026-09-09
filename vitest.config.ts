import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Los clones del corpus traen sus propios tests, que no son nuestros.
    exclude: ['test/corpus/**', 'node_modules/**', 'dist/**'],
  },
})
