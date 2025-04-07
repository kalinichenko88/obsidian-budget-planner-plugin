import { expect, test, describe } from 'vitest';

import type { TableRow } from '../../../../models';
import { isRowsEqual } from './helpers';

describe('row helpers', () => {
  test('isRowsEqual', () => {
    const row1: TableRow = {
      id: '1',
      name: 'John Doe',
      amount: 100,
      checked: false,
      comment: 'Test comment',
    };

    const row2: TableRow = {
      id: '1',
      name: 'John Doe',
      amount: 100,
      checked: false,
      comment: 'Test comment',
    };

    const row3: TableRow = {
      id: '2',
      name: 'John Smith',
      amount: 100,
      checked: false,
      comment: 'Test comment',
    };

    expect(isRowsEqual(row1, row2)).toBe(true);
    expect(isRowsEqual(row1, row3)).toBe(false);
  });
});
