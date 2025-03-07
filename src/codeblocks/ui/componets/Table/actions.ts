import { get } from 'svelte/store';

import type {
  CategoryId,
  EditableCell,
  RowId,
  TableRow,
  TableStateStore,
  TableStore,
} from '../../../models';
import { generateId } from '../../../helpers/generateId';
import { SortColumn, SortOrder } from './models';

export function createStoreActions(store: TableStore, tableState: TableStateStore) {
  const getCategoryByRowId = (rowId: RowId | null): CategoryId | null => {
    if (rowId === null) {
      return null;
    }

    for (const [categoryId, categoryRows] of get(store).rows) {
      const row = categoryRows.find((row) => row.id === rowId);

      if (row) {
        return categoryId;
      }
    }

    return null;
  };

  return {
    selectRow: (rowId: RowId | null): void => {
      if (get(tableState).selectedRowId === null && rowId === null) {
        return;
      }

      return tableState.update((data) => {
        return {
          ...data,
          selectedRowId: rowId ?? null,
        };
      });
    },
    newRow: (categoryId: CategoryId | null = null): void => {
      let selectedCategoryId: CategoryId | null = categoryId;
      if (!selectedCategoryId) {
        const rowId = get(tableState).selectedRowId;
        selectedCategoryId = getCategoryByRowId(rowId);
      }

      if (!selectedCategoryId) {
        return;
      }

      const rowId = generateId();

      store.update((state) => {
        const { rows } = state;
        const categoryRows = rows.get(selectedCategoryId) || [];

        const newRow: TableRow = {
          id: rowId,
          checked: false,
          name: '',
          amount: 0,
          comment: '',
        };

        rows.set(selectedCategoryId, [...categoryRows, newRow]);

        return state;
      });

      tableState.update((state) => {
        return {
          ...state,
          selectedRowId: rowId,
        };
      });
    },
    updateRow: (data: TableRow): void => {
      return store.update((state) => {
        const { rows } = state;

        for (const [categoryId, categoryRows] of rows) {
          const updatedRows = categoryRows.map((row) => (row.id === data.id ? data : row));

          rows.set(categoryId, updatedRows);
        }

        return state;
      });
    },
    deleteSelectedRow: (): void => {
      const rowId = get(tableState).selectedRowId;

      if (rowId === null) {
        return;
      }

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
      const newRowId = generateId();

      store.update((state) => {
        const { categories, rows } = state;
        const newCategory = generateId();

        const newRow: TableRow = {
          id: newRowId,
          checked: false,
          name: '',
          amount: 0,
          comment: '',
        };

        categories.set(newCategory, `New Category ${categories.size + 1}`);
        rows.set(newCategory, [newRow]);

        return state;
      });

      tableState.update((state) => {
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
    updateEditingCell: (rowId: RowId | CategoryId | null, cell: EditableCell | null): void => {
      return tableState.update((state) => {
        return {
          ...state,
          editingId: rowId,
          editingCell: cell,
        };
      });
    },
  };
}

export type StoreActions = ReturnType<typeof createStoreActions>;
