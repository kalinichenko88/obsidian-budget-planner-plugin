import { Annotation, type StateField } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';

export const BUDGET_BLOCK_REGEX = /```budget\s*\r?\n([\s\S]*?)^```/gm;

/** Annotation that marks transactions dispatched by a TableWidget. */
export const widgetChangeAnnotation = Annotation.define<boolean>();

/**
 * Late-bound reference to the table StateField.
 * Avoids circular imports between tableExtension ↔ TableWidget.
 */
let _tableField: StateField<DecorationSet> | null = null;

export function registerTableField(field: StateField<DecorationSet>): void {
  _tableField = field;
}

export function getTableField(): StateField<DecorationSet> | null {
  return _tableField;
}
