import type { Writable } from 'svelte/store';

import type { TableCategories } from './TableCategories';
import type { TableRows } from './TableRows';

export type TableStoreValues = {
  categories: TableCategories;
  rows: TableRows;
};

export type TableStore = Writable<TableStoreValues>;
