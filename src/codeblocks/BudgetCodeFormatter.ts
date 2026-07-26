import type { TableStoreValues, TableRow } from './models';
import { escapeCell } from './helpers/splitRowCells';

type Line =
  { category: string } | { checkbox: string; name: string; amount: string; comment: string };

export class BudgetCodeFormatter {
  private toLines(values: TableStoreValues): Line[] {
    const lines: Line[] = [];

    values.categories.forEach((categoryName, categoryId) => {
      lines.push({ category: `${categoryName.replace(/:+$/, '')}:`.trim() });

      for (const row of values.rows.get(categoryId) || []) {
        const line = {
          checkbox: row.checked ? '[x]' : '[ ]',
          // Name is counted from the left, so a raw `|` in it would be read
          // back as a column break and swallow the amount.
          name: escapeCell(row.name || ''),
          amount: this.formatAmount(row),
          comment: row.comment || '',
        };

        // A row with neither a name nor an amount carries nothing.
        if (line.name || line.amount) {
          lines.push(line);
        }
      }
    });

    return lines;
  }

  private formatAmount(row: TableRow): string {
    return row.amount?.toString() || '';
  }

  public format(values: TableStoreValues): string {
    const lines = this.toLines(values);

    // Only rows carrying both values take part in column alignment, and the
    // comment never does — it is last, so its length cannot shift anything.
    let nameWidth = 0;
    let amountWidth = 0;
    for (const line of lines) {
      if (!('category' in line) && line.name && line.amount) {
        nameWidth = Math.max(nameWidth, line.name.length);
        amountWidth = Math.max(amountWidth, line.amount.length);
      }
    }

    const parts = lines.map((line) => {
      if ('category' in line) {
        return line.category;
      }

      const row = `\t${line.checkbox} | ${line.name.padEnd(nameWidth)} | ${line.amount.padEnd(amountWidth)}`;
      return (line.comment ? `${row} | ${line.comment}` : row).replace(/\s+$/, '');
    });

    const content = parts.join('\n');
    return `\`\`\`budget\n${content}${content ? '\n' : ''}\`\`\``;
  }
}
