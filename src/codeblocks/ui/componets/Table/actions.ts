import { get } from 'svelte/store';

import type { CategoryId, RowId, TableRow, TableStore } from '../../../models';
import { generateId } from '../../../helpers/generateId';
import { SortColumn, SortOrder } from './models';

export function createStoreActions(store: TableStore) {
  const getCategoryByRowId = (rowId: RowId): CategoryId => {
    for (const [categoryId, categoryRows] of get(store).rows) {
      const row = categoryRows.find((row) => row.id === rowId);

      if (row) {
        return categoryId;
      }
    }

    return '';
  };

  return {
    selectRow: (rowId: RowId | null): void => {
      if (get(store).selectedRowId === rowId) {
        return;
      }

      return store.update((data) => {
        data.selectedRowId = rowId ?? '';

        return data;
      });
    },
    newRow: (categoryId?: CategoryId): void => {
      let selectedCategoryId: CategoryId | undefined = categoryId;
      if (!selectedCategoryId) {
        const rowId = get(store).selectedRowId;
        selectedCategoryId = getCategoryByRowId(rowId);
      }

      if (!selectedCategoryId) {
        return;
      }

      return store.update((state) => {
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
    updateRow: (rowId: RowId, data: Partial<TableRow>): void => {
      return store.update((state) => {
        const { rows } = state;

        for (const [categoryId, categoryRows] of rows) {
          const updatedRows = categoryRows.map((row) =>
            row.id === rowId ? { ...row, ...data } : row
          );

          rows.set(categoryId, updatedRows);
        }

        return state;
      });
    },
    deleteSelectedRow: (): void => {
      const rowId = get(store).selectedRowId;

      return store.update((state) => {
        const { rows } = state;

        for (const [categoryId, categoryRows] of rows) {
          const newRows = categoryRows.filter((row) => row.id !== rowId);

          rows.set(categoryId, newRows);
        }

        return state;
      });
    },
    sortRows: (sortOrder: SortOrder, column: SortColumn): void => {
      return store.update((state) => {
        const { rows } = state;

        for (const [categoryId, categoryRows] of rows) {
          const sortedRows = categoryRows.sort((a, b) => {
            if (column === SortColumn.CHECK) {
              return a.checked === b.checked ? 0 : a.checked ? -1 : 1;
            }

            if (column === SortColumn.NAME) {
              return a.name.localeCompare(b.name);
            }

            if (column === SortColumn.AMOUNT) {
              return a.amount - b.amount;
            }

            return 0;
          });

          rows.set(categoryId, sortOrder === SortOrder.ASC ? sortedRows : sortedRows.reverse());
        }

        return state;
      });
    },
    newCategory: (): void => {
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
    updateCategory: (categoryId: CategoryId, name: string): void => {
      return store.update((state) => {
        const { categories } = state;

        categories.set(categoryId, name);

        return state;
      });
    },
    deleteCategory: (categoryId: CategoryId): void => {
      return store.update((state) => {
        const { categories, rows } = state;

        categories.delete(categoryId);
        rows.delete(categoryId);

        return state;
      });
    },
  };
}

export type StoreActions = ReturnType<typeof createStoreActions>;
