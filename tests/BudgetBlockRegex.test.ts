import { expect, test, describe } from 'vitest';

import { BUDGET_BLOCK_REGEX } from '@/codeblocks/constants';

function matchAll(input: string): { full: string; inner: string }[] {
  const regex = new RegExp(BUDGET_BLOCK_REGEX.source, BUDGET_BLOCK_REGEX.flags);
  const matches: { full: string; inner: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(input)) !== null) {
    matches.push({ full: m[0], inner: m[1] });
  }
  return matches;
}

describe('BUDGET_BLOCK_REGEX', () => {
  test('should match a normal budget block', () => {
    const input = '```budget\nIncome:\n\tSalary | 5000 | Monthly\n```';
    const matches = matchAll(input);

    expect(matches).toHaveLength(1);
    expect(matches[0].inner).toBe('Income:\n\tSalary | 5000 | Monthly\n');
  });

  test('should match an empty budget block', () => {
    const input = '```budget\n```';
    const matches = matchAll(input);

    expect(matches).toHaveLength(1);
    expect(matches[0].inner).toBe('');
  });

  test('should not prematurely close on ``` inside row name', () => {
    const input = '```budget\nIncome:\n\tItem with ``` in name | 100 | comment\n```';
    const matches = matchAll(input);

    expect(matches).toHaveLength(1);
    expect(matches[0].inner).toContain('Item with ``` in name');
    expect(matches[0].inner).toBe('Income:\n\tItem with ``` in name | 100 | comment\n');
  });

  test('should not prematurely close on ``` inside comment', () => {
    const input = '```budget\nExpenses:\n\tRent | 1500 | see ```config``` for details\n```';
    const matches = matchAll(input);

    expect(matches).toHaveLength(1);
    expect(matches[0].inner).toContain('see ```config``` for details');
  });

  test('should match multiple budget blocks independently', () => {
    const input = [
      '```budget\nIncome:\n\tSalary | 5000\n```',
      '',
      'Some text between blocks',
      '',
      '```budget\nExpenses:\n\tRent | 1500\n```',
    ].join('\n');
    const matches = matchAll(input);

    expect(matches).toHaveLength(2);
    expect(matches[0].inner).toContain('Salary');
    expect(matches[1].inner).toContain('Rent');
  });

  test('should not match across block boundaries', () => {
    const input = [
      '```budget\nIncome:\n\tSalary | 5000\n```',
      '',
      'Regular text with ``` backticks',
      '',
      '```budget\nExpenses:\n\tRent | 1500\n```',
    ].join('\n');
    const matches = matchAll(input);

    expect(matches).toHaveLength(2);
    expect(matches[0].inner).not.toContain('Rent');
    expect(matches[1].inner).not.toContain('Salary');
  });

  test('should not match ``` that is not at the start of a line', () => {
    const input = '```budget\nIncome:\n\tSalary | 5000\nsome text ``` more text\n```';
    const matches = matchAll(input);

    expect(matches).toHaveLength(1);
    expect(matches[0].inner).toContain('some text ``` more text');
  });

  test('should handle block surrounded by other markdown', () => {
    const input = [
      '# My Budget',
      '',
      '```budget',
      'Income:',
      '\tSalary | 5000',
      '```',
      '',
      'End of document',
    ].join('\n');
    const matches = matchAll(input);

    expect(matches).toHaveLength(1);
    expect(matches[0].inner).toBe('Income:\n\tSalary | 5000\n');
  });
});
