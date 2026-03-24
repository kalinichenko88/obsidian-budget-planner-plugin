import { Annotation } from '@codemirror/state';

export const BUDGET_BLOCK_REGEX = /```budget\s*\r?\n([\s\S]*?)^```/gm;

/** Annotation that marks transactions dispatched by a TableWidget. */
export const widgetChangeAnnotation = Annotation.define<boolean>();
