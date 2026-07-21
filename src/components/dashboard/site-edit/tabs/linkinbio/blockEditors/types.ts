// Block-editor contract for Link-in-Bio blocks.
// Each block editor receives the link plus callbacks that already close over
// link.id, so block components never deal with ids directly.

export type BioLink = {
  id: string;
  link_type: string;
  title: string;
  description: string;
  url: string;
  thumbnail_url: string;
  product_id: string;
  icon_type: string;
  style_variant: string;
  is_visible: boolean;
  sort_order: number;
  // Heterogeneous per-block jsonb bag — each block editor reads its own keys
  // (strings/booleans/arrays). A precise type is a discriminated union across all
  // block types (tracked in .claude/todo-later/9); kept `any` with this documented
  // reason per CLAUDE.md rather than casting at ~60 call sites.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
};

export type ProductLite = {
  id: string;
  name: string;
  price: number;
  thumbnail_url: string | null;
  is_published?: boolean;
};

export type BlockEditorProps = {
  link: BioLink;
  update: (updates: Partial<BioLink>) => void;
  updateMeta: (key: string, value: unknown) => void;
  openImagePicker: (field: string) => void;
  products?: ProductLite[];
};
