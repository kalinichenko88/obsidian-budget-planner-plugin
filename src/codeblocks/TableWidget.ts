import { Transaction } from '@codemirror/state';
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
import { widgetChangeAnnotation, getTableField } from './constants';

export class TableWidget extends WidgetType {
  private component: Record<string, unknown> | null = null;
  private container: HTMLElement | null = null;
  private isDestroyed = false;
  private view?: EditorView;
  private tableStore: TableStore | null = null;
  private formatter: BudgetCodeFormatter | null = null;
  private dirty = false;
  private lastKnownFrom: number | null = null;

  constructor(
    public categories: TableCategories,
    public rows: TableRows
  ) {
    super();
  }

  eq(other: TableWidget): boolean {
    if (this.categories.size !== other.categories.size) return false;
    if (this.rows.size !== other.rows.size) return false;

    const otherCatEntries = other.categories.entries();
    for (const [thisKey, thisValue] of this.categories.entries()) {
      const otherEntry = otherCatEntries.next().value as [string, string];
      if (thisKey !== otherEntry[0] || thisValue !== otherEntry[1]) return false;
    }

    const otherRowEntries = other.rows.entries();
    for (const [thisKey, thisRows] of this.rows.entries()) {
      const otherEntry = otherRowEntries.next().value as [string, TableRow[]];
      if (thisKey !== otherEntry[0]) return false;
      const otherRows = otherEntry[1];
      if (thisRows.length !== otherRows.length) return false;
      for (let j = 0; j < thisRows.length; j++) {
        if (!this.isRowEqual(thisRows[j], otherRows[j])) return false;
      }
    }

    return true;
  }

  private isRowEqual(a: TableRow, b: TableRow): boolean {
    return (
      a.id === b.id &&
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
    });

    return [tableStore, tableStateStore];
  }

  private findCurrentPosition(view: EditorView): { from: number; to: number } | null {
    // No isDestroyed guard here: after destroy() completes, this.view is
    // undefined so dispatchChanges already bails out before calling this
    // method.  Removing the guard lets blur-triggered writes succeed when
    // they fire during the destroy() window (DOM detached, isDestroyed
    // not yet true) or during unmount().
    const field = getTableField();
    if (!field) return null;

    // Connected DOM path: use posAtDOM for precise lookup
    if (this.container && this.container.isConnected) {
      try {
        const domPos = view.posAtDOM(this.container);
        const decoSet = view.state.field(field);
        const iter = decoSet.iter();
        while (iter.value) {
          if (domPos >= iter.from && domPos < iter.to) {
            this.lastKnownFrom = iter.from;
            return { from: iter.from, to: iter.to };
          }
          iter.next();
        }
        return null;
      } catch {
        // Fall through to disconnected path
      }
    }

    // Disconnected DOM fallback: iterate decoration set, match by widget identity
    try {
      const decoSet = view.state.field(field);
      const iter = decoSet.iter(this.lastKnownFrom ?? 0);
      while (iter.value) {
        if (iter.value.spec.widget === this) {
          this.lastKnownFrom = iter.from;
          return { from: iter.from, to: iter.to };
        }
        iter.next();
      }

      // If hint-based search missed (positions shifted), scan from the start
      if (this.lastKnownFrom !== null && this.lastKnownFrom > 0) {
        const fullIter = decoSet.iter();
        while (fullIter.value) {
          if (fullIter.value.spec.widget === this) {
            this.lastKnownFrom = fullIter.from;
            return { from: fullIter.from, to: fullIter.to };
          }
          fullIter.next();
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private dispatchChanges(categories: TableCategories, rows: TableRows): void {
    if (!this.view || !this.formatter) {
      return;
    }

    const pos = this.findCurrentPosition(this.view);
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
      annotations: widgetChangeAnnotation.of(true),
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
          this.dirty = false;
        },
        markDirty: () => {
          this.dirty = true;
        },
      },
    });

    // When the budget block is the last thing in the document, the replace
    // decoration ends at doc.length, leaving no cursor position after the
    // widget. Defer a newline insertion so the user can type below the table.
    setTimeout(() => this.ensureTrailingNewline());

    return container;
  }

  private ensureTrailingNewline(): void {
    if (this.isDestroyed || !this.view) return;

    const pos = this.findCurrentPosition(this.view);
    if (pos && pos.to === this.view.state.doc.length) {
      this.view.dispatch({
        changes: { from: pos.to, insert: '\n' },
        annotations: [Transaction.addToHistory.of(false), widgetChangeAnnotation.of(true)],
      });
    }
  }

  destroy(): void {
    // Flush BEFORE unmount so the Svelte component is still alive and store state is fresh.
    // The disconnected-DOM fallback in findCurrentPosition handles position lookup.
    if (this.dirty && this.tableStore && this.view) {
      try {
        const state = get(this.tableStore);
        this.dispatchChanges(state.categories, state.rows);
      } catch {
        // view.dispatch may throw if CodeMirror has already torn down
      }
    }

    if (this.component) {
      void unmount(this.component);
      this.component = null;
    }

    this.isDestroyed = true;
    this.container = null;
    this.view = undefined;
    this.tableStore = null;
    this.formatter = null;
  }

  ignoreEvent(): boolean {
    return true;
  }
}
