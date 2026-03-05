import { expect, test, describe } from 'vitest';

import type { TableRow } from '../../../../models';
import { isRowsEqual } from './helpers';

describe('row helpers', () => {
  const baseRow: TableRow = {
    id: '1',
    name: 'John Doe',
    amount: 100,
    checked: false,
    comment: 'Test comment',
  };

  test('should return true for identical rows', () => {
    const row2: TableRow = { ...baseRow };
    expect(isRowsEqual(baseRow, row2)).toBe(true);
  });

  test('should return false when id differs', () => {
    const row2: TableRow = { ...baseRow, id: '2' };
    expect(isRowsEqual(baseRow, row2)).toBe(false);
  });

  test('should return false when name differs', () => {
    const row2: TableRow = { ...baseRow, name: 'Jane Doe' };
    expect(isRowsEqual(baseRow, row2)).toBe(false);
  });

  test('should return false when amount differs', () => {
    const row2: TableRow = { ...baseRow, amount: 200 };
    expect(isRowsEqual(baseRow, row2)).toBe(false);
  });

  test('should return false when checked differs', () => {
    const row2: TableRow = { ...baseRow, checked: true };
    expect(isRowsEqual(baseRow, row2)).toBe(false);
  });

  test('should return false when comment differs', () => {
    const row2: TableRow = { ...baseRow, comment: 'Different' };
    expect(isRowsEqual(baseRow, row2)).toBe(false);
  });
});
