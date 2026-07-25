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

  // Surviving widgets keyed by their post-change start. Ranges that collapsed
  // to a point are skipped — a surviving identical block must not reuse a
  // deleted widget's instance.
  const oldByFrom = new Map<number, TableWidget>();
  if (oldSet && changes) {
    const iter = oldSet.map(changes).iter();
    while (iter.value) {
      const w = (iter.value.spec as { widget?: unknown }).widget;
      if (w instanceof TableWidget && iter.to > iter.from) {
        oldByFrom.set(iter.from, w);
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

    // Reuse the old widget instance when the block text is identical so that
    // callbacks captured in toDOM() can still locate themselves via the
    // `iter.value.spec.widget === this` check in findCurrentPosition().
    const prior = oldByFrom.get(from);
    const widget = prior?.src === full ? prior : new TableWidget(categories, rows, full);

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
