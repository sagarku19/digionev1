import { describe, it, expect } from 'vitest';
import { mapBlocksToLinks, type MappableBlock, type MappableItem } from './mapBlocksToLinks';

const emptyItem = (over: Partial<MappableItem> = {}): MappableItem => ({
  title: null, description: null, url: null, thumbnail_url: null, product_id: null, metadata: null, ...over,
});

describe('mapBlocksToLinks', () => {
  it('maps a block with no matching item using content fallbacks', () => {
    const blocks: MappableBlock[] = [
      { id: 'b1', type: 'url', content: { title: 'My Link', url: 'https://x.com', description: 'desc' }, style: {} },
    ];
    const [link] = mapBlocksToLinks(blocks, {});
    expect(link).toMatchObject({
      id: 'b1',
      link_type: 'url',
      title: 'My Link',
      url: 'https://x.com',
      description: 'desc',
      product_id: null,
      icon_type: null,
      style_variant: 'default',
    });
    expect(link.metadata).toEqual({ title: 'My Link', url: 'https://x.com', description: 'desc' });
  });

  it('prefers item fields over content fields', () => {
    const blocks: MappableBlock[] = [
      { id: 'b1', type: 'url', content: { title: 'from content', url: 'https://content' }, style: {} },
    ];
    const items = { b1: emptyItem({ title: 'from item', url: 'https://item' }) };
    const [link] = mapBlocksToLinks(blocks, items);
    expect(link.title).toBe('from item');
    expect(link.url).toBe('https://item');
  });

  it('reads icon_type/style_variant from item metadata, falling back to block style', () => {
    const blocks: MappableBlock[] = [
      { id: 'b1', type: 'url', content: {}, style: { icon_type: 'github', variant: 'featured' } },
      { id: 'b2', type: 'url', content: {}, style: { icon_type: 'github', variant: 'featured' } },
    ];
    const items = { b1: emptyItem({ metadata: { icon_type: 'youtube', style_variant: 'compact' } }) };
    const [a, b] = mapBlocksToLinks(blocks, items);
    // b1: item metadata wins
    expect(a.icon_type).toBe('youtube');
    expect(a.style_variant).toBe('compact');
    // b2: no item → block style is the fallback
    expect(b.icon_type).toBe('github');
    expect(b.style_variant).toBe('featured');
  });

  it('does not crash when an item has null metadata', () => {
    const blocks: MappableBlock[] = [{ id: 'b1', type: 'url', content: { title: 't' }, style: {} }];
    const items = { b1: emptyItem({ metadata: null, title: 'item title' }) };
    expect(() => mapBlocksToLinks(blocks, items)).not.toThrow();
    const [link] = mapBlocksToLinks(blocks, items);
    expect(link.title).toBe('item title');
    expect(link.icon_type).toBe(null);
    expect(link.style_variant).toBe('default');
  });

  it('carries product_id from the item for product blocks', () => {
    const blocks: MappableBlock[] = [{ id: 'b1', type: 'product', content: {}, style: {} }];
    const items = { b1: emptyItem({ product_id: 'prod_123' }) };
    const [link] = mapBlocksToLinks(blocks, items);
    expect(link.link_type).toBe('product');
    expect(link.product_id).toBe('prod_123');
  });

  it('merges metadata with item metadata winning over content', () => {
    const blocks: MappableBlock[] = [
      { id: 'b1', type: 'banner', content: { a: 1, shared: 'content' }, style: {} },
    ];
    const items = { b1: emptyItem({ metadata: { b: 2, shared: 'item' } }) };
    const [link] = mapBlocksToLinks(blocks, items);
    expect(link.metadata).toEqual({ a: 1, b: 2, shared: 'item' });
  });

  it('preserves block order and defaults missing fields to null', () => {
    const blocks: MappableBlock[] = [
      { id: 'b1', type: 'heading', content: {}, style: {} },
      { id: 'b2', type: 'space', content: {}, style: {} },
    ];
    const links = mapBlocksToLinks(blocks, {});
    expect(links.map(l => l.id)).toEqual(['b1', 'b2']);
    expect(links[0]).toMatchObject({ title: null, url: null, thumbnail_url: null, product_id: null });
  });
});
