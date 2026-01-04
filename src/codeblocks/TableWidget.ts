import { EditorView, WidgetType } from '@codemirror/view';
import { mount, unmount } from 'svelte';
import { get, writable } from 'svelte/store';

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

const BUDGET_BLOCK_REGEX = /```budget\s*\r?\n([\s\S]*?)```/g;

export class TableWidget extends WidgetType {
  private component: Record<string, unknown> | null = null;
  private container: HTMLElement | null = null;
  private isDestroyed = false;
  private view: EditorView | null = null;
  private tableStore: TableStore | null = null;
  private formatter: BudgetCodeFormatter | null = null;

  constructor(
    public categories: TableCategories,
    public rows: TableRows,
    _from: number,
    _to: number
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

  private findCurrentPosition(
    view: EditorView,
    skipDestroyedCheck = false
  ): { from: number; to: number } | null {
    if (!this.container || !this.container.isConnected) {
      return null;
    }

    if (!skipDestroyedCheck && this.isDestroyed) {
      return null;
    }

    try {
      const domPos = view.posAtDOM(this.container);
      const docText = view.state.doc.toString();

      for (const match of docText.matchAll(BUDGET_BLOCK_REGEX)) {
        const matchFrom = match.index!;
        const matchTo = matchFrom + match[0].length;

        if (domPos >= matchFrom && domPos <= matchTo) {
          return { from: matchFrom, to: matchTo };
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private dispatchChanges(
    categories: TableCategories,
    rows: TableRows,
    skipDestroyedCheck = false
  ): void {
    if (!this.view || !this.formatter) {
      return;
    }

    const pos = this.findCurrentPosition(this.view, skipDestroyedCheck);
    if (pos === null) {
      return;
    }

    const newText = this.formatter.format({ categories, rows });

    this.view.dispatch({
      changes: {
        from: pos.from,
        to: pos.to,
        insert: newText,
      },
    });
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div');
    this.container = container;
    this.view = view;
    this.formatter = new BudgetCodeFormatter();

    const [tableStore, tableStateStore] = this.createTableStore();
    this.tableStore = tableStore;

    this.component = mount(Table, {
      target: container,
      props: {
        tableStore: tableStore,
        tableStateStore: tableStateStore,
        onTableChange: (categories: TableCategories, rows: TableRows) => {
          this.dispatchChanges(categories, rows);
        },
      },
    });

    return container;
  }

  destroy(): void {
    // Flush any pending changes before destroying
    if (this.tableStore && this.view && this.container?.isConnected) {
      try {
        const state = get(this.tableStore);
        this.dispatchChanges(state.categories, state.rows, true);
      } catch {
        // Ignore errors during cleanup
      }
    }

    this.isDestroyed = true;
    if (this.component) {
      unmount(this.component);
      this.component = null;
    }
    this.container = null;
    this.view = null;
    this.tableStore = null;
    this.formatter = null;
  }

  ignoreEvent(): boolean {
    return true;
  }
}
