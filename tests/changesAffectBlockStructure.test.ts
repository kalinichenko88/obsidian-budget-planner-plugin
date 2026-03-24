import { expect, test, describe } from 'vitest';
import { EditorState } from '@codemirror/state';

import { changesAffectBlockStructure } from '@/codeblocks/helpers/changesAffectBlockStructure';

function createTr(doc: string, changes: { from: number; to?: number; insert?: string }) {
  const state = EditorState.create({ doc });
  return state.update({ changes });
}

describe('changesAffectBlockStructure', () => {
  test('returns false for plain text insertion', () => {
    const tr = createTr('hello world', { from: 5, insert: ' beautiful' });
    expect(changesAffectBlockStructure(tr)).toBe(false);
  });

  test('returns false for plain text deletion', () => {
    const tr = createTr('hello beautiful world', { from: 5, to: 15 });
    expect(changesAffectBlockStructure(tr)).toBe(false);
  });

  test('returns false for plain text replacement', () => {
    const tr = createTr('hello world', { from: 6, to: 11, insert: 'earth' });
    expect(changesAffectBlockStructure(tr)).toBe(false);
  });

  test('returns true when inserting opening fence', () => {
    const tr = createTr('some text', { from: 9, insert: '\n```budget\n' });
    expect(changesAffectBlockStructure(tr)).toBe(true);
  });

  test('returns true when inserting closing fence', () => {
    const tr = createTr('```budget\nIncome:\n', { from: 18, insert: '```' });
    expect(changesAffectBlockStructure(tr)).toBe(true);
  });

  test('returns true when deleting text containing fence', () => {
    const doc = '```budget\nIncome:\n```';
    const tr = createTr(doc, { from: 0, to: doc.length });
    expect(changesAffectBlockStructure(tr)).toBe(true);
  });

  test('returns true when replacing text with fence', () => {
    const tr = createTr('placeholder', { from: 0, to: 11, insert: '```budget\n```' });
    expect(changesAffectBlockStructure(tr)).toBe(true);
  });

  test('returns false for typing inside a budget block (no fences)', () => {
    const doc = '```budget\nIncome:\n\tSalary | 5000\n```';
    // Simulate changing "5000" to "6000" (positions 29-33)
    const tr = createTr(doc, { from: 29, to: 33, insert: '6000' });
    expect(changesAffectBlockStructure(tr)).toBe(false);
  });

  test('returns false for adding a row without fences', () => {
    const doc = '```budget\nIncome:\n```';
    const tr = createTr(doc, { from: 18, insert: '\tSalary | 5000\n' });
    expect(changesAffectBlockStructure(tr)).toBe(false);
  });

  test('returns true when partial fence appears in deleted text', () => {
    // Deleting a region that includes ``` even if surrounded by other text
    const doc = 'before```after';
    const tr = createTr(doc, { from: 0, to: doc.length });
    expect(changesAffectBlockStructure(tr)).toBe(true);
  });
});
