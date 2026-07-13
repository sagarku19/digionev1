import { describe, it, expect } from 'vitest';
import { matchKeyword } from './keyword-match';

const kw = (word: string, is_negative = false) => ({ word, is_negative });

describe('matchKeyword', () => {
  it('exact: matches a whole-word keyword case-insensitively', () => {
    const r = matchKeyword('Please send me the GUIDE', [kw('guide')], 'exact');
    expect(r.matched).toBe(true);
    expect(r.keyword).toBe('guide');
  });
  it('exact: does not match a substring inside another word', () => {
    expect(matchKeyword('guidebook', [kw('guide')], 'exact').matched).toBe(false);
  });
  it('fuzzy: matches a substring', () => {
    expect(matchKeyword('guidebook', [kw('guide')], 'fuzzy').matched).toBe(true);
  });
  it('negative keyword vetoes an otherwise-matching text', () => {
    const r = matchKeyword('send guide refund', [kw('guide'), kw('refund', true)], 'exact');
    expect(r.matched).toBe(false);
    expect(r.vetoed).toBe(true);
  });
  it('no positive keyword → no match', () => {
    expect(matchKeyword('hello', [kw('refund', true)], 'exact').matched).toBe(false);
  });
  it('ai_intent/sentiment fall back to exact in Phase 1', () => {
    expect(matchKeyword('the guide', [kw('guide')], 'ai_intent').matched).toBe(true);
  });
});
