import { get } from 'svelte/store';

import type {
  CategoryId,
  RowId,
  TableCategories,
  TableRow,
  TableRows,
  TableStateStore,
  TableStore,
} from '../../../models';
import { generateId } from '../../../helpers/generateId';
import { SortColumn, SortOrder } from './models';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function createStoreActions(
  store: TableStore,
  tableState: TableStateStore,
  onTableChange: (categories: TableCategories, rows: TableRows) => void
) {
  const getCategoryByRowId = (rowId: RowId | null): CategoryId | null => {
    if (rowId === null) {
      return null;
    }

    for (const [categoryId, categoryRows] of get(store).rows) {
      if (categoryRows.some((row) => row.id === rowId)) {
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

      tableState.update((data) => ({
        ...data,
        selectedRowId: rowId,
      }));
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

      tableState.update((state) => ({
        ...state,
        selectedRowId: rowId,
      }));

      onTableChange(get(store).categories, get(store).rows);
    },
    updateRow: (data: TableRow): void => {
      store.update((state) => {
        const { rows } = state;

        for (const [categoryId, categoryRows] of rows) {
          const updatedRows = categoryRows.map((row) => (row.id === data.id ? data : row));

          rows.set(categoryId, updatedRows);
        }

        return state;
      });
      // Do not commit on each keystroke; commit via debounced handler
    },
    toggleEditing: (isEditing: boolean): void => {
      tableState.update((state) => ({
        ...state,
        isEditing,
      }));
    },
    commitChange: (): void => {
      onTableChange(get(store).categories, get(store).rows);
    },
    deleteSelectedRow: (): void => {
      const rowId = get(tableState).selectedRowId;

      if (rowId === null) {
        return;
      }

      store.update((state) => {
        const { rows } = state;

        for (const [categoryId, categoryRows] of rows) {
          const newRows = categoryRows.filter((row) => row.id !== rowId);

          rows.set(categoryId, newRows);
        }

        return state;
      });

      onTableChange(get(store).categories, get(store).rows);
    },
    sortRows: (sortOrder: SortOrder, column: SortColumn): void => {
      store.update((state) => {
        const { rows } = state;

        for (const [categoryId, categoryRows] of rows) {
          const sorted = [...categoryRows].sort((a, b) => {
            let result = 0;

            switch (column) {
              case SortColumn.CHECK:
                result = a.checked === b.checked ? 0 : a.checked ? -1 : 1;
                break;
              case SortColumn.NAME:
                result = a.name.localeCompare(b.name);
                break;
              case SortColumn.AMOUNT:
                result = a.amount - b.amount;
                break;
            }

            return sortOrder === SortOrder.ASC ? result : -result;
          });

          rows.set(categoryId, sorted);
        }

        return state;
      });

      onTableChange(get(store).categories, get(store).rows);
    },
    newCategory: (): void => {
      const newRowId = generateId();

      store.update((state) => {
        const { categories, rows } = state;
        const newCategory = generateId();

        const newRow: TableRow = {
          id: newRowId,
          checked: false,
          name: 'New Row',
          amount: 0,
          comment: '',
        };

        categories.set(newCategory, `New Category ${categories.size + 1}`);
        rows.set(newCategory, [newRow]);

        return state;
      });

      tableState.update((state) => ({
        ...state,
        selectedRowId: newRowId,
      }));

      onTableChange(get(store).categories, get(store).rows);
    },
    updateCategory: (categoryId: CategoryId, name: string): void => {
      store.update((state) => {
        const { categories } = state;

        categories.set(categoryId, name);

        return state;
      });

      onTableChange(get(store).categories, get(store).rows);
    },
    deleteCategory: (categoryId: CategoryId): void => {
      store.update((state) => {
        const { categories, rows } = state;

        categories.delete(categoryId);
        rows.delete(categoryId);

        return state;
      });

      onTableChange(get(store).categories, get(store).rows);
    },
    moveRow: (
      rowId: RowId,
      fromCategoryId: CategoryId,
      toCategoryId: CategoryId,
      newIndex: number
    ): void => {
      store.update((state) => {
        const { rows } = state;

        const sourceRows = rows.get(fromCategoryId);
        if (!sourceRows) return state;

        const rowIndex = sourceRows.findIndex((r) => r.id === rowId);
        if (rowIndex === -1) return state;

        const movedRow = sourceRows[rowIndex];
        const newSourceRows = sourceRows.filter((_, i) => i !== rowIndex);

        if (fromCategoryId === toCategoryId) {
          const newRows = [...newSourceRows];
          newRows.splice(newIndex, 0, movedRow);
          rows.set(fromCategoryId, newRows);
        } else {
          rows.set(fromCategoryId, newSourceRows);
          const targetRows = [...(rows.get(toCategoryId) || [])];
          targetRows.splice(newIndex, 0, movedRow);
          rows.set(toCategoryId, targetRows);
        }

        return state;
      });

      onTableChange(get(store).categories, get(store).rows);
    },
    moveCategory: (categoryId: CategoryId, newIndex: number): void => {
      store.update((state) => {
        const { categories, rows } = state;

        const entries = Array.from(categories.entries());
        const rowEntries = Array.from(rows.entries());

        const oldIndex = entries.findIndex(([id]) => id === categoryId);
        if (oldIndex === -1) return state;

        const [catEntry] = entries.splice(oldIndex, 1);
        entries.splice(newIndex, 0, catEntry);

        const [rowEntry] = rowEntries.splice(oldIndex, 1);
        rowEntries.splice(newIndex, 0, rowEntry);

        state.categories = new Map(entries);
        state.rows = new Map(rowEntries);

        return state;
      });

      onTableChange(get(store).categories, get(store).rows);
    },
  };
}

export type StoreActions = ReturnType<typeof createStoreActions>;
