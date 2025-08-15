import type { TableRow } from '../../../../models';

export const isRowsEqual = (a: TableRow, b: TableRow): boolean =>
  a.id === b.id &&
  a.checked === b.checked &&
  a.name === b.name &&
  a.amount === b.amount &&
  a.comment === b.comment;
