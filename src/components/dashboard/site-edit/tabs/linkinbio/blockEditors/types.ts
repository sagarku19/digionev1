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
