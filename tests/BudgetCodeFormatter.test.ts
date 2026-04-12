import { expect, test, describe, beforeEach } from 'vitest';

import type { TableStoreValues } from '@/codeblocks/models';
import { BudgetCodeFormatter } from '@/codeblocks/BudgetCodeFormatter';

describe('BudgetCodeFormatter', () => {
  let formatter: BudgetCodeFormatter;

  beforeEach(() => {
    formatter = new BudgetCodeFormatter();
  });

  describe('format', () => {
    test('should format empty table store values', () => {
      const tableStoreValues: TableStoreValues = {
        categories: new Map(),
        rows: new Map(),
      };

      const result = formatter.format(tableStoreValues);

      expect(result).toBe('```budget\n```');
    });

    test('should format table with categories only', () => {
      const categories = new Map();
      categories.set('cat1', 'Income');
      categories.set('cat2', 'Expenses');

      const tableStoreValues: TableStoreValues = {
        categories,
        rows: new Map(),
      };

      const result = formatter.format(tableStoreValues);

      expect(result).toBe('```budget\nIncome:\nExpenses:\n```');
    });

    test('should format table with categories and rows', () => {
      const categories = new Map();
      categories.set('cat1', 'Income');
      categories.set('cat2', 'Expenses');

      const rows = new Map();
      rows.set('cat1', [
        {
          id: 'row1',
          checked: false,
          name: 'Salary',
          amount: 5000,
          comment: 'Monthly',
        },
        {
          id: 'row2',
          checked: true,
          name: 'Bonus',
          amount: 1000,
          comment: 'Quarterly',
        },
      ]);
      rows.set('cat2', [
        {
          id: 'row3',
          checked: false,
          name: 'Rent',
          amount: 1500,
          comment: 'Housing',
        },
      ]);

      const tableStoreValues: TableStoreValues = {
        categories,
        rows,
      };

      const result = formatter.format(tableStoreValues);

      const expected = `\`\`\`budget
Income:
\t[ ] | Salary | 5000 | Monthly
\t[x] | Bonus  | 1000 | Quarterly
Expenses:
\t[ ] | Rent   | 1500 | Housing
\`\`\``;

      expect(result).toBe(expected);
    });

    test('should format rows without comments', () => {
      const categories = new Map();
      categories.set('cat1', 'Income');

      const rows = new Map();
      rows.set('cat1', [
        {
          id: 'row1',
          checked: false,
          name: 'Salary',
          amount: 5000,
          comment: '',
        },
        {
          id: 'row2',
          checked: true,
          name: 'Bonus',
          amount: 1000,
          comment: '',
        },
      ]);

      const tableStoreValues: TableStoreValues = {
        categories,
        rows,
      };

      const result = formatter.format(tableStoreValues);

      const expected = `\`\`\`budget
Income:
\t[ ] | Salary | 5000
\t[x] | Bonus  | 1000
\`\`\``;

      expect(result).toBe(expected);
    });

    test('should handle empty rows arrays', () => {
      const categories = new Map();
      categories.set('cat1', 'Income');
      categories.set('cat2', 'Expenses');

      const rows = new Map();
      rows.set('cat1', []);
      rows.set('cat2', []);

      const tableStoreValues: TableStoreValues = {
        categories,
        rows,
      };

      const result = formatter.format(tableStoreValues);

      expect(result).toBe('```budget\nIncome:\nExpenses:\n```');
    });

    test('should handle missing rows for categories', () => {
      const categories = new Map();
      categories.set('cat1', 'Income');
      categories.set('cat2', 'Expenses');

      const rows = new Map();
      rows.set('cat1', [
        {
          id: 'row1',
          checked: false,
          name: 'Salary',
          amount: 5000,
          comment: 'Monthly',
        },
      ]);
      // cat2 has no rows

      const tableStoreValues: TableStoreValues = {
        categories,
        rows,
      };

      const result = formatter.format(tableStoreValues);

      const expected = `\`\`\`budget
Income:
\t[ ] | Salary | 5000 | Monthly
Expenses:
\`\`\``;

      expect(result).toBe(expected);
    });

    test('should align columns properly with different lengths', () => {
      const categories = new Map();
      categories.set('cat1', 'Income');

      const rows = new Map();
      rows.set('cat1', [
        {
          id: 'row1',
          checked: false,
          name: 'Short',
          amount: 100,
          comment: 'Test',
        },
        {
          id: 'row2',
          checked: true,
          name: 'Very Long Name That Exceeds Others',
          amount: 999_999,
          comment: 'Long Comment',
        },
        {
          id: 'row3',
          checked: false,
          name: 'Medium',
          amount: 5000,
          comment: '',
        },
      ]);

      const tableStoreValues: TableStoreValues = {
        categories,
        rows,
      };

      const result = formatter.format(tableStoreValues);

      const expected = `\`\`\`budget
Income:
\t[ ] | Short                              | 100    | Test
\t[x] | Very Long Name That Exceeds Others | 999999 | Long Comment
\t[ ] | Medium                             | 5000
\`\`\``;

      expect(result).toBe(expected);
    });

    test('should handle zero amounts', () => {
      const categories = new Map();
      categories.set('cat1', 'Income');

      const rows = new Map();
      rows.set('cat1', [
        {
          id: 'row1',
          checked: false,
          name: 'Zero Amount',
          amount: 0,
          comment: 'Test',
        },
      ]);

      const tableStoreValues: TableStoreValues = {
        categories,
        rows,
      };

      const result = formatter.format(tableStoreValues);

      const expected = `\`\`\`budget
Income:
\t[ ] | Zero Amount | 0 | Test
\`\`\``;

      expect(result).toBe(expected);
    });

    test('should handle decimal amounts', () => {
      const categories = new Map();
      categories.set('cat1', 'Expenses');

      const rows = new Map();
      rows.set('cat1', [
        {
          id: 'row1',
          checked: false,
          name: 'Coffee',
          amount: 3.5,
          comment: 'Daily',
        },
        {
          id: 'row2',
          checked: true,
          name: 'Lunch',
          amount: 12.99,
          comment: 'Work days',
        },
      ]);

      const tableStoreValues: TableStoreValues = {
        categories,
        rows,
      };

      const result = formatter.format(tableStoreValues);

      const expected = `\`\`\`budget
Expenses:
\t[ ] | Coffee | 3.5   | Daily
\t[x] | Lunch  | 12.99 | Work days
\`\`\``;

      expect(result).toBe(expected);
    });

    test('should handle negative amounts', () => {
      const categories = new Map();
      categories.set('cat1', 'Debt');

      const rows = new Map();
      rows.set('cat1', [
        {
          id: 'row1',
          checked: false,
          name: 'Credit Card',
          amount: -1500,
          comment: 'Monthly payment',
        },
        {
          id: 'row2',
          checked: true,
          name: 'Student Loan',
          amount: -500,
          comment: 'Bi-weekly',
        },
      ]);

      const tableStoreValues: TableStoreValues = {
        categories,
        rows,
      };

      const result = formatter.format(tableStoreValues);

      const expected = `\`\`\`budget
Debt:
\t[ ] | Credit Card  | -1500 | Monthly payment
\t[x] | Student Loan | -500  | Bi-weekly
\`\`\``;

      expect(result).toBe(expected);
    });

    test('should handle rows with empty names or amounts', () => {
      const categories = new Map();
      categories.set('cat1', 'Test');

      const rows = new Map();
      rows.set('cat1', [
        {
          id: 'row1',
          checked: false,
          name: '',
          amount: 100,
          comment: 'Empty name',
        },
        {
          id: 'row2',
          checked: true,
          name: 'Valid Row',
          amount: 200,
          comment: 'Valid',
        },
      ]);

      const tableStoreValues: TableStoreValues = {
        categories,
        rows,
      };

      const result = formatter.format(tableStoreValues);

      const expected = `\`\`\`budget
Test:
\t[ ] |           | 100 | Empty name
\t[x] | Valid Row | 200 | Valid
\`\`\``;

      expect(result).toBe(expected);
    });

    test('should keep rows with empty name and zero amount (amount formats as "0")', () => {
      const categories = new Map();
      categories.set('cat1', 'Test');

      const rows = new Map();
      rows.set('cat1', [
        { id: 'row1', checked: false, name: '', amount: 0, comment: '' },
        { id: 'row2', checked: false, name: 'Keep', amount: 500, comment: '' },
      ]);

      const tableStoreValues: TableStoreValues = { categories, rows };
      const result = formatter.format(tableStoreValues);

      // amount: 0 formats as "0" (truthy string), so the skip condition
      // (!parsed.name && !parsed.amount) is false — row is kept
      const expected = `\`\`\`budget
Test:
\t[ ] |      | 0
\t[ ] | Keep | 500
\`\`\``;
      expect(result).toBe(expected);
    });
  });

  describe('round-trip: category names with colons', () => {
    test('should not produce double colons for category name ending with colon', () => {
      const categories = new Map();
      categories.set('cat1', 'Time:');

      const tableStoreValues: TableStoreValues = {
        categories,
        rows: new Map([['cat1', []]]),
      };

      const result = formatter.format(tableStoreValues);

      expect(result).not.toContain('::');
      expect(result).toContain('Time:');
    });

    test('should preserve category name with colon in the middle', () => {
      const categories = new Map();
      categories.set('cat1', 'Food: Weekly');

      const tableStoreValues: TableStoreValues = {
        categories,
        rows: new Map([['cat1', []]]),
      };

      const result = formatter.format(tableStoreValues);

      expect(result).toContain('Food: Weekly:');
      expect(result).not.toContain('Food: Weekly::');
    });
  });
});
