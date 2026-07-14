import { describe, it, expect } from 'vitest';
import { GUIDES, GUIDE_KEYS } from './content';

describe('dashboard guide registry', () => {
  it('has a guide for every key', () => {
    for (const key of GUIDE_KEYS) {
      expect(GUIDES[key], `missing guide: ${key}`).toBeDefined();
    }
  });

  it('has no registry keys outside GUIDE_KEYS', () => {
    expect(Object.keys(GUIDES).sort()).toEqual([...GUIDE_KEYS].sort());
  });

  it('every guide is well-formed', () => {
    for (const key of GUIDE_KEYS) {
      const g = GUIDES[key];
      expect(g.title.trim().length, `${key}.title`).toBeGreaterThan(0);
      expect(g.intro.trim().length, `${key}.intro`).toBeGreaterThan(0);
      expect(g.steps.length, `${key}.steps`).toBeGreaterThan(0);
      g.steps.forEach((s, i) => {
        expect(s.title.trim().length, `${key}.steps[${i}].title`).toBeGreaterThan(0);
        expect(s.desc.trim().length, `${key}.steps[${i}].desc`).toBeGreaterThan(0);
      });
    }
  });
});
