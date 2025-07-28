import type { TableStoreValues, TableRow } from './models';

type ParsedRow = {
  checkbox: string;
  name: string;
  amount: string;
  comment: string;
  isCategory: boolean;
};

export class BudgetCodeFormatter {
  private readonly CHECKBOX_PATTERN = /^\[[xX ]\]$/;
  private readonly CELL_SEPARATOR = '|';

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

    const cells = row.split(this.CELL_SEPARATOR).map((cell) => cell.trim());
    const isCheckbox = this.CHECKBOX_PATTERN.test(cells[0]);

    return {
      checkbox: isCheckbox ? cells[0] : '[ ]',
      name: isCheckbox ? cells[1] || '' : cells[0] || '',
      amount: isCheckbox ? cells[2] || '' : cells[1] || '',
      comment: isCheckbox ? cells[3] || '' : cells[2] || '',
      isCategory: false,
    };
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
      parts.push(`${categoryName}:`);
      const rows = values.rows.get(categoryId) || [];
      rows.forEach((row) => {
        parts.push(this.formatRow(row));
      });
    });

    return parts.join('\n');
  }

  private formatCode(code: string): string {
    const rows = code.split('\n').filter((row) => row.trim());
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

      if (!parsed.name || !parsed.amount) continue;

      const paddedName = parsed.name.padEnd(maxNameLength, ' ');
      const paddedAmount = parsed.amount.padEnd(maxAmountLength, ' ');

      let formattedRow = `\t${parsed.checkbox} | ${paddedName} | ${paddedAmount}`;
      if (parsed.comment) {
        formattedRow += ` | ${parsed.comment}`;
      }
      resultParts.push(formattedRow);
    }

    const content = resultParts.join('\n');
    return `\`\`\`budget\n${content}${content ? '\n' : ''}\`\`\``;
  }

  public format(tableStoreValues: TableStoreValues): string {
    const code = this.convertToString(tableStoreValues);
    return this.formatCode(code);
  }
}
