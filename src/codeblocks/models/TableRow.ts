import type { RowId } from './RowId';

export type TableRow = {
	id: RowId;
	checked: boolean;
	name: string;
	amount: number;
	comment: string;
};
