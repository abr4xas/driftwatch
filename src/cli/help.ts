/** The --help text. It is the SPEC.md § 4 contract written down once. */
export const HELP = `driftwatch [paths...] [options]

Find the claims in your agent context files that are no longer true.

Options
  --fix                  Apply the unambiguous fixes
  --json                 JSON output on stdout
  --format <fmt>         pretty | json | github | sarif   (default: pretty)
  --only <ids>           Only these checks (comma-separated, accepts a prefix: --only path)
  --skip <ids>           Exclude these checks
  --strict               Warnings count as errors for the exit code
  --no-tier2             Turn off every tier 2 check
  --config <path>        Explicit path to the config
  --no-config            Ignore any config found
  --quiet                Show problems only, no summary
  --watch                Re-run whenever a source changes
  --init                 Write a commented driftwatch.config.ts
  --version, -v          Print the version
  --help, -h             Print this help

Exit codes
  0  No errors
  1  At least one error was found
  2  The tool itself failed
`
