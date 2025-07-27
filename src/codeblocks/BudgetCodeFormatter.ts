import type { TableStoreValues, TableRow } from './models';

export class BudgetCodeFormatter {
  private isCategoryRow(line: string): boolean {
    return line.endsWith(':') && !line.startsWith('\t');
  }

  private formatRow(row: TableRow): string {
    const checked = row.checked ? '[x]' : '[ ]';
    const name = row.name || '';
    const amount = row.amount?.toString() || '';
    const comment = row.comment || '';

    return `\t${checked} | ${name} | ${amount}${comment ? ` | ${comment}` : ''}\n`;
  }

  private convertToString(values: TableStoreValues): string {
    let result = '';

    values.categories.forEach((categoryName, categoryId) => {
      result += `${categoryName}:\n`;
      const rows = values.rows.get(categoryId) || [];
      rows.forEach((row) => {
        result += this.formatRow(row);
      });
    });

    return result;
  }

  private calculateMaxLengths(rows: string[]): { maxNameLength: number; maxAmountLength: number } {
    let maxNameLength = 0;
    let maxAmountLength = 0;

    for (const row of rows) {
      if (!row.startsWith('\t')) continue;

      const cells = row.split('|').map((cell) => cell.trim());
      const isCheckbox = cells[0] === '[ ]' || cells[0] === '[x]' || cells[0] === '[X]';
      const name = isCheckbox ? cells[1] : cells[0];
      const amount = isCheckbox ? cells[2] || '' : cells[1] || '';

      maxNameLength = Math.max(maxNameLength, name.length);
      maxAmountLength = Math.max(maxAmountLength, amount.length);
    }

    return { maxNameLength, maxAmountLength };
  }

  private parseRowCells(row: string): {
    checkbox: string;
    name: string;
    amount: string;
    comment: string;
  } {
    const cells = row.split('|').map((cell) => cell.trim());
    const isCheckbox = cells[0] === '[ ]' || cells[0] === '[x]' || cells[0] === '[X]';

    return {
      checkbox: isCheckbox ? cells[0] : '[ ]',
      name: isCheckbox ? cells[1] : cells[0],
      amount: isCheckbox ? cells[2] || '' : cells[1] || '',
      comment: isCheckbox ? cells[3] || '' : cells[2] || '',
    };
  }

  private formatCode(code: string): string {
    const rows = code.split('\n').filter((row) => row.trim());
    const { maxNameLength, maxAmountLength } = this.calculateMaxLengths(rows);
    let result = '';

    for (const row of rows) {
      if (this.isCategoryRow(row)) {
        result += row.trim() + '\n';
        continue;
      }

      if (!row.startsWith('\t')) continue;

      const { checkbox, name, amount, comment } = this.parseRowCells(row);

      if (!name || !amount) continue;

      const paddedName = name.padEnd(maxNameLength, ' ');
      const paddedAmount = amount.padEnd(maxAmountLength, ' ');

      let formattedRow = `\t${checkbox} | ${paddedName} | ${paddedAmount}`;
      if (comment) {
        formattedRow += ` | ${comment}`;
      }
      result += formattedRow + '\n';
    }

    return `\`\`\`budget\n${result}\`\`\``;
  }

  public format(tableStoreValues: TableStoreValues): string {
    const code = this.convertToString(tableStoreValues);
    const formattedCode = this.formatCode(code);

    return formattedCode;
  }
}
