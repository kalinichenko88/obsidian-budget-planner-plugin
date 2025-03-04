import type { Writable } from 'svelte/store';

import type { EditableCell } from './EditableCell';

export type TableStateStore = Writable<{
  selectedRowId: string | null;
  editingRowId: string | null;
  editingCell: EditableCell | null;
}>;
