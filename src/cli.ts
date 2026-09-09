#!/usr/bin/env node
import { main } from './cli/main.ts'

const code = await main(
  process.argv.slice(2),
  {
    out: (text) => process.stdout.write(text),
    err: (text) => process.stderr.write(text),
    isTty: process.stdout.isTTY === true,
    env: process.env,
  },
  process.cwd(),
)

process.exit(code)
