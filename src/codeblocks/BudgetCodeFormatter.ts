import type { TableStoreValues, TableRow } from './models';
import { splitRowCells, type RowCells } from './helpers/splitRowCells';

type ParsedRow = RowCells & { isCategory: boolean };

export class BudgetCodeFormatter {
  private isCategoryRow(line: string): boolean {
    return line.endsWith(':') && !line.startsWith('\t');
  }

  private parseRow(row: string): ParsedRow {
    if (this.isCategoryRow(row)) {
      return {
        checkbox: '',
        name: row.trim(),
        amount: '',
        comment: '',
        isCategory: true,
      };
    }

    if (!row.startsWith('\t')) {
      return {
        checkbox: '[ ]',
        name: row.trim(),
        amount: '',
        comment: '',
        isCategory: false,
      };
    }

    const cells = splitRowCells(row);

    return { ...cells, checkbox: cells.checkbox || '[ ]', isCategory: false };
  }

  private formatRow(row: TableRow): string {
    const checked = row.checked ? '[x]' : '[ ]';
    const name = row.name || '';
    const amount = row.amount?.toString() || '';
    const comment = row.comment || '';

    return `\t${checked} | ${name} | ${amount}${comment ? ` | ${comment}` : ''}\n`;
  }

  private convertToString(values: TableStoreValues): string {
    const parts: string[] = [];

    values.categories.forEach((categoryName, categoryId) => {
      parts.push(`${categoryName.replace(/:+$/, '')}:`);
      const rows = values.rows.get(categoryId) || [];
      rows.forEach((row) => {
        parts.push(this.formatRow(row));
      });
    });

    return parts.join('\n');
  }

  private formatCode(code: string): string {
    const rows = code.split(/\r?\n/).filter((row) => row.trim());
    const parsedRows: ParsedRow[] = [];

    let maxNameLength = 0;
    let maxAmountLength = 0;

    for (const row of rows) {
      const parsed = this.parseRow(row);
      parsedRows.push(parsed);

      if (!parsed.isCategory && parsed.name && parsed.amount) {
        maxNameLength = Math.max(maxNameLength, parsed.name.length);
        maxAmountLength = Math.max(maxAmountLength, parsed.amount.length);
      }
    }

    // Build result using array join for better performance
    const resultParts: string[] = [];

    for (const parsed of parsedRows) {
      if (parsed.isCategory) {
        resultParts.push(parsed.name);
        continue;
      }

      if (!parsed.name && !parsed.amount) continue;

      const paddedName = parsed.name.padEnd(maxNameLength, ' ');
      const paddedAmount = parsed.amount.padEnd(maxAmountLength, ' ');

      let formattedRow = `\t${parsed.checkbox} | ${paddedName} | ${paddedAmount}`;
      if (parsed.comment) {
        formattedRow += ` | ${parsed.comment}`;
      }
      resultParts.push(formattedRow.replace(/\s+$/, ''));
    }

    const content = resultParts.join('\n');
    return `\`\`\`budget\n${content}${content ? '\n' : ''}\`\`\``;
  }

  public format(tableStoreValues: TableStoreValues): string {
    const code = this.convertToString(tableStoreValues);
    return this.formatCode(code);
  }
}
