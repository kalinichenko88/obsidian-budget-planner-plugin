import { EditorView, WidgetType } from '@codemirror/view';
import { mount, unmount } from 'svelte';
import { get, writable } from 'svelte/store';

import type {
  TableCategories,
  TableRow,
  TableRows,
  TableStateStore,
  TableStore,
  TableStoreValues,
  TableStateValues,
} from './models';
import { Table } from './ui/componets';
import { BudgetCodeFormatter } from './BudgetCodeFormatter';
import { BUDGET_BLOCK_REGEX } from './constants';

export class TableWidget extends WidgetType {
  private component: Record<string, unknown> | null = null;
  private container: HTMLElement | null = null;
  private isDestroyed = false;
  private view: EditorView | null = null;
  private tableStore: TableStore | null = null;
  private formatter: BudgetCodeFormatter | null = null;

  constructor(
    public categories: TableCategories,
    public rows: TableRows
  ) {
    super();
  }

  eq(other: TableWidget): boolean {
    if (this.categories.size !== other.categories.size) return false;
    if (this.rows.size !== other.rows.size) return false;

    const otherCatValues = other.categories.values();
    for (const thisValue of this.categories.values()) {
      const otherValue = otherCatValues.next().value;
      if (thisValue !== otherValue) return false;
    }

    const otherRowArrays = other.rows.values();
    for (const thisRows of this.rows.values()) {
      const otherRows = otherRowArrays.next().value as TableRow[];
      if (thisRows.length !== otherRows.length) return false;
      for (let j = 0; j < thisRows.length; j++) {
        if (!this.isRowEqual(thisRows[j], otherRows[j])) return false;
      }
    }

    return true;
  }

  private isRowEqual(a: TableRow, b: TableRow): boolean {
    return (
      a.checked === b.checked &&
      a.name === b.name &&
      a.amount === b.amount &&
      a.comment === b.comment
    );
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

      const regex = new RegExp(BUDGET_BLOCK_REGEX.source, BUDGET_BLOCK_REGEX.flags);
      let match: RegExpExecArray | null;
      while ((match = regex.exec(docText)) !== null) {
        const matchFrom = match.index;
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
        tableStore,
        tableStateStore,
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
