import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { Transaction, RangeSetBuilder } from '@codemirror/state';
import type { StateField } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';

vi.mock('obsidian', () => ({
  Menu: class {},
  getIcon: () => null,
}));

vi.mock('svelte', () => ({
  mount: vi.fn(() => ({})),
  unmount: vi.fn(async () => {}),
}));

import { TableWidget } from '@/codeblocks/TableWidget';
import { widgetChangeAnnotation } from '@/codeblocks/constants';
import * as constants from '@/codeblocks/constants';

function createDecoSetWithWidget(widget: TableWidget, from: number, to: number): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  builder.add(from, to, Decoration.replace({ widget, block: true }));
  return builder.finish();
}

function setPrivate(widget: TableWidget, field: string, value: unknown): void {
  (widget as any)[field] = value;
}

function callEnsureTrailingNewline(widget: TableWidget): void {
  (widget as any).ensureTrailingNewline();
}

describe('TableWidget trailing newline', () => {
  const mockField = Symbol('mockField') as unknown as StateField<DecorationSet>;
  let getTableFieldSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getTableFieldSpy = vi.spyOn(constants, 'getTableField').mockReturnValue(mockField);
  });

  afterEach(() => {
    getTableFieldSpy.mockRestore();
  });

  function setupWidget(
    widget: TableWidget,
    overrides: { docLength?: number; containerConnected?: boolean } = {}
  ): { dispatchMock: ReturnType<typeof vi.fn> } {
    const decoSet = createDecoSetWithWidget(widget, 0, 50);
    const dispatchMock = vi.fn();
    const docLength = overrides.docLength ?? 50;
    const view = {
      state: {
        doc: { length: docLength },
        field: (f: unknown) => {
          if (f === mockField) return decoSet;
          throw new Error('Unknown field');
        },
      },
      posAtDOM: vi.fn().mockReturnValue(0),
      dispatch: dispatchMock,
    } as unknown as EditorView;

    setPrivate(widget, 'view', view);
    setPrivate(widget, 'container', {
      isConnected: overrides.containerConnected ?? false,
    });
    setPrivate(widget, 'isDestroyed', false);

    return { dispatchMock };
  }

  test('dispatch includes widgetChangeAnnotation', () => {
    const widget = new TableWidget(new Map(), new Map());
    // doc.length === 50 matches the decoration to (50), so trailing newline is needed
    const { dispatchMock } = setupWidget(widget, { docLength: 50 });

    callEnsureTrailingNewline(widget);

    expect(dispatchMock).toHaveBeenCalledOnce();
    const call = dispatchMock.mock.calls[0][0];
    const annotations = Array.isArray(call.annotations) ? call.annotations : [call.annotations];
    expect(annotations.some((a: any) => a.type === widgetChangeAnnotation)).toBe(true);
  });

  test('dispatch includes Transaction.addToHistory(false)', () => {
    const widget = new TableWidget(new Map(), new Map());
    const { dispatchMock } = setupWidget(widget, { docLength: 50 });

    callEnsureTrailingNewline(widget);

    expect(dispatchMock).toHaveBeenCalledOnce();
    const call = dispatchMock.mock.calls[0][0];
    const annotations = Array.isArray(call.annotations) ? call.annotations : [call.annotations];
    expect(annotations.some((a: any) => a.type === Transaction.addToHistory)).toBe(true);
  });

  test('inserts newline at pos.to when it equals doc.length', () => {
    const widget = new TableWidget(new Map(), new Map());
    const { dispatchMock } = setupWidget(widget, { docLength: 50 });

    callEnsureTrailingNewline(widget);

    expect(dispatchMock).toHaveBeenCalledOnce();
    const call = dispatchMock.mock.calls[0][0];
    expect(call.changes).toEqual({ from: 50, insert: '\n' });
  });

  test('does not dispatch when pos.to < doc.length', () => {
    const widget = new TableWidget(new Map(), new Map());
    // doc.length (200) > pos.to (50), so no trailing newline needed
    const { dispatchMock } = setupWidget(widget, { docLength: 200 });

    callEnsureTrailingNewline(widget);

    expect(dispatchMock).not.toHaveBeenCalled();
  });

  test('does not dispatch when isDestroyed is true', () => {
    const widget = new TableWidget(new Map(), new Map());
    const { dispatchMock } = setupWidget(widget, { docLength: 50 });
    setPrivate(widget, 'isDestroyed', true);

    callEnsureTrailingNewline(widget);

    expect(dispatchMock).not.toHaveBeenCalled();
  });

  test('does not dispatch when view is undefined', () => {
    const widget = new TableWidget(new Map(), new Map());
    const { dispatchMock } = setupWidget(widget, { docLength: 50 });
    setPrivate(widget, 'view', undefined);

    callEnsureTrailingNewline(widget);

    expect(dispatchMock).not.toHaveBeenCalled();
  });
});
