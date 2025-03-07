import type { Writable } from 'svelte/store';

import type { EditableCell } from './EditableCell';
import type { RowId } from './RowId';
import type { CategoryId } from './CategoryId';

export type TableStateStore = Writable<{
  selectedRowId: string | null;
  editingId: RowId | CategoryId | null;
  editingCell: EditableCell | null;
}>;
