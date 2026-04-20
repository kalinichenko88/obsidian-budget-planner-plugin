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

// Calls the private dispatchChanges method, simulating what happens when
// a blur-triggered onChange fires from the Svelte component.
function callDispatchChanges(
  widget: TableWidget,
  categories: Map<string, string>,
  rows: Map<
    string,
    Array<{ id: string; checked: boolean; name: string; amount: number; comment: string }>
  >
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (widget as any).dispatchChanges(categories, rows);
}

describe('TableWidget blur-during-navigation', () => {
  const mockField = Symbol('mockField') as unknown as StateField<DecorationSet>;
  let getTableFieldSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getTableFieldSpy = vi.spyOn(constants, 'getTableField').mockReturnValue(mockField);
    vi.mocked(unmount).mockClear();
  });

  afterEach(() => {
    getTableFieldSpy.mockRestore();
  });

  function setupWidget(
    widget: TableWidget,
    overrides: { containerConnected?: boolean; dirty?: boolean } = {}
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

  test('blur-triggered dispatchChanges succeeds after DOM detachment but before destroy', () => {
    // Scenario: DOM is detached (container disconnected), destroy() not yet called.
    // A blur event fires on a focused input and triggers onChange -> dispatchChanges.
    const categories = new Map([['cat1', 'Food']]);
    const rows = new Map([
      ['cat1', [{ id: 'r1', checked: false, name: 'Groceries', amount: 50, comment: '' }]],
    ]);
    const widget = new TableWidget(categories, rows);
    const { dispatchMock } = setupWidget(widget, { containerConnected: false });

    // Simulate the blur-triggered write
    callDispatchChanges(widget, categories, rows);

    expect(dispatchMock).toHaveBeenCalledOnce();
    const call = dispatchMock.mock.calls[0][0];
    expect(call.changes.from).toBe(0);
    expect(call.changes.to).toBe(100);
    expect(call.changes.insert).toContain('Food');
    expect(call.changes.insert).toContain('Groceries');
  });

  test('blur-triggered write during unmount in destroy() succeeds', () => {
    // Scenario: destroy() is called. During unmount(), Svelte fires blur
    // on a focused input. The blur handler calls onChange -> dispatchChanges.
    // At this point isDestroyed is still false and view is still valid.
    const categories = new Map([['cat1', 'Food']]);
    const rows = new Map([
      ['cat1', [{ id: 'r1', checked: false, name: 'Updated', amount: 99, comment: '' }]],
    ]);
    const widget = new TableWidget(categories, rows);
    const { dispatchMock } = setupWidget(widget, { containerConnected: false, dirty: false });

    // Mock unmount to simulate a blur-triggered dispatchChanges during teardown
    vi.mocked(unmount).mockImplementation(async () => {
      // This simulates the blur event firing during Svelte component unmount.
      // At this point isDestroyed is still false and view/formatter are valid.
      callDispatchChanges(widget, categories, rows);
    });

    widget.destroy();

    // The dispatchChanges from within unmount should have succeeded
    expect(dispatchMock).toHaveBeenCalledOnce();
    const call = dispatchMock.mock.calls[0][0];
    expect(call.changes.from).toBe(0);
    expect(call.changes.to).toBe(100);
    expect(call.changes.insert).toContain('Food');
    expect(call.changes.insert).toContain('Updated');
  });

  test('dispatchChanges is no-op after destroy() completes (view cleared)', () => {
    // After destroy() finishes, this.view is undefined and this.formatter is null,
    // so dispatchChanges returns early without dispatching.
    const categories = new Map([['cat1', 'Food']]);
    const rows = new Map([
      ['cat1', [{ id: 'r1', checked: false, name: 'Groceries', amount: 50, comment: '' }]],
    ]);
    const widget = new TableWidget(categories, rows);
    const { dispatchMock } = setupWidget(widget);

    widget.destroy();

    // Now try to dispatch after full destroy
    callDispatchChanges(widget, categories, rows);

    // Should not dispatch because view is undefined after cleanup
    expect(dispatchMock).not.toHaveBeenCalled();
  });

  test('dirty flush and blur-triggered write both succeed during destroy', () => {
    // Scenario: widget is dirty when destroy() is called. The flush runs first,
    // then unmount fires blur which triggers another dispatchChanges.
    // Both writes should succeed.
    const categories = new Map([['cat1', 'Food']]);
    const rows = new Map([
      ['cat1', [{ id: 'r1', checked: false, name: 'Groceries', amount: 50, comment: '' }]],
    ]);
    const widget = new TableWidget(categories, rows);
    const { dispatchMock } = setupWidget(widget, { containerConnected: false, dirty: true });

    const callOrder: string[] = [];
    dispatchMock.mockImplementation(() => {
      callOrder.push('dispatch');
    });
    vi.mocked(unmount).mockImplementation(async () => {
      callOrder.push('unmount-start');
      // Blur fires during unmount, triggering another write
      callDispatchChanges(widget, categories, rows);
      callOrder.push('unmount-end');
    });

    widget.destroy();

    // First dispatch is from the dirty flush, second from blur during unmount
    expect(dispatchMock).toHaveBeenCalledTimes(2);
    expect(callOrder).toEqual(['dispatch', 'unmount-start', 'dispatch', 'unmount-end']);
  });

  test('findCurrentPosition uses lastKnownFrom during blur after DOM detachment', () => {
    // When blur fires after DOM detachment, findCurrentPosition uses the
    // lastKnownFrom hint for efficient decoration set lookup.
    const widget = new TableWidget(new Map(), new Map());
    const otherWidget = new TableWidget(new Map(), new Map());

    const builder = new RangeSetBuilder<Decoration>();
    builder.add(0, 50, Decoration.replace({ widget: otherWidget, block: true }));
    builder.add(100, 200, Decoration.replace({ widget, block: true }));
    const decoSet = builder.finish();

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

    setPrivate(widget, 'view', view);
    setPrivate(widget, 'container', { isConnected: false });
    setPrivate(widget, 'formatter', new BudgetCodeFormatter());
    setPrivate(widget, 'lastKnownFrom', 100);

    const categories = new Map([['cat1', 'Food']]);
    const rows = new Map([
      ['cat1', [{ id: 'r1', checked: false, name: 'Groceries', amount: 50, comment: '' }]],
    ]);

    callDispatchChanges(widget, categories, rows);

    expect(dispatchMock).toHaveBeenCalledOnce();
    const call = dispatchMock.mock.calls[0][0];
    expect(call.changes.from).toBe(100);
    expect(call.changes.to).toBe(200);
  });

  test('dispatchChanges does not throw when view.dispatch fails during blur', () => {
    // Scenario: blur fires during unmount, view.dispatch throws because
    // CodeMirror has partially torn down. dispatchChanges should catch the
    // error and return false instead of propagating an uncaught exception.
    const categories = new Map([['cat1', 'Food']]);
    const rows = new Map([
      ['cat1', [{ id: 'r1', checked: false, name: 'Groceries', amount: 50, comment: '' }]],
    ]);
    const widget = new TableWidget(categories, rows);
    const { dispatchMock } = setupWidget(widget, { containerConnected: false });

    dispatchMock.mockImplementation(() => {
      throw new Error('view has been destroyed');
    });

    expect(() => callDispatchChanges(widget, categories, rows)).not.toThrow();
  });
});
