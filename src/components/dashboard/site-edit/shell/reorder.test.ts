import { describe, it, expect } from 'vitest';
import { moveItem } from './reorder';

describe('moveItem', () => {
  it('moves an element forward', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });
  it('moves an element backward', () => {
    expect(moveItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
  });
  it('returns an unchanged copy for out-of-range indices', () => {
    const src = ['a', 'b'];
    const out = moveItem(src, 0, 5);
    expect(out).toEqual(['a', 'b']);
    expect(out).not.toBe(src);
  });
  it('does not mutate the input', () => {
    const src = ['a', 'b', 'c'];
    moveItem(src, 0, 2);
    expect(src).toEqual(['a', 'b', 'c']);
  });
  it('is a no-op when from === to', () => {
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
  });
  it('returns an empty array unchanged', () => {
    expect(moveItem([], 0, 0)).toEqual([]);
  });
});
