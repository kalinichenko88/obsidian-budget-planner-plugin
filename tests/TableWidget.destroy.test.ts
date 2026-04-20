import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { RangeSetBuilder } from '@codemirror/state';
import type { StateField } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { writable } from 'svelte/store';

vi.mock('obsidian', () => ({
  Menu: class {},
  getIcon: (): null => null,
}));

vi.mock('svelte', () => ({
  mount: vi.fn(() => ({})),
  unmount: vi.fn(async () => {}),
}));

import { unmount } from 'svelte';
import { TableWidget } from '@/codeblocks/TableWidget';
import { BudgetCodeFormatter } from '@/codeblocks/BudgetCodeFormatter';
import * as constants from '@/codeblocks/constants';

function createDecoSetWithWidget(widget: TableWidget, from: number, to: number): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  builder.add(from, to, Decoration.replace({ widget, block: true }));
  return builder.finish();
}

function setPrivate(widget: TableWidget, field: string, value: unknown): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (widget as any)[field] = value;
}

function getPrivate(widget: TableWidget, field: string): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (widget as any)[field];
}

describe('TableWidget.destroy', () => {
  const mockField = Symbol('mockField') as unknown as StateField<DecorationSet>;
  let getTableFieldSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getTableFieldSpy = vi.spyOn(constants, 'getTableField').mockReturnValue(mockField);
    vi.mocked(unmount).mockClear();
  });

  afterEach(() => {
    getTableFieldSpy.mockRestore();
  });

  function setupWidgetWithState(
    widget: TableWidget,
    overrides: { dirty?: boolean; containerConnected?: boolean } = {}
  ): { dispatchMock: ReturnType<typeof vi.fn> } {
    const decoSet = createDecoSetWithWidget(widget, 0, 100);
    const dispatchMock = vi.fn();
    const view = {
      state: {
        field: (f: unknown) => {
          if (f === mockField) return decoSet;
          throw new Error('Unknown field');
        },
      },
      posAtDOM: vi.fn().mockReturnValue(0),
      dispatch: dispatchMock,
    } as unknown as EditorView;

    const store = writable({ categories: widget.categories, rows: widget.rows });

    setPrivate(widget, 'view', view);
    setPrivate(widget, 'container', {
      isConnected: overrides.containerConnected ?? false,
    });
    setPrivate(widget, 'tableStore', store);
    setPrivate(widget, 'formatter', new BudgetCodeFormatter());
    setPrivate(widget, 'component', {});
    setPrivate(widget, 'dirty', overrides.dirty ?? false);

    return { dispatchMock };
  }

  test('flushes pending store state when dirty is true', () => {
    const categories = new Map([['cat1', 'Food']]);
    const rows = new Map([
      ['cat1', [{ id: 'r1', checked: false, name: 'Groceries', amount: 50, comment: '' }]],
    ]);
    const widget = new TableWidget(categories, rows);
    const { dispatchMock } = setupWidgetWithState(widget, { dirty: true });

    widget.destroy();

    expect(dispatchMock).toHaveBeenCalledOnce();
    const call = dispatchMock.mock.calls[0][0];
    expect(call.changes.from).toBe(0);
    expect(call.changes.to).toBe(100);
    expect(call.changes.insert).toContain('Food');
    expect(call.changes.insert).toContain('Groceries');
  });

  test('does not flush when dirty is false', () => {
    const widget = new TableWidget(new Map(), new Map());
    const { dispatchMock } = setupWidgetWithState(widget, { dirty: false });

    widget.destroy();

    expect(dispatchMock).not.toHaveBeenCalled();
  });

  test('flushes before unmount is called', () => {
    const widget = new TableWidget(new Map([['c1', 'Cat']]), new Map());
    const { dispatchMock } = setupWidgetWithState(widget, { dirty: true });

    const callOrder: string[] = [];
    dispatchMock.mockImplementation(() => {
      callOrder.push('dispatch');
    });
    vi.mocked(unmount).mockImplementation(async () => {
      callOrder.push('unmount');
    });

    widget.destroy();

    expect(callOrder).toEqual(['dispatch', 'unmount']);
  });

  test('handles dispatch throwing without propagating the error', () => {
    const widget = new TableWidget(new Map([['c1', 'Cat']]), new Map());
    const { dispatchMock } = setupWidgetWithState(widget, { dirty: true });

    dispatchMock.mockImplementation(() => {
      throw new Error('CodeMirror already torn down');
    });

    expect(() => widget.destroy()).not.toThrow();
    // unmount should still be called after the failed flush
    expect(unmount).toHaveBeenCalled();
  });

  test('cleans up all internal state after destroy', () => {
    const widget = new TableWidget(new Map(), new Map());
    setupWidgetWithState(widget);

    widget.destroy();

    expect(getPrivate(widget, 'isDestroyed')).toBe(true);
    expect(getPrivate(widget, 'container')).toBeNull();
    expect(getPrivate(widget, 'view')).toBeUndefined();
    expect(getPrivate(widget, 'tableStore')).toBeNull();
    expect(getPrivate(widget, 'formatter')).toBeNull();
    expect(getPrivate(widget, 'component')).toBeNull();
  });

  test('does not flush when tableStore is null', () => {
    const widget = new TableWidget(new Map(), new Map());
    const { dispatchMock } = setupWidgetWithState(widget, { dirty: true });
    setPrivate(widget, 'tableStore', null);

    widget.destroy();

    expect(dispatchMock).not.toHaveBeenCalled();
  });

  test('does not flush when view is undefined', () => {
    const widget = new TableWidget(new Map(), new Map());
    const { dispatchMock } = setupWidgetWithState(widget, { dirty: true });
    setPrivate(widget, 'view', undefined);

    widget.destroy();

    expect(dispatchMock).not.toHaveBeenCalled();
  });
});
