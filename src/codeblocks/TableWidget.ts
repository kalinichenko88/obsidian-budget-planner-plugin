import { Transaction } from '@codemirror/state';
import { EditorView, WidgetType, type DecorationSet } from '@codemirror/view';
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

    const otherCatValues = other.categories.values();
    for (const thisValue of this.categories.values()) {
      const otherValue = otherCatValues.next().value as string;
      if (thisValue !== otherValue) return false;
    }

    const otherRowValues = other.rows.values();
    for (const thisRows of this.rows.values()) {
      const otherRows = otherRowValues.next().value as TableRow[];
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
    });

    return [tableStore, tableStateStore];
  }

  private findCurrentPosition(view: EditorView): { from: number; to: number } | null {
    // No isDestroyed guard: blur-triggered writes during the destroy window
    // need to succeed. dispatchChanges bails when this.view is null post-destroy.
    const field = getTableField();
    if (!field) return null;

    let decoSet: DecorationSet;
    try {
      decoSet = view.state.field(field);
    } catch {
      return null;
    }

    // Connected DOM: range containment via posAtDOM. Replace decorations don't
    // overlap, so identity check isn't needed — buildDeco may reuse a stale
    // widget instance after deleting one of several identical blocks.
    if (this.container?.isConnected) {
      try {
        const domPos = view.posAtDOM(this.container);
        const iter = decoSet.iter(domPos);
        if (iter.value && domPos >= iter.from && domPos < iter.to) {
          this.lastKnownFrom = iter.from;
          return { from: iter.from, to: iter.to };
        }
      } catch {
        // Fall through to identity match
      }
    }

    // Disconnected DOM: match by widget identity. Try the hint first, then
    // rescan the prefix in case positions shifted earlier in the doc.
    const start = this.lastKnownFrom ?? 0;
    const hit = this.scanForSelf(decoSet, start);
    if (hit) return hit;
    if (start > 0) return this.scanForSelf(decoSet, 0, start);
    return null;
  }

  private scanForSelf(
    decoSet: DecorationSet,
    start: number,
    endBefore = Infinity
  ): { from: number; to: number } | null {
    const iter = decoSet.iter(start);
    while (iter.value && iter.from < endBefore) {
      if (iter.value.spec.widget === this) {
        this.lastKnownFrom = iter.from;
        return { from: iter.from, to: iter.to };
      }
      iter.next();
    }
    return null;
  }

  private dispatchChanges(categories: TableCategories, rows: TableRows): boolean {
    if (!this.view || !this.formatter) {
      return false;
    }

    const pos = this.findCurrentPosition(this.view);
    if (pos === null) {
      return false;
    }

    const newText = this.formatter.format({ categories, rows });

    try {
      this.view.dispatch({
        changes: {
          from: pos.from,
          to: pos.to,
          insert: newText,
        },
        annotations: widgetChangeAnnotation.of(true),
      });
    } catch {
      return false;
    }

    this.categories = categories;
    this.rows = rows;

    return true;
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
          if (this.dispatchChanges(categories, rows)) {
            this.dirty = false;
          }
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
      try {
        this.view.dispatch({
          changes: { from: pos.to, insert: '\n' },
          annotations: [Transaction.addToHistory.of(false), widgetChangeAnnotation.of(true)],
        });
      } catch {
        // view.dispatch may throw if CodeMirror has already torn down
      }
    }
  }

  destroy(): void {
    // Flush BEFORE unmount so the Svelte store still holds the latest values.
    if (this.dirty && this.tableStore && this.view) {
      try {
        const state = get(this.tableStore);
        if (this.dispatchChanges(state.categories, state.rows)) {
          this.dirty = false;
        }
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
