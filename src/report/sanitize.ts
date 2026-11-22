/**
 * Text that came out of somebody else's repository, made safe to print on a
 * terminal or in a CI log.
 *
 * A claim, a message quoting it and a file name are all data the tool read,
 * never instructions to the terminal showing them. A `CLAUDE.md` in a cloned
 * repo can carry an escape sequence that recolours or rewrites the line it is
 * on, or a bidi override that makes `src/a.ts` display as something else; the
 * reader would act on what they saw rather than on what is in the file.
 *
 * Only the human formats go through here. JSON escapes control characters on
 * its own, and rewriting a value there would change the contract's data.
 */

// Matching control characters is the point of this module.
/* oxlint-disable no-control-regex */

/** CSI (`ESC [ … final`) and OSC (`ESC ] … BEL` or `ESC ] … ESC \`) sequences, whole. */
const ESCAPE_SEQUENCE = /\u001B\[[0-?]*[ -/]*[@-~]|\u001B\][^\u0007\u001B]*(?:\u0007|\u001B\\)?/gu

/** C0 and C1 controls other than tab and newline, which the callers flatten themselves. */
const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/gu

/** Bidi embeddings, overrides, isolates and marks, plus zero-width characters. */
const INVISIBLE = /[؜​-‏‪-‮⁠⁦-⁩﻿]/gu

export function sanitize(text: string): string {
  return text.replaceAll(ESCAPE_SEQUENCE, '').replaceAll(CONTROL, '').replaceAll(INVISIBLE, '')
}
