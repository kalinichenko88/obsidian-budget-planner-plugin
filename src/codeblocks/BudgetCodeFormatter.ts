import type { TableStoreValues } from './models';
import { escapeCell, type RowCells } from './helpers/splitRowCells';

type Line = string | RowCells;

export function formatBudget(values: TableStoreValues): string {
  const lines: Line[] = [];

  values.categories.forEach((categoryName, categoryId) => {
    lines.push(`${categoryName.replace(/:+$/, '')}:`.trim());

    for (const row of values.rows.get(categoryId) || []) {
      const line = {
        checkbox: row.checked ? '[x]' : '[ ]',
        // Name is counted from the left, so a raw `|` in it would be read
        // back as a column break and swallow the amount.
        name: escapeCell(row.name || ''),
        amount: row.amount?.toString() || '',
        comment: row.comment || '',
      };

      // A row with neither a name nor an amount carries nothing.
      if (line.name || line.amount) {
        lines.push(line);
      }
    }
  });

  // Only rows carrying both values take part in column alignment.
  const wide = lines.filter((l): l is RowCells => typeof l !== 'string' && !!l.name && !!l.amount);
  const nameWidth = Math.max(0, ...wide.map((r) => r.name.length));
  const amountWidth = Math.max(0, ...wide.map((r) => r.amount.length));

  const content = lines
    .map((line) => {
      if (typeof line === 'string') return line;

      const row = `\t${line.checkbox} | ${line.name.padEnd(nameWidth)} | ${line.amount.padEnd(amountWidth)}`;
      return (line.comment ? `${row} | ${line.comment}` : row).replace(/\s+$/, '');
    })
    .join('\n');

  return `\`\`\`budget\n${content}${content ? '\n' : ''}\`\`\``;
}
