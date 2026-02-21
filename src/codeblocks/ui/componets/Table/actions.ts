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
  onTableChange: (categories: TableCategories, rows: TableRows) => void,
  markDirty?: () => void
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
      markDirty?.();

      store.update((state) => {
        const newRows = new Map(state.rows);
        const categoryRows = newRows.get(selectedCategoryId) || [];
        const newRow: TableRow = {
          id: rowId,
          checked: false,
          name: '',
          amount: 0,
          comment: '',
        };
        newRows.set(selectedCategoryId, [...categoryRows, newRow]);
        return { ...state, rows: newRows };
      });

      tableState.update((state) => ({
        ...state,
        selectedRowId: rowId,
      }));

      onTableChange(get(store).categories, get(store).rows);
    },
    updateRow: (data: TableRow): void => {
      markDirty?.();
      store.update((state) => {
        const newRows = new Map<CategoryId, TableRow[]>();
        for (const [categoryId, categoryRows] of state.rows) {
          newRows.set(
            categoryId,
            categoryRows.map((row) => (row.id === data.id ? data : row))
          );
        }
        return { ...state, rows: newRows };
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
      markDirty?.();

      store.update((state) => {
        const newRows = new Map<CategoryId, TableRow[]>();
        for (const [categoryId, categoryRows] of state.rows) {
          newRows.set(categoryId, categoryRows.filter((row) => row.id !== rowId));
        }
        return { ...state, rows: newRows };
      });

      onTableChange(get(store).categories, get(store).rows);
    },
    sortRows: (sortOrder: SortOrder, column: SortColumn): void => {
      markDirty?.();
      store.update((state) => {
        const newRows = new Map<CategoryId, TableRow[]>();
        for (const [categoryId, categoryRows] of state.rows) {
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
          newRows.set(categoryId, sorted);
        }
        return { ...state, rows: newRows };
      });

      onTableChange(get(store).categories, get(store).rows);
    },
    newCategory: (): void => {
      const newRowId = generateId();
      markDirty?.();

      store.update((state) => {
        const newCategory = generateId();
        const newRow: TableRow = {
          id: newRowId,
          checked: false,
          name: 'New Row',
          amount: 0,
          comment: '',
        };
        const newCategories = new Map(state.categories);
        const newRows = new Map(state.rows);
        newCategories.set(newCategory, `New Category ${newCategories.size + 1}`);
        newRows.set(newCategory, [newRow]);
        return { categories: newCategories, rows: newRows };
      });

      tableState.update((state) => ({
        ...state,
        selectedRowId: newRowId,
      }));

      onTableChange(get(store).categories, get(store).rows);
    },
    updateCategory: (categoryId: CategoryId, name: string): void => {
      markDirty?.();
      store.update((state) => {
        const newCategories = new Map(state.categories);
        newCategories.set(categoryId, name);
        return { ...state, categories: newCategories };
      });

      onTableChange(get(store).categories, get(store).rows);
    },
    deleteCategory: (categoryId: CategoryId): void => {
      markDirty?.();
      store.update((state) => {
        const newCategories = new Map(state.categories);
        const newRows = new Map(state.rows);
        newCategories.delete(categoryId);
        newRows.delete(categoryId);
        return { categories: newCategories, rows: newRows };
      });

      onTableChange(get(store).categories, get(store).rows);
    },
    moveRow: (
      rowId: RowId,
      fromCategoryId: CategoryId,
      toCategoryId: CategoryId,
      newIndex: number
    ): void => {
      markDirty?.();
      store.update((state) => {
        const sourceRows = state.rows.get(fromCategoryId);
        if (!sourceRows) return state;

        const rowIndex = sourceRows.findIndex((r) => r.id === rowId);
        if (rowIndex === -1) return state;

        const movedRow = sourceRows[rowIndex];
        const newSourceRows = sourceRows.filter((_, i) => i !== rowIndex);
        const newRows = new Map(state.rows);

        if (fromCategoryId === toCategoryId) {
          const reordered = [...newSourceRows];
          reordered.splice(newIndex, 0, movedRow);
          newRows.set(fromCategoryId, reordered);
        } else {
          newRows.set(fromCategoryId, newSourceRows);
          const targetRows = [...(state.rows.get(toCategoryId) || [])];
          targetRows.splice(newIndex, 0, movedRow);
          newRows.set(toCategoryId, targetRows);
        }
        return { ...state, rows: newRows };
      });

      onTableChange(get(store).categories, get(store).rows);
    },
    moveCategory: (categoryId: CategoryId, newIndex: number): void => {
      markDirty?.();
      store.update((state) => {
        const entries = Array.from(state.categories.entries());
        const rowEntries = Array.from(state.rows.entries());

        const oldIndex = entries.findIndex(([id]) => id === categoryId);
        if (oldIndex === -1) return state;

        const [catEntry] = entries.splice(oldIndex, 1);
        entries.splice(newIndex, 0, catEntry);

        const [rowEntry] = rowEntries.splice(oldIndex, 1);
        rowEntries.splice(newIndex, 0, rowEntry);

        return {
          categories: new Map(entries),
          rows: new Map(rowEntries),
        };
      });

      onTableChange(get(store).categories, get(store).rows);
    },
  };
}

export type StoreActions = ReturnType<typeof createStoreActions>;
