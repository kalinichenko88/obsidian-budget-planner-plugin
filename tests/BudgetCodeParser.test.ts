import { expect, test, describe } from 'vitest';

import type { TableRow } from '@/codeblocks/models';
import { BudgetCodeParser } from '@/codeblocks/BudgetCodeParser';

describe('BudgetCodeParser', () => {
  test('should parse empty code', () => {
    const parser = new BudgetCodeParser('');
    const result = parser.parse();

    expect(result.categories.size).toBe(0);
    expect(result.rows.size).toBe(0);
  });

  test('should parse code with categories only', () => {
    const code = 'Income:\nExpenses:';
    const parser = new BudgetCodeParser(code);
    const result = parser.parse();
    const categoryIds = Array.from(result.categories.keys());

    expect(result.categories.size).toBe(2);
    expect(result.categories.get(categoryIds[0])).toBe('Income');
    expect(result.categories.get(categoryIds[1])).toBe('Expenses');
    expect(result.rows.size).toBe(0);
  });

  test('should parse code with categories and rows', () => {
    const code = 'Income:\n\tSalary | 5000 | Monthly\nExpenses:\n\tRent | 1500 | Housing';
    const parser = new BudgetCodeParser(code);
    const result = parser.parse();
    const categoryIds = Array.from(result.categories.keys());

    expect(result.categories.size).toBe(2);
    expect(result.rows.size).toBe(2);

    const incomeRows = result.rows.get(categoryIds[0]) as TableRow[];
    expect(incomeRows).toBeInstanceOf(Array);
    expect(incomeRows).toHaveLength(1);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _incomeId, ...expectedIncomeRow } = incomeRows[0];

    expect(expectedIncomeRow).toEqual({
      checked: false,
      name: 'Salary',
      amount: 5000,
      comment: 'Monthly',
    });

    const expenseRows = result.rows.get(categoryIds[1]) as TableRow[];
    expect(expenseRows).toBeInstanceOf(Array);
    expect(expenseRows).toHaveLength(1);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _expenseId, ...expectedExpenseRow } = expenseRows[0];

    expect(expectedExpenseRow).toEqual({
      checked: false,
      name: 'Rent',
      amount: 1500,
      comment: 'Housing',
    });
  });

  test('should parse checkbox rows correctly', () => {
    const code =
      'Shopping:\n\t[x] | Groceries | 120.50 | Weekly\n\t[ ] | Electronics | 500 | As needed';
    const parser = new BudgetCodeParser(code);
    const result = parser.parse();

    const categoryId = result.categories.keys().next().value;
    expect(categoryId).toBeTypeOf('string');

    expect(result.categories.size).toBe(1);
    const rows = result.rows.get(categoryId) as TableRow[];
    expect(rows).toBeInstanceOf(Array);
    expect(rows).toHaveLength(2);

    expect(rows[0].checked).toBe(true);
    expect(rows[0].name).toBe('Groceries');
    expect(rows[0].amount).toBe(120.5);

    expect(rows[1].checked).toBe(false);
    expect(rows[1].name).toBe('Electronics');
    expect(rows[1].amount).toBe(500);
  });

  test('should handle amount parsing correctly', () => {
    const code = 'Finances:\n\tSavings | $1,234.56 | Account\n\tDebt | -500.75€ | Credit card';
    const parser = new BudgetCodeParser(code);
    const result = parser.parse();

    const categoryId = result.categories.keys().next().value;
    expect(categoryId).toBeTypeOf('string');

    const rows = result.rows.get(categoryId) as TableRow[];
    expect(rows).toBeInstanceOf(Array);
    expect(rows).toHaveLength(2);
    expect(rows[0].amount).toBe(1234.56);
    expect(rows[1].amount).toBe(-500.75);
  });

  test('should ignore empty lines', () => {
    const code = 'Category 1:\n\tItem 1 | 100\nCategory 2:\n\tItem 2 | 200';
    const parser = new BudgetCodeParser(code);
    const result = parser.parse();

    expect(result.categories.size).toBe(2);
    expect(result.rows.size).toBe(2);
  });

  // test('should handle rows without catgories', () => {
  //   const code = 'Salary | 5000 | Monthly\nRent | 1500 | Housing';
  //   const parser = new BudgetCodeParser(code);
  //   const result = parser.parse();

  //   expect(result.categories.size).toBe(2);
  //   expect(result.rows.size).toBe(2);
  // });
});
