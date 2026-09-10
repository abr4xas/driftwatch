/**
 * How a check id is matched by the things that name checks: `--only`,
 * `--skip`, and the inline ignore directives.
 *
 * It lives on its own because those callers sit on both sides of the
 * core/verify line, and a second copy of this rule drifting from the first is
 * exactly the kind of thing this tool exists to find.
 */

/**
 * A selector matches an id exactly, or as a **namespace prefix**: `path`
 * matches `path/missing`. Deliberately not an arbitrary string prefix, so
 * `pat` matches nothing and the caller can say so.
 */
export function matchesCheckId(selector: string, id: string): boolean {
  return id === selector || id.startsWith(`${selector}/`)
}
