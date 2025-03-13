import type { Writable } from 'svelte/store';

export type TableStateValues = {
  selectedRowId: string | null;
};

export type TableStateStore = Writable<TableStateValues>;
