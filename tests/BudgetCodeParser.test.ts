import { expect, test, describe, vi, beforeEach } from 'vitest';

import { BudgetCodeParser } from '../src/codeblocks/BudgetCodeParser';

describe('BudgetCodeParser', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.mock('../src/codeblocks/helpers/generateId', () => ({
      generateId: vi
        .fn()
        .mockReturnValueOnce('id-1')
        .mockReturnValueOnce('id-2')
        .mockReturnValueOnce('id-3')
        .mockReturnValueOnce('id-4')
        .mockReturnValueOnce('id-5'),
    }));
  });

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

    expect(result.categories.size).toBe(2);
    expect(result.categories.get('id-1')).toBe('Income');
    expect(result.categories.get('id-2')).toBe('Expenses');
    expect(result.rows.size).toBe(0);
  });

  test('should parse code with categories and rows', () => {
    const code = 'Income:\nSalary | 5000 | Monthly\nExpenses:\nRent | 1500 | Housing';
    const parser = new BudgetCodeParser(code);
    const result = parser.parse();

    expect(result.categories.size).toBe(2);
    expect(result.rows.size).toBe(2);

    const incomeRows = result.rows.get('id-1');
    expect(incomeRows).toHaveLength(1);
    expect(incomeRows?.[0]).toEqual({
      id: 'id-2',
      checked: false,
      name: 'Salary',
      amount: 5000,
      comment: 'Monthly',
    });

    const expenseRows = result.rows.get('id-3');
    expect(expenseRows).toHaveLength(1);
    expect(expenseRows?.[0]).toEqual({
      id: 'id-4',
      checked: false,
      name: 'Rent',
      amount: 1500,
      comment: 'Housing',
    });
  });

  test('should parse checkbox rows correctly', () => {
    const code =
      'Shopping:\n[x] | Groceries | 120.50 | Weekly\n[ ] | Electronics | 500 | As needed';
    const parser = new BudgetCodeParser(code);
    const result = parser.parse();

    expect(result.categories.size).toBe(1);
    const rows = result.rows.get('id-1');
    expect(rows).toHaveLength(2);

    expect(rows?.[0].checked).toBe(true);
    expect(rows?.[0].name).toBe('Groceries');
    expect(rows?.[0].amount).toBe(120.5);

    expect(rows?.[1].checked).toBe(false);
    expect(rows?.[1].name).toBe('Electronics');
    expect(rows?.[1].amount).toBe(500);
  });

  test('should handle amount parsing correctly', () => {
    const code = 'Finances:\nSavings | $1,234.56 | Account\nDebt | -500.75€ | Credit card';
    const parser = new BudgetCodeParser(code);
    const result = parser.parse();

    const rows = result.rows.get('id-1');
    expect(rows?.[0].amount).toBe(1234.56);
    expect(rows?.[1].amount).toBe(-500.75);
  });

  test('should ignore empty lines', () => {
    const code = 'Category 1:\n\nItem 1 | 100\n\n\nCategory 2:\nItem 2 | 200';
    const parser = new BudgetCodeParser(code);
    const result = parser.parse();

    expect(result.categories.size).toBe(2);
    expect(result.rows.size).toBe(2);
  });
});
