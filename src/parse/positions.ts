import type { Range } from '../core/types.ts'

/**
 * A table of line-start offsets. It is built once per source and turns any
 * absolute offset into a 1-indexed line and column, which is what every
 * terminal and every editor expects.
 */
export type LineTable = readonly number[]

export function buildLineTable(content: string): LineTable {
  const starts = [0]
  for (let i = 0; i < content.length; i += 1) {
    if (content[i] === '\n') starts.push(i + 1)
  }
  return starts
}

/** Binary search for the line containing an offset. */
function lineAt(table: LineTable, offset: number): number {
  let low = 0
  let high = table.length - 1
  while (low < high) {
    const mid = (low + high + 1) >> 1
    if ((table[mid] ?? 0) <= offset) low = mid
    else high = mid - 1
  }
  return low
}

export function rangeFor(table: LineTable, start: number, end: number): Range {
  const startLine = lineAt(table, start)
  const endLine = lineAt(table, end)
  return {
    line: startLine + 1,
    column: start - (table[startLine] ?? 0) + 1,
    endLine: endLine + 1,
    endColumn: end - (table[endLine] ?? 0) + 1,
  }
}
