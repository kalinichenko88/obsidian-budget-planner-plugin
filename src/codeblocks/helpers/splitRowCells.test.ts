import { expect, test, describe } from 'vitest';

import { splitRowCells } from './splitRowCells';

describe('splitRowCells', () => {
  test('should split a row with a checkbox', () => {
    expect(splitRowCells('\t[x] | Hotel | 1500 | Booked')).toEqual({
      checkbox: '[x]',
      name: 'Hotel',
      amount: '1500',
      comment: 'Booked',
    });
  });

  test('should split a row without a checkbox', () => {
    expect(splitRowCells('\tHotel | 1500 | Booked')).toEqual({
      checkbox: '',
      name: 'Hotel',
      amount: '1500',
      comment: 'Booked',
    });
  });

  test('should keep a pipe inside the comment', () => {
    expect(splitRowCells('\t[x] | Hotel | 1500 | [[Trip/Rome|Rome]]').comment).toBe(
      '[[Trip/Rome|Rome]]'
    );
  });

  test('should keep several pipes inside the comment', () => {
    expect(splitRowCells('\t[ ] | A | 1 | a | b | c').comment).toBe('a | b | c');
  });

  test('should preserve inner whitespace of the comment', () => {
    expect(splitRowCells('\t[ ] | A | 1 |   [[Note | alias]]  ').comment).toBe('[[Note | alias]]');
  });

  test('should return empty strings for missing trailing cells', () => {
    expect(splitRowCells('\t[ ] | A')).toEqual({
      checkbox: '[ ]',
      name: 'A',
      amount: '',
      comment: '',
    });
  });

  test('should accept every checkbox spelling the parser accepted', () => {
    expect(splitRowCells('\t[] | A | 1').checkbox).toBe('[]');
    expect(splitRowCells('\t[X] | A | 1').checkbox).toBe('[X]');
  });

  test('should treat a non-checkbox first cell as the name', () => {
    expect(splitRowCells('\t[maybe] | 1 | c')).toEqual({
      checkbox: '',
      name: '[maybe]',
      amount: '1',
      comment: 'c',
    });
  });
});
