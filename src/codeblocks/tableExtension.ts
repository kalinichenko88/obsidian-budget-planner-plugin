import { StateField, RangeSetBuilder, type ChangeDesc, type EditorState } from '@codemirror/state';
import { EditorView, Decoration, type DecorationSet } from '@codemirror/view';

import { TableWidget } from './TableWidget';
import { BudgetCodeParser } from './BudgetCodeParser';
import { BUDGET_BLOCK_REGEX, widgetChangeAnnotation, registerTableField } from './constants';
import { changesAffectBlockStructure } from './helpers/changesAffectBlockStructure';

const tableField = StateField.define<DecorationSet>({
  create(s) {
    return buildDeco(s);
  },
  update(old, tr) {
    if (!tr.docChanged) return old;

    // Widget dispatched this change — data already in sync, just remap positions
    if (tr.annotation(widgetChangeAnnotation)) {
      return old.map(tr.changes);
    }

    // External change that doesn't touch block fences — positions shift only
    if (!changesAffectBlockStructure(tr)) {
      return old.map(tr.changes);
    }

    return buildDeco(tr.state, old, tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

function buildDeco(
  state: EditorState,
  oldSet?: DecorationSet,
  changes?: ChangeDesc
): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const docText = state.doc.toString();

  // Map old widget positions into new-document coordinates for identity reuse.
  // Skip widgets whose range collapsed to a point (block was fully deleted) so
  // that a surviving identical block reuses its own widget, not a deleted one.
  const oldWidgets: { from: number; widget: TableWidget }[] = [];
  if (oldSet && changes) {
    const iter = oldSet.iter();
    while (iter.value) {
      const w = iter.value.spec.widget;
      if (w instanceof TableWidget) {
        const mappedFrom = changes.mapPos(iter.from, 1);
        const mappedTo = changes.mapPos(iter.to, -1);
        if (mappedTo > mappedFrom) {
          oldWidgets.push({ from: mappedFrom, widget: w });
        }
      }
      iter.next();
    }
  }

  const regex = new RegExp(BUDGET_BLOCK_REGEX.source, BUDGET_BLOCK_REGEX.flags);
  let m: RegExpExecArray | null;
  while ((m = regex.exec(docText)) !== null) {
    const [full, inner] = m;
    const from = m.index;
    const to = from + full.length;

    const parser = new BudgetCodeParser(inner);
    const { categories, rows } = parser.parse();

    let widget: TableWidget = new TableWidget(categories, rows);

    // Reuse the old widget instance when content is identical so that
    // callbacks created in toDOM() can still locate themselves via the
    // identity check (=== this) in findCurrentPosition().
    for (const old of oldWidgets) {
      if (old.from === from && old.widget.eq(widget)) {
        widget = old.widget;
        break;
      }
    }

    builder.add(
      from,
      to,
      Decoration.replace({
        widget,
        block: true,
      })
    );
  }
  return builder.finish();
}

registerTableField(tableField);

export const tableExtension = [tableField];
