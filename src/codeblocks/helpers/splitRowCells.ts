export type RowCells = {
  checkbox: string;
  name: string;
  amount: string;
  comment: string;
};

const CHECKBOX_PATTERN = /^\[[xX ]?\]$/;

/** A `|` that is not preceded by a backslash — i.e. a real column break. */
const COLUMN_BREAK = /(?<!\\)\|/;

/** Escapes `|` in the name cell — a raw pipe there reads as a column break. */
export function escapeCell(value: string): string {
  return value.replaceAll('|', String.raw`\|`);
}

/**
 * Splits a budget row into its four logical cells. The comment is the entire
 * remaining tail, rejoined with its pipes intact, so `[[Note|alias]]` survives.
 */
export function splitRowCells(line: string): RowCells {
  const cells = line.split(COLUMN_BREAK);
  const first = cells[0].trim();
  const hasCheckbox = CHECKBOX_PATTERN.test(first);
  const offset = hasCheckbox ? 1 : 0;

  return {
    checkbox: hasCheckbox ? first : '',
    name: (cells[offset] ?? '').trim().replaceAll(String.raw`\|`, '|'),
    amount: (cells[offset + 1] ?? '').trim(),
    comment: cells
      .slice(offset + 2)
      .join('|')
      .trim(),
  };
}
