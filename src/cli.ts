#!/usr/bin/env node
import { main } from './cli/main.ts'
import { codeOf } from './core/errors.ts'

// A reader that stopped early (`driftwatch | head`) closed the pipe; it is not
// a failure of ours and is no reason for a stack trace. The rest of the report
// goes nowhere and the exit code is still the one the run earned.
process.stdout.on('error', (error) => {
  if (codeOf(error) !== 'EPIPE') throw error
})

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
