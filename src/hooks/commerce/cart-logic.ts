// Pure cart rules — no store, no React. Unit-tested in cart-logic.test.ts.
// The single-creator rule mirrors the /api/checkout/create constraint:
// all items in one order must belong to one creator.

export interface CartItem {
  id: string; // Product ID
  title: string;
  price: number;
  creatorId: string;
  coverImage: string | null;
  slug: string;
}

export type AddItemResult = 'added' | 'exists' | 'conflict';

export function classifyAdd(items: CartItem[], item: CartItem): AddItemResult {
  if (items.some((i) => i.id === item.id)) return 'exists';
  if (items.length > 0 && items[0].creatorId !== item.creatorId) return 'conflict';
  return 'added';
}
