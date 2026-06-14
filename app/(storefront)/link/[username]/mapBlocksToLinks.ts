// Pure mapping: V2 linkinbio blocks + their items → the flat BioLink shape
// the renderer consumes. Extracted from the link page so it can be unit-tested.
import type { BioLink } from '@/components/storefront/linkinbio/blockRenderers/_shared';

// Structural subsets of the DB rows — the page passes full Supabase Rows,
// which are assignable to these (they carry at least these fields).
export type MappableBlock = { id: string; type: string; content: unknown; style: unknown };
export type MappableItem = {
  title: string | null;
  description: string | null;
  url: string | null;
  thumbnail_url: string | null;
  product_id: string | null;
  metadata: unknown;
};

// reason: block content/style and item metadata are heterogeneous per-block jsonb
type Dict = Record<string, unknown>;

export function mapBlocksToLinks(
  blocks: MappableBlock[],
  itemsByBlock: Record<string, MappableItem>,
): BioLink[] {
  return blocks.map((b) => {
    const content = (b.content ?? {}) as Dict;
    const style = (b.style ?? {}) as Dict;
    const item = itemsByBlock[b.id];
    const itemMeta = (item?.metadata ?? {}) as Dict;

    return {
      id: b.id,
      link_type: b.type,
      title: item?.title ?? (content.title as string | undefined) ?? null,
      description: item?.description ?? (content.description as string | undefined) ?? null,
      url: item?.url ?? (content.url as string | undefined) ?? null,
      thumbnail_url: item?.thumbnail_url ?? (content.thumbnail_url as string | undefined) ?? null,
      product_id: item?.product_id ?? null,
      icon_type: (itemMeta.icon_type as string | undefined) ?? (style.icon_type as string | undefined) ?? null,
      style_variant: (itemMeta.style_variant as string | undefined) ?? (style.variant as string | undefined) ?? 'default',
      metadata: { ...content, ...itemMeta },
    };
  });
}
