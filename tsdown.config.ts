import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts'],
  format: 'esm',
  target: 'node24',
  dts: true,
  // package.json already declares type: module, so .js is ESM. It matters
  // because the bin and the AGENTS.md verification command point at
  // dist/cli.js.
  fixedExtension: false,
  clean: true,
})
