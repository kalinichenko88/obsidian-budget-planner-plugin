import { fromStore, writable, type Writable } from 'svelte/store';

import type { TableCategories, TableRow, TableRows } from '../../../models';
import { generateId } from '../../../helpers/generateId';

type State = {
	selectedRowId: string;
	categories: TableCategories;
	rows: TableRows;
};

export const store: Writable<State> = writable({
	selectedRowId: '',
	categories: new Map(),
	rows: new Map(),
});

export const getSelectedRowId = () => fromStore(store).current.selectedRowId;

export const getCategoryByRowId = (rowId: string) => {
	const { rows } = fromStore(store).current;

	for (const [categoryId, categoryRows] of rows) {
		const row = categoryRows.find((row) => row.id === rowId);

		if (row) {
			return categoryId;
		}
	}

	return '';
};

export const newCategory = () => {
	store.update((state) => {
		const { categories, rows } = state;
		const newCategory = generateId();

		const newRow: TableRow = {
			id: generateId(),
			checked: false,
			name: '',
			amount: 0,
			comment: '',
		};

		categories.set(newCategory, '');
		rows.set(newCategory, [newRow]);

		return state;
	});
};

export const newRow = (categoryId: string) => {
	store.update((state) => {
		const { rows } = state;
		const categoryRows = rows.get(categoryId) || [];

		const newRow: TableRow = {
			id: generateId(),
			checked: false,
			name: '',
			amount: 0,
			comment: '',
		};

		rows.set(categoryId, [...categoryRows, newRow]);

		return state;
	});
};

export const deleteRow = (rowId: string) => {
	store.update((state) => {
		const { rows } = state;

		for (const [categoryId, categoryRows] of rows) {
			const newRows = categoryRows.filter((row) => row.id !== rowId);

			rows.set(categoryId, newRows);
		}

		return state;
	});
};
