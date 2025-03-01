import { get } from 'svelte/store';

import type { CategoryId, RowId, TableRow, TableStore } from '../../../models';
import { generateId } from '../../../helpers/generateId';

export function createStoreActions(store: TableStore) {
  const getCategoryByRowId = (rowId: RowId) => {
    for (const [categoryId, categoryRows] of get(store).rows) {
      const row = categoryRows.find((row) => row.id === rowId);

      if (row) {
        return categoryId;
      }
    }

    return '';
  };

  return {
    selectRow: (rowId: RowId | null) => {
      store.update((data) => {
        data.selectedRowId = rowId ? rowId : '';

        return data;
      });
    },
    newRow: (categoryId?: CategoryId) => {
      let selectedCategoryId: CategoryId | undefined = categoryId;
      if (!selectedCategoryId) {
        const rowId = get(store).selectedRowId;
        selectedCategoryId = getCategoryByRowId(rowId);
      }

      if (!selectedCategoryId) {
        return;
      }

      store.update((state) => {
        const { rows } = state;
        const categoryRows = rows.get(selectedCategoryId) || [];
        const rowId = generateId();

        const newRow: TableRow = {
          id: rowId,
          checked: false,
          name: '',
          amount: 0,
          comment: '',
        };

        rows.set(selectedCategoryId, [...categoryRows, newRow]);

        return {
          ...state,
          selectedRowId: rowId,
        };
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
        const newRowId = generateId();

        const newRow: TableRow = {
          id: newRowId,
          checked: false,
          name: '',
          amount: 0,
          comment: '',
        };

        categories.set(newCategory, 'New Category');
        rows.set(newCategory, [newRow]);

        return {
          ...state,
          selectedRowId: newRowId,
        };
      });
    },
    deleteCategory: (categoryId: CategoryId) => {
      store.update((state) => {
        const { categories, rows } = state;

        categories.delete(categoryId);
        rows.delete(categoryId);

        return state;
      });
    },
  };
}

export type StoreActions = ReturnType<typeof createStoreActions>;
