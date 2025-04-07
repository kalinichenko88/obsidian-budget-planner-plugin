import type { Writable } from 'svelte/store';

export type TableStateValues = {
  selectedRowId: string | null;
  isEditing: boolean;
};

export type TableStateStore = Writable<TableStateValues>;
