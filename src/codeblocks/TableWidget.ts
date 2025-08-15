import { EditorView, WidgetType } from '@codemirror/view';
import { mount, unmount } from 'svelte';
import { writable } from 'svelte/store';

import type {
  TableCategories,
  TableRows,
  TableStateStore,
  TableStore,
  TableStoreValues,
  TableStateValues,
} from './models';
import { Table } from './ui/componets';
import { BudgetCodeFormatter } from './BudgetCodeFormatter';

export class TableWidget extends WidgetType {
  private component: Table | null = null;
  constructor(
    public categories: TableCategories,
    public rows: TableRows,
    public from: number,
    public to: number
  ) {
    super();
  }

  private createTableStore(): [TableStore, TableStateStore] {
    const tableStore = writable<TableStoreValues>({
      rows: this.rows,
      categories: this.categories,
    });
    const tableStateStore = writable<TableStateValues>({
      selectedRowId: null,
      isEditing: false,
      isSaving: false,
    });

    return [tableStore, tableStateStore];
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div');

    const [tableStore, tableStateStore] = this.createTableStore();
    const formatter = new BudgetCodeFormatter();

    this.component = mount(Table, {
      target: container,
      props: {
        tableStore: tableStore,
        tableStateStore: tableStateStore,
        onTableChange: (categories: TableCategories, rows: TableRows) => {
          const newText = formatter.format({ categories, rows });

          view.dispatch({
            changes: {
              from: this.from,
              to: this.to,
              insert: newText,
            },
            // selection: {
            //   anchor: this.from + newText.length,
            // },
          });
        },
      },
    });

    return container;
  }

  async destroy(): Promise<void> {
    if (this.component) {
      await unmount(this.component);
    }
  }

  ignoreEvent(): boolean {
    return true;
  }
}
