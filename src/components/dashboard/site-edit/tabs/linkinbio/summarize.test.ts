import { describe, it, expect } from 'vitest';
import { summarizeBlock } from './summarize';
import type { BioLink } from './blockEditors/types';

const base: BioLink = {
  id: '1', link_type: 'url', title: '', description: '', url: '',
  thumbnail_url: '', product_id: '', icon_type: 'external',
  style_variant: 'default', is_visible: true, sort_order: 1, metadata: {},
};

describe('summarizeBlock', () => {
  it('summarizes a url block with title and url', () => {
    expect(summarizeBlock({ ...base, link_type: 'url', title: 'My Website', url: 'mysite.com' }))
      .toBe('My Website · mysite.com');
  });
  it('falls back to "Link" when a url block has no title', () => {
    expect(summarizeBlock({ ...base, link_type: 'url', url: 'mysite.com' })).toBe('Link · mysite.com');
  });
  it('counts social platforms', () => {
    expect(summarizeBlock({ ...base, link_type: 'social_icons', metadata: { links: [{}, {}, {}] } }))
      .toBe('3 platforms');
  });
  it('singularizes one platform', () => {
    expect(summarizeBlock({ ...base, link_type: 'social_icons', metadata: { links: [{}] } }))
      .toBe('1 platform');
  });
  it('uses heading title', () => {
    expect(summarizeBlock({ ...base, link_type: 'heading', title: 'Featured' })).toBe('Featured');
  });
  it('falls back to the type for unknown blocks', () => {
    expect(summarizeBlock({ ...base, link_type: 'mystery' })).toBe('mystery');
  });
});
