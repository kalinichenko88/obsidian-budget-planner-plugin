import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { EditorState, RangeSetBuilder, Transaction } from '@codemirror/state';
import type { StateField } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';
import { writable } from 'svelte/store';

// editorInfoField must be a real StateField (not a plain Symbol): the new
// toDOM() tests build a genuine EditorState via CodeMirror's own state.field()
// resolution, so a regression that drops the `false` default-arg from
// `view.state.field(editorInfoField, false)` in TableWidget.ts makes CM6
// itself throw — a plain Symbol stand-in couldn't reproduce that.
vi.mock('obsidian', async () => {
  const { StateField } = await import('@codemirror/state');
  return {
    Menu: class {},
    getIcon: (): null => null,
    Component: class {
      load(): void {}
      unload(): void {}
    },
    editorInfoField: StateField.define({
      create: (): unknown => null,
      update: (value: unknown): unknown => value,
    }),
  };
});

vi.mock('svelte', () => ({
  mount: vi.fn(() => ({})),
  unmount: vi.fn(async () => {}),
}));

import { mount, unmount } from 'svelte';
import { Component, editorInfoField } from 'obsidian';
import type { MarkdownFileInfo } from 'obsidian';
import { TableWidget } from '@/codeblocks/TableWidget';
import { BudgetCodeFormatter } from '@/codeblocks/BudgetCodeFormatter';
import { tableExtension } from '@/codeblocks/tableExtension';
import * as constants from '@/codeblocks/constants';
import type { TableCategories, TableRows } from '@/codeblocks/models';

// Captured before any spy replaces it — tableExtension registers on import.
const realTableField = constants.getTableField() as StateField<DecorationSet>;
const mockField = Symbol('mockField') as unknown as StateField<DecorationSet>;

type Ranges = Array<[TableWidget, number, number]>;

function decoSetOf(ranges: Ranges): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  for (const [widget, from, to] of ranges) {
    builder.add(from, to, Decoration.replace({ widget, block: true }));
  }
  return builder.finish();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const setPrivate = (widget: TableWidget, field: string, value: unknown): void => {
  (widget as any)[field] = value;
};
const getPrivate = (widget: TableWidget, field: string): unknown => (widget as any)[field];
const findCurrentPosition = (
  widget: TableWidget,
  view: EditorView
): { from: number; to: number } | null => (widget as any).findCurrentPosition(view);
const dispatchChanges = (widget: TableWidget, categories: TableCategories, rows: TableRows): void =>
  (widget as any).dispatchChanges(categories, rows);
const ensureTrailingNewline = (widget: TableWidget): void =>
  (widget as any).ensureTrailingNewline();
/* eslint-enable @typescript-eslint/no-explicit-any */

function mockView(
  decoSet: DecorationSet,
  opts: { posAtDOM?: number | (() => number); docLength?: number } = {}
): { view: EditorView; dispatchMock: ReturnType<typeof vi.fn> } {
  const dispatchMock = vi.fn();
  const view = {
    state: {
      doc: { length: opts.docLength ?? 50 },
      field: (f: unknown) => {
        if (f === mockField) return decoSet;
        throw new Error('Unknown field');
      },
    },
    posAtDOM:
      typeof opts.posAtDOM === 'function'
        ? vi.fn().mockImplementation(opts.posAtDOM)
        : vi.fn().mockReturnValue(opts.posAtDOM ?? 0),
    dispatch: dispatchMock,
  } as unknown as EditorView;

  return { view, dispatchMock };
}

/** Wires a widget with a mock view whose decoration set contains it. */
function setupWidget(
  widget: TableWidget,
  opts: {
    range?: [number, number];
    before?: Ranges;
    connected?: boolean;
    dirty?: boolean;
    docLength?: number;
    posAtDOM?: number;
  } = {}
): { dispatchMock: ReturnType<typeof vi.fn> } {
  const [from, to] = opts.range ?? [0, 100];
  const { view, dispatchMock } = mockView(decoSetOf([...(opts.before ?? []), [widget, from, to]]), {
    posAtDOM: opts.posAtDOM,
    docLength: opts.docLength,
  });

  setPrivate(widget, 'view', view);
  setPrivate(widget, 'container', { isConnected: opts.connected ?? false });
  setPrivate(widget, 'tableStore', writable({ categories: widget.categories, rows: widget.rows }));
  setPrivate(widget, 'formatter', new BudgetCodeFormatter());
  setPrivate(widget, 'component', {});
  setPrivate(widget, 'dirty', opts.dirty ?? false);
  setPrivate(widget, 'isDestroyed', false);

  return { dispatchMock };
}

const emptyWidget = (): TableWidget => new TableWidget(new Map(), new Map());

const CATEGORIES: TableCategories = new Map([['cat1', 'Food']]);
const rowsWith = (name: string, amount: number): TableRows =>
  new Map([['cat1', [{ id: 'r1', checked: false, name, amount, comment: '' }]]]);
const ROWS = rowsWith('Groceries', 50);

describe('TableWidget', () => {
  let getTableFieldSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getTableFieldSpy = vi.spyOn(constants, 'getTableField').mockReturnValue(mockField);
    vi.mocked(unmount).mockReset();
    vi.mocked(unmount).mockImplementation(async () => {});
  });

  afterEach(() => {
    getTableFieldSpy.mockRestore();
  });

  describe('findCurrentPosition', () => {
    test('resolves via posAtDOM when the container is connected', () => {
      const widget = emptyWidget();
      const { view } = mockView(decoSetOf([[widget, 0, 50]]), { posAtDOM: 25 });
      setPrivate(widget, 'container', { isConnected: true });

      expect(findCurrentPosition(widget, view)).toEqual({ from: 0, to: 50 });
    });

    test('resolves by range even when the decoration holds an equal but different instance', () => {
      const live = emptyWidget();
      const stale = emptyWidget();
      expect(stale.eq(live)).toBe(true);

      const { view } = mockView(decoSetOf([[stale, 0, 50]]), { posAtDOM: 25 });
      setPrivate(live, 'container', { isConnected: true });

      expect(findCurrentPosition(live, view)).toEqual({ from: 0, to: 50 });
    });

    test('falls back to identity when posAtDOM lands outside every range', () => {
      const widget = emptyWidget();
      const { view } = mockView(decoSetOf([[widget, 0, 50]]), { posAtDOM: 999 });
      setPrivate(widget, 'container', { isConnected: true });

      expect(findCurrentPosition(widget, view)).toEqual({ from: 0, to: 50 });
    });

    test('falls back to identity when posAtDOM throws', () => {
      const widget = emptyWidget();
      const { view } = mockView(decoSetOf([[widget, 0, 50]]), {
        posAtDOM: () => {
          throw new Error('DOM node not in editor');
        },
      });
      setPrivate(widget, 'container', { isConnected: true });

      expect(findCurrentPosition(widget, view)).toEqual({ from: 0, to: 50 });
    });

    test.each([
      ['disconnected', { isConnected: false }],
      ['null', null],
    ])('matches by identity when the container is %s', (_label, container) => {
      const widget = emptyWidget();
      const { view } = mockView(decoSetOf([[widget, 0, 50]]));
      setPrivate(widget, 'container', container);

      expect(findCurrentPosition(widget, view)).toEqual({ from: 0, to: 50 });
    });

    test('picks its own range out of several decorations', () => {
      const widget = emptyWidget();
      const { view } = mockView(
        decoSetOf([
          [emptyWidget(), 0, 50],
          [widget, 100, 200],
        ])
      );
      setPrivate(widget, 'container', { isConnected: false });

      expect(findCurrentPosition(widget, view)).toEqual({ from: 100, to: 200 });
    });

    test('returns null when only a different widget is present', () => {
      const widget = emptyWidget();
      const { view } = mockView(decoSetOf([[emptyWidget(), 0, 50]]));
      setPrivate(widget, 'container', { isConnected: false });

      expect(findCurrentPosition(widget, view)).toBeNull();
    });

    test('still resolves when isDestroyed is true (the guard lives in dispatchChanges)', () => {
      const widget = emptyWidget();
      const { view } = mockView(decoSetOf([[widget, 0, 50]]));
      setPrivate(widget, 'isDestroyed', true);
      setPrivate(widget, 'container', { isConnected: false });

      expect(findCurrentPosition(widget, view)).toEqual({ from: 0, to: 50 });
    });

    test('returns null when getTableField returns undefined', () => {
      getTableFieldSpy.mockReturnValue(undefined);
      const widget = emptyWidget();
      setPrivate(widget, 'container', { isConnected: true });

      expect(findCurrentPosition(widget, {} as EditorView)).toBeNull();
    });

    test('returns null when state.field throws', () => {
      const widget = emptyWidget();
      const { view } = mockView(decoSetOf([[widget, 0, 50]]));
      setPrivate(widget, 'container', { isConnected: false });
      // The mock view only answers to mockField; unregister it to force a throw.
      getTableFieldSpy.mockReturnValue(Symbol('other') as unknown as StateField<DecorationSet>);

      expect(findCurrentPosition(widget, view)).toBeNull();
    });
  });

  describe('dispatchChanges during navigation', () => {
    test('blur-triggered write succeeds after DOM detachment, before destroy', () => {
      const widget = new TableWidget(CATEGORIES, ROWS);
      const { dispatchMock } = setupWidget(widget);

      dispatchChanges(widget, CATEGORIES, ROWS);

      expect(dispatchMock).toHaveBeenCalledOnce();
      const { changes } = dispatchMock.mock.calls[0][0];
      expect(changes).toMatchObject({ from: 0, to: 100 });
      expect(changes.insert).toContain('Food');
      expect(changes.insert).toContain('Groceries');
    });

    test('blur-triggered write during unmount succeeds', () => {
      const widget = new TableWidget(CATEGORIES, ROWS);
      const { dispatchMock } = setupWidget(widget);
      const updated = rowsWith('Updated', 99);

      vi.mocked(unmount).mockImplementation(async () => {
        dispatchChanges(widget, CATEGORIES, updated);
      });

      widget.destroy();

      expect(dispatchMock).toHaveBeenCalledOnce();
      expect(dispatchMock.mock.calls[0][0].changes.insert).toContain('Updated');
    });

    test('is a no-op once destroy() has cleared the view', () => {
      const widget = new TableWidget(CATEGORIES, ROWS);
      const { dispatchMock } = setupWidget(widget);

      widget.destroy();
      dispatchChanges(widget, CATEGORIES, ROWS);

      expect(dispatchMock).not.toHaveBeenCalled();
    });

    test('dirty flush and blur write both land during destroy', () => {
      const widget = new TableWidget(CATEGORIES, ROWS);
      const { dispatchMock } = setupWidget(widget, { dirty: true });

      const callOrder: string[] = [];
      dispatchMock.mockImplementation(() => callOrder.push('dispatch'));
      vi.mocked(unmount).mockImplementation(async () => {
        callOrder.push('unmount-start');
        dispatchChanges(widget, CATEGORIES, ROWS);
        callOrder.push('unmount-end');
      });

      widget.destroy();

      expect(callOrder).toEqual(['dispatch', 'unmount-start', 'dispatch', 'unmount-end']);
    });

    test('swallows a dispatch failure instead of propagating it', () => {
      const widget = new TableWidget(CATEGORIES, ROWS);
      const { dispatchMock } = setupWidget(widget);
      dispatchMock.mockImplementation(() => {
        throw new Error('view has been destroyed');
      });

      expect(() => dispatchChanges(widget, CATEGORIES, ROWS)).not.toThrow();
    });

    test('records the written text as the new src', () => {
      const widget = new TableWidget(CATEGORIES, ROWS, 'stale');
      const { dispatchMock } = setupWidget(widget);

      dispatchChanges(widget, CATEGORIES, ROWS);

      expect(widget.src).toBe(dispatchMock.mock.calls[0][0].changes.insert);
    });
  });

  describe('toDOM', () => {
    // toDOM() calls the real `createDiv()`/`window.setTimeout()` globals that
    // Obsidian's Electron shell normally provides. Stub them minimally and
    // freeze the deferred ensureTrailingNewline() timer instead of letting it
    // fire against a fake view.
    beforeEach(() => {
      vi.stubGlobal('createDiv', () => ({}));
      vi.stubGlobal('window', globalThis);
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    type Info = { app: unknown; file: { path: string } | null } | null;

    const buildInfoState = (info: Info): EditorState =>
      EditorState.create({
        doc: 'x',
        extensions: info ? [editorInfoField.init(() => info as unknown as MarkdownFileInfo)] : [],
      });

    const lastMountProps = (): { markdown: unknown } => {
      const call = vi.mocked(mount).mock.calls.at(-1);
      return call?.[1]?.props as { markdown: unknown };
    };

    test('field present: passes the editor info itself and a loaded Component', () => {
      const loadSpy = vi.spyOn(Component.prototype, 'load').mockClear();
      // Identity, not a copy: app and file are read off this per render, so a
      // rename cannot leave the widget resolving links against a stale path.
      const info = { app: {}, file: { path: 'notes/Trip.md' } };
      const view = { state: buildInfoState(info) } as unknown as EditorView;

      emptyWidget().toDOM(view);

      const { markdown } = lastMountProps() as {
        markdown: { info: unknown; component: unknown };
      };
      expect(markdown.info).toBe(info);
      expect(markdown.component).toBeInstanceOf(Component);
      expect(loadSpy).toHaveBeenCalledOnce();
    });

    test('field absent: markdown prop is null and no Component is built', () => {
      const loadSpy = vi.spyOn(Component.prototype, 'load').mockClear();
      const view = { state: buildInfoState(null) } as unknown as EditorView;

      expect(() => emptyWidget().toDOM(view)).not.toThrow();

      expect(lastMountProps().markdown).toBeNull();
      expect(loadSpy).not.toHaveBeenCalled();
    });

    test('destroy() unloads the Component created by a real toDOM()', () => {
      const unloadSpy = vi.spyOn(Component.prototype, 'unload').mockClear();
      const view = {
        state: buildInfoState({ app: {}, file: { path: 'a.md' } }),
      } as unknown as EditorView;
      const widget = emptyWidget();
      widget.toDOM(view);

      widget.destroy();

      expect(unloadSpy).toHaveBeenCalledOnce();
    });

    test('a second toDOM() unloads the Component the first one left behind', () => {
      // tableExtension reuses widget instances, so one instance can be mounted
      // more than once. Overwriting mdComponent would strand the old one.
      const unloadSpy = vi.spyOn(Component.prototype, 'unload').mockClear();
      const view = {
        state: buildInfoState({ app: {}, file: { path: 'a.md' } }),
      } as unknown as EditorView;
      const widget = emptyWidget();

      widget.toDOM(view);
      widget.toDOM(view);

      expect(unloadSpy).toHaveBeenCalledOnce();
    });

    test('toDOM() clears isDestroyed so a remounted widget is live again', () => {
      const view = {
        state: buildInfoState({ app: {}, file: { path: 'a.md' } }),
      } as unknown as EditorView;
      const widget = emptyWidget();

      widget.toDOM(view);
      widget.destroy();
      widget.toDOM(view);

      expect((widget as unknown as { isDestroyed: boolean }).isDestroyed).toBe(false);
    });
  });

  describe('destroy', () => {
    test('flushes pending store state when dirty', () => {
      const widget = new TableWidget(CATEGORIES, ROWS);
      const { dispatchMock } = setupWidget(widget, { dirty: true });

      widget.destroy();

      expect(dispatchMock).toHaveBeenCalledOnce();
      const { changes } = dispatchMock.mock.calls[0][0];
      expect(changes).toMatchObject({ from: 0, to: 100 });
      expect(changes.insert).toContain('Groceries');
    });

    test('does not flush when not dirty', () => {
      const widget = emptyWidget();
      const { dispatchMock } = setupWidget(widget, { dirty: false });

      widget.destroy();

      expect(dispatchMock).not.toHaveBeenCalled();
    });

    test('flushes before unmount', () => {
      const widget = new TableWidget(CATEGORIES, ROWS);
      const { dispatchMock } = setupWidget(widget, { dirty: true });

      const callOrder: string[] = [];
      dispatchMock.mockImplementation(() => callOrder.push('dispatch'));
      vi.mocked(unmount).mockImplementation(async () => {
        callOrder.push('unmount');
      });

      widget.destroy();

      expect(callOrder).toEqual(['dispatch', 'unmount']);
    });

    test('unmounts even when the flush throws', () => {
      const widget = new TableWidget(CATEGORIES, ROWS);
      const { dispatchMock } = setupWidget(widget, { dirty: true });
      dispatchMock.mockImplementation(() => {
        throw new Error('CodeMirror already torn down');
      });

      expect(() => widget.destroy()).not.toThrow();
      expect(unmount).toHaveBeenCalled();
    });

    test.each(['tableStore', 'view'])('does not flush when %s is missing', (field) => {
      const widget = emptyWidget();
      const { dispatchMock } = setupWidget(widget, { dirty: true });
      setPrivate(widget, field, field === 'view' ? undefined : null);

      widget.destroy();

      expect(dispatchMock).not.toHaveBeenCalled();
    });

    test('clears internal state', () => {
      const widget = emptyWidget();
      setupWidget(widget);

      widget.destroy();

      expect(getPrivate(widget, 'isDestroyed')).toBe(true);
      expect(getPrivate(widget, 'container')).toBeNull();
      expect(getPrivate(widget, 'view')).toBeUndefined();
      expect(getPrivate(widget, 'tableStore')).toBeNull();
      expect(getPrivate(widget, 'formatter')).toBeNull();
      expect(getPrivate(widget, 'component')).toBeNull();
    });
  });

  describe('ensureTrailingNewline', () => {
    test('inserts a newline at the end of the doc, outside history', () => {
      const widget = emptyWidget();
      const { dispatchMock } = setupWidget(widget, { range: [0, 50], docLength: 50 });

      ensureTrailingNewline(widget);

      expect(dispatchMock).toHaveBeenCalledOnce();
      const call = dispatchMock.mock.calls[0][0];
      expect(call.changes).toEqual({ from: 50, insert: '\n' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const types = call.annotations.map((a: any) => a.type);
      expect(types).toContain(constants.widgetChangeAnnotation);
      expect(types).toContain(Transaction.addToHistory);
    });

    test('does nothing when the block is not the last thing in the doc', () => {
      const widget = emptyWidget();
      const { dispatchMock } = setupWidget(widget, { range: [0, 50], docLength: 200 });

      ensureTrailingNewline(widget);

      expect(dispatchMock).not.toHaveBeenCalled();
    });

    test.each([
      ['isDestroyed', true],
      ['view', undefined],
    ])('does nothing when %s is %s', (field, value) => {
      const widget = emptyWidget();
      const { dispatchMock } = setupWidget(widget, { range: [0, 50], docLength: 50 });
      setPrivate(widget, field, value);

      ensureTrailingNewline(widget);

      expect(dispatchMock).not.toHaveBeenCalled();
    });
  });

  describe('eq', () => {
    test('compares block source text', () => {
      expect(new TableWidget(new Map(), new Map(), 'a').eq(emptyWidget())).toBe(false);
      expect(
        new TableWidget(CATEGORIES, ROWS, 'a').eq(new TableWidget(new Map(), new Map(), 'a'))
      ).toBe(true);
    });
  });
});

describe('tableExtension widget reuse', () => {
  const BLOCK = '```budget\nFood:\n\t[ ] | Groceries | 50\n```';

  const widgetsOf = (set: DecorationSet): TableWidget[] => {
    const found: TableWidget[] = [];
    const iter = set.iter();
    while (iter.value) {
      found.push(iter.value.spec.widget as TableWidget);
      iter.next();
    }
    return found;
  };

  const buildState = (doc: string): EditorState =>
    EditorState.create({ doc, extensions: tableExtension });

  test('keeps the surviving instance when an identical earlier block is deleted', () => {
    const state = buildState(`${BLOCK}\n\n${BLOCK}`);
    const [first, second] = widgetsOf(state.field(realTableField));

    // Delete the first block plus the blank line between the two.
    const next = state.update({ changes: { from: 0, to: BLOCK.length + 2 } }).state;
    const [survivor] = widgetsOf(next.field(realTableField));

    expect(survivor).toBe(second);
    expect(survivor).not.toBe(first);
  });

  test('creates a new instance when the block text changes', () => {
    const state = buildState(BLOCK);
    const [before] = widgetsOf(state.field(realTableField));

    const next = state.update({
      changes: { from: 0, to: state.doc.length, insert: BLOCK.replace('50', '75') },
    }).state;

    expect(widgetsOf(next.field(realTableField))[0]).not.toBe(before);
  });
});
