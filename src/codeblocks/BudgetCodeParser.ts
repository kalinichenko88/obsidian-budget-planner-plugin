import type { TableCategories, TableRows, CategoryId, TableRow } from './models';
import { generateId } from './helpers/generateId';
import { splitRowCells } from './helpers/splitRowCells';

type ParseReturn = {
  categories: TableCategories;
  rows: TableRows;
};

export const NO_CATEGORY_ID = 'no-category-id';
export const NO_CATEGORY_NAME = 'no-category-name';

export class BudgetCodeParser {
  protected readonly rawData: string[];
  protected readonly categories: TableCategories;
  protected readonly rows: TableRows;

  constructor(code: string) {
    this.rawData = code.split(/\r?\n/);
    this.categories = new Map();
    this.rows = new Map();
  }

  protected isCategoryRow(line: string): boolean {
    return line.endsWith(':') && !line.startsWith('\t');
  }

  protected getCheckboxState(cell: string): boolean {
    return cell === '[x]' || cell === '[X]';
  }

  protected parseAmount(value: string): number {
    if (!value || value.trim() === '') return 0;

    const sanitized = value.replaceAll(/[^\d.-]/g, '');
    const amount = parseFloat(sanitized);

    return isNaN(amount) ? 0 : amount;
  }

  public parse(): ParseReturn {
    let categoryId: CategoryId = NO_CATEGORY_ID;

    for (const line of this.rawData) {
      if (!line.trim()) {
        continue;
      }

      if (this.isCategoryRow(line)) {
        categoryId = generateId();
        this.categories.set(categoryId, line.replace(/:$/, ''));
        continue;
      }

      if (!line.includes('|')) {
        continue;
      }

      const cells = splitRowCells(line);

      const row: TableRow = {
        id: generateId(),
        checked: this.getCheckboxState(cells.checkbox),
        name: cells.name,
        amount: this.parseAmount(cells.amount),
        comment: cells.comment,
      };

      const rows = this.rows.get(categoryId) || [];
      rows.push(row);

      this.rows.set(categoryId, rows);
    }

    if (this.rows.size > 0 && this.categories.size === 0) {
      this.categories.set(NO_CATEGORY_ID, NO_CATEGORY_NAME);
    }

    return {
      categories: this.categories,
      rows: this.rows,
    };
  }
}
