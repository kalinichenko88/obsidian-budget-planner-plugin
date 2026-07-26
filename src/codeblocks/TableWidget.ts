import { Component, editorInfoField } from 'obsidian';
import { Transaction } from '@codemirror/state';
import { EditorView, WidgetType, type DecorationSet } from '@codemirror/view';
import { mount, unmount } from 'svelte';
import { get, writable } from 'svelte/store';

import type {
  MarkdownContext,
  TableCategories,
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
  private mdComponent: Component | null = null;
  private dirty = false;

  constructor(
    public categories: TableCategories,
    public rows: TableRows,
    /** Block text this widget was built from; kept in sync on every write. */
    public src = ''
  ) {
    super();
  }

  eq(other: TableWidget): boolean {
    return this.src === other.src;
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
          return { from: iter.from, to: iter.to };
        }
      } catch {
        // Fall through to identity match
      }
    }

    // Disconnected DOM (page navigation / teardown): match by widget identity.
    const iter = decoSet.iter();
    while (iter.value) {
      if ((iter.value.spec as { widget?: unknown }).widget === this) {
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

    let newText: string;
    try {
      newText = this.formatter.format({ categories, rows });
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
    this.src = newText;

    return true;
  }

  toDOM(view: EditorView): HTMLElement {
    const container = createDiv();
    this.container = container;
    this.view = view;
    this.formatter = new BudgetCodeFormatter();
    // tableExtension reuses widget instances, so CodeMirror can mount one
    // that was destroyed earlier. Without this reset ensureTrailingNewline
    // stays a no-op for the rest of the instance's life.
    this.isDestroyed = false;

    // Two-arg form: state.field() throws when the field is absent, and a
    // throw here would take down the whole widget render.
    const info = view.state.field(editorInfoField, false);
    let markdown: MarkdownContext | null = null;

    if (info) {
      // A reused instance may already hold a loaded Component; overwriting it
      // would leave it loaded with no path back to it from destroy().
      this.mdComponent?.unload();
      this.mdComponent = new Component();
      this.mdComponent.load();
      markdown = { info, component: this.mdComponent };
    }

    const [tableStore, tableStateStore] = this.createTableStore();
    this.tableStore = tableStore;

    this.component = mount(Table, {
      target: container,
      props: {
        tableStore,
        tableStateStore,
        markdown,
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
    window.setTimeout(() => this.ensureTrailingNewline());

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
    // dispatchChanges swallows format/dispatch failures during teardown.
    if (this.dirty && this.tableStore && this.view) {
      const state = get(this.tableStore);
      this.dispatchChanges(state.categories, state.rows);
    }

    if (this.component) {
      void unmount(this.component);
      this.component = null;
    }

    this.mdComponent?.unload();
    this.mdComponent = null;

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
