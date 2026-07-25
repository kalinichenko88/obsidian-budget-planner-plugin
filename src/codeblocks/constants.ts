import { Annotation, type StateField } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';

export const BUDGET_BLOCK_REGEX = /```budget\s*\r?\n([\s\S]*?)^```/gm;

/** Annotation that marks transactions dispatched by a TableWidget. */
export const widgetChangeAnnotation = Annotation.define<boolean>();

/**
 * Late-bound reference to the table StateField.
 * Avoids circular imports between tableExtension ↔ TableWidget.
 */
const _tableFieldRef: { current?: StateField<DecorationSet> } = {};

export function registerTableField(field: StateField<DecorationSet>): void {
  _tableFieldRef.current = field;
}

// Annotated via `typeof`, not `StateField<DecorationSet> | undefined`: when the
// Obsidian review bot fails to resolve @codemirror/* the types degrade to `any`,
// and a written union containing `any` trips no-redundant-type-constituents
// there (see 30ec1b6). An inferred annotation satisfies both linters.
export function getTableField(): typeof _tableFieldRef.current {
  return _tableFieldRef.current;
}
