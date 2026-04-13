import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { RangeSetBuilder } from '@codemirror/state';
import type { StateField } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import type { DecorationSet } from '@codemirror/view';

vi.mock('obsidian', () => ({
  Menu: class {},
  getIcon: () => null,
}));

import { TableWidget } from '@/codeblocks/TableWidget';
import * as constants from '@/codeblocks/constants';

function createDecoSetWithWidget(widget: TableWidget, from: number, to: number): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  builder.add(from, to, Decoration.replace({ widget, block: true }));
  return builder.finish();
}

function createMockView(
  decoSet: DecorationSet,
  mockField: StateField<DecorationSet>,
  posAtDOMResult?: number
): EditorView {
  return {
    state: {
      field: (f: unknown) => {
        if (f === mockField) return decoSet;
        throw new Error('Unknown field');
      },
    },
    posAtDOM: vi.fn().mockReturnValue(posAtDOMResult ?? 0),
  } as unknown as EditorView;
}

// Access private method for testing
function findCurrentPosition(
  widget: TableWidget,
  view: EditorView
): { from: number; to: number } | null {
  return (widget as any).findCurrentPosition(view);
}

function setPrivate(widget: TableWidget, field: string, value: unknown): void {
  (widget as any)[field] = value;
}

function getPrivate(widget: TableWidget, field: string): unknown {
  return (widget as any)[field];
}

describe('TableWidget.findCurrentPosition', () => {
  const mockField = Symbol('mockField') as unknown as StateField<DecorationSet>;
  let getTableFieldSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getTableFieldSpy = vi.spyOn(constants, 'getTableField').mockReturnValue(mockField);
  });

  afterEach(() => {
    getTableFieldSpy.mockRestore();
  });

  describe('connected DOM path', () => {
    test('returns position when container is connected and posAtDOM matches a decoration', () => {
      const widget = new TableWidget(new Map(), new Map());
      const decoSet = createDecoSetWithWidget(widget, 0, 50);
      const view = createMockView(decoSet, mockField, 25);

      setPrivate(widget, 'container', { isConnected: true });

      const result = findCurrentPosition(widget, view);

      expect(result).toEqual({ from: 0, to: 50 });
    });

    test('caches lastKnownFrom on successful lookup', () => {
      const widget = new TableWidget(new Map(), new Map());
      const decoSet = createDecoSetWithWidget(widget, 100, 200);
      const view = createMockView(decoSet, mockField, 150);

      setPrivate(widget, 'container', { isConnected: true });

      findCurrentPosition(widget, view);

      expect(getPrivate(widget, 'lastKnownFrom')).toBe(100);
    });

    test('returns null when posAtDOM does not fall within any decoration range', () => {
      const widget = new TableWidget(new Map(), new Map());
      const decoSet = createDecoSetWithWidget(widget, 0, 50);
      // posAtDOM returns 999, outside the 0-50 range
      const view = createMockView(decoSet, mockField, 999);

      setPrivate(widget, 'container', { isConnected: true });

      const result = findCurrentPosition(widget, view);

      expect(result).toBeNull();
    });
  });

  describe('disconnected DOM fallback', () => {
    test('finds widget by identity when container is disconnected', () => {
      const widget = new TableWidget(new Map(), new Map());
      const decoSet = createDecoSetWithWidget(widget, 0, 50);
      const view = createMockView(decoSet, mockField);

      setPrivate(widget, 'container', { isConnected: false });

      const result = findCurrentPosition(widget, view);

      expect(result).toEqual({ from: 0, to: 50 });
    });

    test('finds widget by identity when container is null', () => {
      const widget = new TableWidget(new Map(), new Map());
      const decoSet = createDecoSetWithWidget(widget, 0, 50);
      const view = createMockView(decoSet, mockField);

      setPrivate(widget, 'container', null);

      const result = findCurrentPosition(widget, view);

      expect(result).toEqual({ from: 0, to: 50 });
    });

    test('caches lastKnownFrom on successful fallback lookup', () => {
      const widget = new TableWidget(new Map(), new Map());
      const decoSet = createDecoSetWithWidget(widget, 30, 80);
      const view = createMockView(decoSet, mockField);

      setPrivate(widget, 'container', { isConnected: false });

      findCurrentPosition(widget, view);

      expect(getPrivate(widget, 'lastKnownFrom')).toBe(30);
    });

    test('uses lastKnownFrom as hint for faster lookup', () => {
      const widget = new TableWidget(new Map(), new Map());
      const otherWidget = new TableWidget(new Map(), new Map());

      const builder = new RangeSetBuilder<Decoration>();
      builder.add(0, 50, Decoration.replace({ widget: otherWidget, block: true }));
      builder.add(100, 200, Decoration.replace({ widget, block: true }));
      const decoSet = builder.finish();

      const view = createMockView(decoSet, mockField);
      setPrivate(widget, 'container', { isConnected: false });
      setPrivate(widget, 'lastKnownFrom', 100);

      const result = findCurrentPosition(widget, view);

      expect(result).toEqual({ from: 100, to: 200 });
    });

    test('full scan finds widget when lastKnownFrom hint is past the widget', () => {
      const widget = new TableWidget(new Map(), new Map());
      const decoSet = createDecoSetWithWidget(widget, 0, 50);
      const view = createMockView(decoSet, mockField);

      setPrivate(widget, 'container', { isConnected: false });
      setPrivate(widget, 'lastKnownFrom', 500);

      const result = findCurrentPosition(widget, view);

      expect(result).toEqual({ from: 0, to: 50 });
    });

    test('does not match a different widget by identity', () => {
      const widget = new TableWidget(new Map(), new Map());
      const otherWidget = new TableWidget(new Map(), new Map());
      const decoSet = createDecoSetWithWidget(otherWidget, 0, 50);
      const view = createMockView(decoSet, mockField);

      setPrivate(widget, 'container', { isConnected: false });

      const result = findCurrentPosition(widget, view);

      expect(result).toBeNull();
    });

    test('falls through to disconnected path when posAtDOM throws', () => {
      const widget = new TableWidget(new Map(), new Map());
      const decoSet = createDecoSetWithWidget(widget, 0, 50);
      const view = {
        state: {
          field: (f: unknown) => {
            if (f === mockField) return decoSet;
            throw new Error('Unknown field');
          },
        },
        posAtDOM: vi.fn().mockImplementation(() => {
          throw new Error('DOM node not in editor');
        }),
      } as unknown as EditorView;

      setPrivate(widget, 'container', { isConnected: true });

      const result = findCurrentPosition(widget, view);

      expect(result).toEqual({ from: 0, to: 50 });
    });
  });

  describe('destroyed widget', () => {
    test('returns null when isDestroyed is true', () => {
      const widget = new TableWidget(new Map(), new Map());
      const decoSet = createDecoSetWithWidget(widget, 0, 50);
      const view = createMockView(decoSet, mockField);

      setPrivate(widget, 'isDestroyed', true);
      setPrivate(widget, 'container', { isConnected: true });

      const result = findCurrentPosition(widget, view);

      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    test('returns null when getTableField returns undefined', () => {
      getTableFieldSpy.mockReturnValue(undefined);

      const widget = new TableWidget(new Map(), new Map());
      setPrivate(widget, 'container', { isConnected: true });

      const view = {} as EditorView;
      const result = findCurrentPosition(widget, view);

      expect(result).toBeNull();
    });

    test('returns null when state.field throws', () => {
      const widget = new TableWidget(new Map(), new Map());
      const view = {
        state: {
          field: () => {
            throw new Error('field not in state');
          },
        },
        posAtDOM: vi.fn().mockReturnValue(0),
      } as unknown as EditorView;

      setPrivate(widget, 'container', { isConnected: false });

      const result = findCurrentPosition(widget, view);

      expect(result).toBeNull();
    });
  });
});
