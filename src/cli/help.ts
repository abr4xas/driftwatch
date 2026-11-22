/**
 * The --help text. It is the SPEC.md § 4 contract written down once.
 *
 * Static on purpose: `--help` must not load the check registry to print it, so
 * the Checks section is written out by hand and `test/cli.test.ts` holds it to
 * `CHECKS`. Every line fits in 80 columns and reads without colour.
 */
export const HELP = `driftwatch [paths...] [options]

Find the claims in your agent context files that are no longer true.

Arguments
  paths                  Files or directories to audit (default: the whole repo)

Options
  --fix                  Apply the unambiguous fixes
  --dry-run              With --fix, show what it would change without writing
  --json                 JSON output on stdout (same as --format json)
  --format <fmt>         pretty | json | github | sarif (default: pretty)
  --only <ids>           Only these checks, comma-separated (a prefix works:
                         --only path)
  --skip <ids>           Exclude these checks
  --strict               Warnings count as errors for the exit code
  --no-tier2             Turn off every tier 2 check
  --config <path>        Explicit path to the config
  --no-config            Ignore any config found
  --quiet                Show findings only, no summary
  --init                 Write a commented driftwatch.config.yaml
  --version, -v          Print the version
  --help, -h             Print this help

Checks
  path/missing           A claimed path does not exist
  script/missing         A documented command has no script behind it
  link/broken            A link points at an anchor no heading produces
  frontmatter/invalid    Frontmatter is not valid YAML

Exit codes
  0  No errors
  1  At least one error was found
  2  The tool itself failed

Examples
    driftwatch
    driftwatch --fix --dry-run
    driftwatch --format sarif

Learn more: https://github.com/abr4xas/driftwatch/tree/master/docs/guide
`
