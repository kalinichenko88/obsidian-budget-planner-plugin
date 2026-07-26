export type RowCells = {
  checkbox: string;
  name: string;
  amount: string;
  comment: string;
};

const CHECKBOX_PATTERN = /^\[[xX ]?\]$/;

/** A `|` that is not preceded by a backslash — i.e. a real column break. */
const COLUMN_BREAK = /(?<!\\)\|/;

/**
 * Escapes a value for a fixed-arity cell (name, amount).
 *
 * Those cells are counted from the left, so a raw `|` inside one would be read
 * as a column break and shift every later cell along. The comment needs no
 * escaping: it is the whole remaining tail, so its pipes are unambiguous.
 */
export function escapeCell(value: string): string {
  return value.replaceAll('|', String.raw`\|`);
}

function unescapeCell(value: string): string {
  return value.replaceAll(String.raw`\|`, '|');
}

/**
 * Splits a budget row into its four logical cells.
 *
 * Name and amount are fixed-arity from the left and arrive escaped; the comment
 * is the entire remaining tail, rejoined with its pipes intact so that
 * `[[Note|alias]]` and other pipe-bearing markdown survive a round-trip.
 */
export function splitRowCells(line: string): RowCells {
  const cells = line.split(COLUMN_BREAK);
  const first = cells[0].trim();
  const hasCheckbox = CHECKBOX_PATTERN.test(first);
  const offset = hasCheckbox ? 1 : 0;

  return {
    checkbox: hasCheckbox ? first : '',
    name: unescapeCell((cells[offset] ?? '').trim()),
    amount: unescapeCell((cells[offset + 1] ?? '').trim()),
    comment: cells
      .slice(offset + 2)
      .join('|')
      .trim(),
  };
}
