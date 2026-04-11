import type { Transaction } from '@codemirror/state';

const FENCE = '```';

export function changesAffectBlockStructure(tr: Transaction): boolean {
  let affects = false;
  tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
    if (affects) return;

    // Check inserted text for fence markers
    if (inserted.length > 0 && inserted.toString().includes(FENCE)) {
      affects = true;
      return;
    }

    // Check deleted text for fence markers
    if (fromA < toA && tr.startState.doc.sliceString(fromA, toA).includes(FENCE)) {
      affects = true;
    }
  });
  return affects;
}
