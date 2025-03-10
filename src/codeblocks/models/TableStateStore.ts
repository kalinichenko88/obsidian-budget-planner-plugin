import type { Writable } from 'svelte/store';

export type TableStateStore = Writable<{
  selectedRowId: string | null;
}>;
