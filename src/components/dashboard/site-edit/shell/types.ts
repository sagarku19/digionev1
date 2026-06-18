import type React from 'react';

// Minimal shape every section row needs. Editors keep their own richer types.
export type SectionItem = { id: string; is_visible: boolean };

export type SectionCategory = { id: string; label: string };

// One registry entry = one section/block type.
export type SectionDef<TItem extends SectionItem> = {
  type: string;
  label: string;
  icon: React.ElementType;
  categoryId: string;
  summarize: (item: TItem) => string;
};

export type SectionRegistry<TItem extends SectionItem> = {
  categories: SectionCategory[];
  defs: Record<string, SectionDef<TItem>>;
};
