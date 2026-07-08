import { describe, it, expect } from 'vitest';
import { classifyAdd, type CartItem } from './cart-logic';

const item = (id: string, creatorId: string): CartItem => ({
  id,
  title: `Product ${id}`,
  price: 100,
  creatorId,
  coverImage: null,
  slug: id,
});

describe('classifyAdd', () => {
  it('adds to an empty cart', () => {
    expect(classifyAdd([], item('p1', 'c1'))).toBe('added');
  });

  it('adds a second item from the same creator', () => {
    expect(classifyAdd([item('p1', 'c1')], item('p2', 'c1'))).toBe('added');
  });

  it('returns exists for a product already in the cart', () => {
    expect(classifyAdd([item('p1', 'c1')], item('p1', 'c1'))).toBe('exists');
  });

  it('returns conflict for an item from a different creator', () => {
    expect(classifyAdd([item('p1', 'c1')], item('p2', 'c2'))).toBe('conflict');
  });

  it('checks duplicate before conflict (same product id always exists)', () => {
    expect(classifyAdd([item('p1', 'c1')], item('p1', 'c2'))).toBe('exists');
  });
});
