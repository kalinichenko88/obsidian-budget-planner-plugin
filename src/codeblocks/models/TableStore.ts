import type { Writable } from 'svelte/store';

import type { TableCategories } from './TableCategories';
import type { TableRows } from './TableRows';

export type TableStore = Writable<{
  categories: TableCategories;
  rows: TableRows;
}>;
