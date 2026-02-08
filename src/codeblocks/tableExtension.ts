import { StateField, RangeSetBuilder, EditorState } from '@codemirror/state';
import { EditorView, Decoration, type DecorationSet } from '@codemirror/view';

import { TableWidget } from './TableWidget';
import { BudgetCodeParser } from './BudgetCodeParser';
import { BUDGET_BLOCK_REGEX } from './constants';

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

  const regex = new RegExp(BUDGET_BLOCK_REGEX.source, BUDGET_BLOCK_REGEX.flags);
  let m: RegExpExecArray | null;
  while ((m = regex.exec(docText)) !== null) {
    const [full, inner] = m;
    const from = m.index;
    const to = from + full.length;

    const parser = new BudgetCodeParser(inner);
    const { categories, rows } = parser.parse();

    builder.add(
      from,
      to,
      Decoration.replace({
        widget: new TableWidget(categories, rows),
        block: true,
      })
    );
  }
  return builder.finish();
}

export const tableExtension = [tableField];
