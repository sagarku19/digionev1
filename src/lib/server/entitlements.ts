// Email-keyed guest entitlements: bridge between a guest checkout (no account)
// and durable user_product_access once the buyer signs in. Email is the join key.
// Server-only (service role — bypasses RLS).

import { createServiceClient } from '@/lib/supabase/service';
import { normalizeEmail } from '@/lib/shared/email';

export interface GuestEntitlementInput {
  orderId: string;
  email: string;
  productId: string;
  productName: string;
  productPrice: number;
  productLink: string;
}

// Called from fulfillment for guest orders. Idempotent via the
// (order_id, product_id) UNIQUE constraint.
export async function recordGuestEntitlement(input: GuestEntitlementInput): Promise<void> {
  const db = createServiceClient();
  const { error } = await db.from('guest_entitlements').upsert(
    {
      order_id: input.orderId,
      email: normalizeEmail(input.email),
      product_id: input.productId,
      product_name: input.productName,
      product_price: input.productPrice,
      product_link: input.productLink,
    },
    { onConflict: 'order_id,product_id', ignoreDuplicates: true }
  );
  if (error) {
    console.error('[entitlements] guest entitlement insert failed for order', input.orderId, error.message);
  }
}

// Called after a session exists (claim route + auth callback). Copies every
// unclaimed guest_entitlements row matching the buyer's verified email into
// user_product_access, then stamps the rows claimed. Idempotent + retryable.
export async function claimGuestEntitlements(email: string, userId: string): Promise<number> {
  const db = createServiceClient();
  const normalized = normalizeEmail(email);

  const { data: rows, error: readErr } = await db
    .from('guest_entitlements')
    .select('id, order_id, product_id, product_name, product_price, product_link')
    .eq('email', normalized)
    .is('claimed_by_user_id', null);

  if (readErr) {
    console.error('[entitlements] claim read failed for', normalized, readErr.message);
    return 0;
  }
  if (!rows || rows.length === 0) return 0;

  let claimed = 0;
  for (const row of rows) {
    const { error: grantErr } = await db.from('user_product_access').upsert(
      {
        user_id: userId,
        order_id: row.order_id,
        product_id: row.product_id,
        product_name: row.product_name,
        product_price: Number(row.product_price) || 0,
        product_link: row.product_link,
      },
      { onConflict: 'order_id,product_id', ignoreDuplicates: true }
    );
    if (grantErr) {
      console.error('[entitlements] access grant failed during claim for order', row.order_id, grantErr.message);
      continue;
    }

    const { error: stampErr } = await db
      .from('guest_entitlements')
      .update({ claimed_by_user_id: userId, claimed_at: new Date().toISOString() })
      .eq('id', row.id)
      .is('claimed_by_user_id', null);
    if (stampErr) {
      console.error('[entitlements] claim stamp failed for row', row.id, stampErr.message);
      continue;
    }
    claimed += 1;
  }

  return claimed;
}
