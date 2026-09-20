/**
 * What `npm publish` would actually send.
 *
 * `package.json` has `files: ["dist"]`, so the tarball is already a whitelist
 * and this script cannot fix anything — it exists to fail loudly the day
 * somebody widens that field. The thing on the other side of the mistake is
 * not a stray fixture: `test/corpus/repos/` is **3.3 GB** of shallow clones on
 * a working machine, and `test/corpus/snapshots/` is a hundred committed
 * files. A package that ships the corpus is a package nobody can install.
 *
 * npm does not let a version be republished, so this has to be a check before
 * the upload and not a look afterwards. It runs in CI on every push and again
 * in the release workflow before the publish step.
 */
import { execFileSync } from 'node:child_process'

/** Everything npm may put in the tarball. Anything else fails the run. */
const ALLOWED = /^(?:dist\/|package\.json$|README\.md$|LICENSE$)/u

/**
 * The whole point is orders of magnitude, not bytes: the build is ~55 kB
 * packed, and the failure this guards against is measured in gigabytes. A
 * limit an honest change can trip is a limit somebody raises without reading,
 * so it sits far above anything the build will produce.
 */
const MAX_BYTES = 512 * 1024

type PackedFile = { path: string; size: number }
type PackReport = { files: readonly PackedFile[]; size: number; filename: string }

function report(): PackReport {
  // `--json` writes the report to stdout and its notices to stderr, so the
  // parse does not need to filter anything out.
  const stdout = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  const parsed: unknown = JSON.parse(stdout)
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('npm pack --json returned no report')
  }
  // The shape is npm's, validated only as far as this script reads it.
  return parsed[0] as PackReport
}

const { files, size, filename } = report()
const strays = files.map((file) => file.path).filter((path) => !ALLOWED.test(path))

if (strays.length > 0) {
  process.stderr.write(`${filename} would ship ${strays.length} file(s) outside dist/:\n`)
  for (const path of strays) process.stderr.write(`  ${path}\n`)
  process.stderr.write('\nCheck `files` in package.json.\n')
  process.exit(1)
}

if (size > MAX_BYTES) {
  process.stderr.write(`${filename} is ${size} bytes, over the ${MAX_BYTES} limit.\n`)
  process.exit(1)
}

process.stdout.write(`${filename}: ${files.length} files, ${size} bytes\n`)
