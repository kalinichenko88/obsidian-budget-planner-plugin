import type { TableRow } from '../../../../models';

export const isRowsEqual = (sourceRow: TableRow, descRow: TableRow): boolean => {
  return Object.keys(sourceRow).every((key: keyof TableRow) => sourceRow[key] === descRow[key]);
};
