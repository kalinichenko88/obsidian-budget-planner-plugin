import type { TableCategories, TableRows, CategoryId, TableRow } from './models';
import { generateId } from './helpers/generateId';

type ParseReturn = {
  categories: TableCategories;
  rows: TableRows;
};

export class BudgetCodeParser {
  protected readonly rawData: string[];
  protected readonly categories: TableCategories;
  protected readonly rows: TableRows;

  constructor(code: string) {
    this.rawData = code.split('\n');
    this.categories = new Map();
    this.rows = new Map();
  }

  protected isCategoryRow(line: string): boolean {
    return line.endsWith(':') && !line.startsWith('\t');
  }

  protected isCheckboxCell(cell: string): boolean {
    return cell === '[ ]' || cell === '[]' || cell === '[x]' || cell === '[X]';
  }

  protected getCheckboxState(cell: string): boolean {
    return cell === '[x]' || cell === '[X]';
  }

  public parse(): ParseReturn {
    let categoryId: CategoryId = '';

    for (const line of this.rawData) {
      if (this.isCategoryRow(line)) {
        categoryId = generateId();
        this.categories.set(categoryId, line.replace(/:$/, ''));
        continue;
      }

      const rowLine = line.split('|').map((cell) => cell.trim());

      const isFirstCellCheckbox = this.isCheckboxCell(rowLine[0]);

      const checked = isFirstCellCheckbox ? this.getCheckboxState(rowLine[0]) : false;
      const name = isFirstCellCheckbox ? rowLine[1] : rowLine[0];
      const amount = isFirstCellCheckbox ? rowLine[2] : rowLine[1];
      const comment = isFirstCellCheckbox ? rowLine[3] : rowLine[2];

      const row: TableRow = {
        id: generateId(),
        checked,
        name,
        amount: parseFloat(amount) || 0,
        comment: comment || '',
      };

      const rows = this.rows.get(categoryId) || [];
      rows.push(row);

      this.rows.set(categoryId, rows);
    }

    return {
      categories: this.categories,
      rows: this.rows,
    };
  }
}
