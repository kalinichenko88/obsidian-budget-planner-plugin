import { get } from 'svelte/store';

import type { CategoryId, RowId, TableRow, TableStore } from '../../../models';
import { generateId } from '../../../helpers/generateId';

export function createStoreActions(store: TableStore) {
	return {
		getCategoryByRowId: (rowId: RowId) => {
			for (const [categoryId, categoryRows] of get(store).rows) {
				const row = categoryRows.find((row) => row.id === rowId);

				if (row) {
					return categoryId;
				}
			}

			return '';
		},
		selectRow: (rowId: RowId) => {
			store.update((data) => {
				data.selectedRowId = rowId;

				return data;
			});
		},
		newRow: (categoryId: CategoryId | undefined) => {
			let selectedCategoryId = categoryId;
			if (!selectedCategoryId) {
				const rowId = get(store).selectedRowId;
				selectedCategoryId = this.getCategoryByRowId(rowId);
			}

			console.log({ selectedCategoryId });

			store.update((state) => {
				const { rows } = state;
				const categoryRows = rows.get(selectedCategoryId) || [];

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
		},
		deleteSelectedRow: () => {
			const rowId = get(store).selectedRowId;

			store.update((state) => {
				const { rows } = state;

				for (const [categoryId, categoryRows] of rows) {
					const newRows = categoryRows.filter((row) => row.id !== rowId);

					rows.set(categoryId, newRows);
				}

				return state;
			});
		},
		newCategory: () => {
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
		},
	};
}

export type StoreActions = ReturnType<typeof createStoreActions>;
