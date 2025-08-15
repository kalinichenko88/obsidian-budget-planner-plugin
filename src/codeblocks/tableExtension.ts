import { StateField, RangeSetBuilder, EditorState } from '@codemirror/state';
import { EditorView, Decoration, type DecorationSet } from '@codemirror/view';

import { TableWidget } from './TableWidget';
import { BudgetCodeParser } from './BudgetCodeParser';

const tableField = StateField.define<DecorationSet>({
  create(s) {
    return buildDeco(s);
  },
  update(old, tr) {
    return tr.docChanged ? buildDeco(tr.state) : old;
  },
  provide: (f) => EditorView.decorations.from(f),
});

function buildDeco(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const docText = state.doc.toString();
  const budgetBlockRE = /```budget\s*\r?\n([\s\S]*?)```/g;

  for (const m of docText.matchAll(budgetBlockRE)) {
    const [full, inner] = m;
    const from = m.index!;
    const to = from + full.length;

    const parser = new BudgetCodeParser(inner);
    const { categories, rows } = parser.parse();

    builder.add(
      from,
      to,
      Decoration.replace({
        widget: new TableWidget(categories, rows, from, to),
        block: true,
      })
    );
  }
  return builder.finish();
}

export const tableExtension = [tableField];
