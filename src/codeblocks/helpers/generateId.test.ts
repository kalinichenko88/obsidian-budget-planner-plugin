import { expect, test, describe } from 'vitest';

import { generateId } from './generateId';

describe('generateId', () => {
  test('should generate a unique ID', () => {
    const id1 = generateId();
    const id2 = generateId();

    expect(id1).toBeTypeOf('string');
    expect(id2).toBeTypeOf('string');
    expect(id1).not.toEqual(id2);
  });

  test('should generate a string of length 21', () => {
    const id = generateId();
    expect(id).toBeTypeOf('string');
    expect(id.length).toBe(21);
  });

  test('should generate a valid ID format', () => {
    const id = generateId();
    expect(id).toMatch(/^[a-zA-Z0-9_-]{21}$/);
  });
});
