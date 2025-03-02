import type { Writable } from 'svelte/store';

import type { TableCategories } from './TableCategories';
import type { TableRows } from './TableRows';

export type TableStoreValue = {
  categories: TableCategories;
  rows: TableRows;
};

export type TableStore = Writable<TableStoreValue>;
