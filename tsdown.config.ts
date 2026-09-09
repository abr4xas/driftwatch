import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/cli.ts', 'src/index.ts'],
  format: 'esm',
  target: 'node24',
  dts: true,
  // El package.json ya declara type: module, asi que .js es ESM. Importa porque
  // el bin y el comando de verificacion de AGENTS.md apuntan a dist/cli.js.
  fixedExtension: false,
  clean: true,
})
