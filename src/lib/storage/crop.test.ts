import { describe, it, expect } from 'vitest';
import { parseCrop } from './crop';

describe('parseCrop', () => {
  it('accepts a valid integer box and clamps to source bounds', () => {
    const c = parseCrop({ x: 10, y: 20, width: 100, height: 50, aspect: 1 }, { width: 80, height: 60 });
    expect(c).toEqual({ x: 10, y: 20, width: 70, height: 40, aspect: 1 });
  });
  it('floors fractional pixels', () => {
    const c = parseCrop({ x: 1.9, y: 2.2, width: 10.8, height: 10.1 }, { width: 100, height: 100 });
    expect(c).toEqual({ x: 1, y: 2, width: 10, height: 10, aspect: null });
  });
  it('rejects a zero-area box', () => {
    expect(() => parseCrop({ x: 0, y: 0, width: 0, height: 10 }, { width: 100, height: 100 })).toThrow();
  });
  it('rejects out-of-bounds origin', () => {
    expect(() => parseCrop({ x: 200, y: 0, width: 10, height: 10 }, { width: 100, height: 100 })).toThrow();
  });
});
