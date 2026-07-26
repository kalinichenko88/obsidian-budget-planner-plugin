export type RowCells = {
  checkbox: string;
  name: string;
  amount: string;
  comment: string;
};

const CHECKBOX_PATTERN = /^\[[xX ]?\]$/;

/**
 * Splits a budget row into its four logical cells.
 *
 * Name and amount are fixed-arity from the left; the comment is the entire
 * remaining tail, rejoined with its pipes intact so that `[[Note|alias]]`
 * and other pipe-bearing markdown survive a round-trip.
 */
export function splitRowCells(line: string): RowCells {
  const cells = line.split('|');
  const first = cells[0].trim();
  const hasCheckbox = CHECKBOX_PATTERN.test(first);
  const offset = hasCheckbox ? 1 : 0;

  return {
    checkbox: hasCheckbox ? first : '',
    name: (cells[offset] ?? '').trim(),
    amount: (cells[offset + 1] ?? '').trim(),
    comment: cells
      .slice(offset + 2)
      .join('|')
      .trim(),
  };
}
