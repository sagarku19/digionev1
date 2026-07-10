// Human-friendly order reference derived from an order UUID. Display-only —
// the stored UUID is untouched. Deterministic: 'DO-' + first 12 hex chars of the
// UUID, uppercased. 'DO' = DigiOne. A 12-hex slice of an already-unique UUID is
// 48 bits — no realistic display collision. Always pass a real UUID
// (orders.id / payment_submissions.id), never a gateway id.
//
//   5c01ebea-1bfd-4702-9a38-ca75914d921c  →  "DO-5C01EBEA1BFD"

export function orderRef(id: string | null | undefined): string {
  if (!id) return '';
  const hex = id.replace(/-/g, '').slice(0, 12).toUpperCase();
  return `DO-${hex}`;
}

// True when the (partial) query the user typed into search matches an order's
// friendly code. Case-insensitive; ignores dashes and an optional "DO" label so
// "do-5c01", "do5c01", and "5c01" all match the same order. Matching is on the
// hex prefix ("O" is never a hex char, so stripping the "DO" label is
// unambiguous). Lets the orders search box find the code as well as the raw UUID.
export function matchesOrderRef(id: string, query: string): boolean {
  const q = query.trim().toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/^DO/, '');
  if (!q) return false;
  const hex = orderRef(id).replace(/[^0-9A-Z]/g, '').replace(/^DO/, '');
  return hex.startsWith(q);
}
