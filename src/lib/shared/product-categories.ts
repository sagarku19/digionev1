// Canonical taxonomy for products.category — the single list shared by the
// dashboard editors (CreateProductModal, product editor) and /discover
// (tab rail + filter). `value` is what the DB stores; `label` is the full
// display name; `short` is the compact tab label.
export interface ProductCategory {
  value: string;
  label: string;
  short: string;
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  { value: 'digital', label: 'Digital Downloads', short: 'Digital' },
  { value: 'course', label: 'Courses & Education', short: 'Courses' },
  { value: 'template', label: 'Design & Templates', short: 'Templates' },
  { value: 'music', label: 'Music & Audio', short: 'Music' },
  { value: 'software', label: 'Code & Software', short: 'Software' },
  { value: 'business', label: 'Business & Finance', short: 'Business' },
  { value: 'photography', label: 'Photography & Presets', short: 'Photography' },
  { value: 'other', label: 'Other', short: 'Other' },
];

export function productCategoryLabel(value: string | null | undefined): string {
  return PRODUCT_CATEGORIES.find((c) => c.value === value)?.label ?? 'Digital product';
}
