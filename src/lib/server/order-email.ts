// Builds, sends, and records the purchase-confirmation ("access link") email for a
// product order. Single source of truth for both the fulfillment path and the
// creator-triggered resend route. The outcome is persisted to orders.confirmation_email_*
// so it's visible in the dashboard (previously the send result was swallowed).
// Server-only (service role).

import { createServiceClient } from '@/lib/supabase/service';
import { normalizeEmail } from '@/lib/shared/email';
import { buildAccessLinks } from '@/lib/shared/access-links';
import { resolveBucket } from '@/lib/storage/buckets';
import { sendPurchaseConfirmation, type EmailSendResult } from './email';

type ServiceClient = ReturnType<typeof createServiceClient>;

async function recordOutcome(
  db: ServiceClient,
  orderId: string,
  result: EmailSendResult,
  to: string | null
): Promise<void> {
  const { error } = await db
    .from('orders')
    .update({
      confirmation_email_status: result.status,
      confirmation_email_to: to,
      confirmation_email_sent_at: result.status === 'sent' ? new Date().toISOString() : null,
      confirmation_email_error:
        result.status === 'failed' ? result.error : result.status === 'skipped' ? result.reason : null,
    })
    .eq('id', orderId);
  if (error) {
    console.error('[order-email] failed to record email outcome for order', orderId, error.message);
  }
}

// Sends the confirmation email for a product order and records the outcome on the
// order row. Never throws — returns the recorded result. Guests and logged-in
// buyers both get the email (isGuest flips the CTA target only).
export async function sendAndRecordOrderConfirmation(orderId: string): Promise<EmailSendResult> {
  const db = createServiceClient();

  const { data: order, error: orderErr } = await db
    .from('orders')
    .select('id, user_id, total_amount, metadata, customer_email, customer_name')
    .eq('id', orderId)
    .maybeSingle();

  if (orderErr || !order) {
    return { status: 'skipped', reason: 'order_not_found' };
  }

  const recipientEmail = order.customer_email ? normalizeEmail(order.customer_email) : null;
  if (!recipientEmail) {
    const result: EmailSendResult = { status: 'skipped', reason: 'no_recipient_email' };
    await recordOutcome(db, orderId, result, null);
    return result;
  }

  const { data: items } = await db
    .from('order_items')
    .select('product_id, price_at_purchase, products(id, name, description, product_link, post_purchase_url, access_links)')
    .eq('order_id', orderId);

  if (!items || items.length === 0) {
    const result: EmailSendResult = { status: 'skipped', reason: 'no_items' };
    await recordOutcome(db, orderId, result, recipientEmail);
    return result;
  }

  // Which purchased products ship downloadable files? One query over storage_files
  // (same bucket + not-deleted filter the deliverables route uses) so the email can
  // flag files alongside the access links.
  const productIds = items
    .map((item) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      return product?.id ?? item.product_id;
    })
    .filter((id): id is string => !!id);
  const productsWithFiles = new Set<string>();
  if (productIds.length > 0) {
    try {
      const { data: fileRows } = await db
        .from('storage_files')
        .select('product_id')
        .eq('bucket', resolveBucket('creator-content').name)
        .in('product_id', productIds)
        .is('deleted_at', null);
      for (const row of fileRows ?? []) {
        if (row.product_id) productsWithFiles.add(row.product_id);
      }
    } catch (fileErr) {
      console.error('[order-email] file-detection failed for order', orderId, fileErr instanceof Error ? fileErr.message : fileErr);
    }
  }

  const metadata = (order.metadata ?? {}) as Record<string, unknown>;
  const result = await sendPurchaseConfirmation({
    to: recipientEmail,
    customerName: order.customer_name ?? 'there',
    orderId,
    totalAmount: Number(order.total_amount) || 0,
    discountAmount: typeof metadata.discount_amount === 'number' ? metadata.discount_amount : 0,
    isGuest: !order.user_id,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    items: items.map((item) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products;
      const pid = product?.id ?? item.product_id ?? '';
      return {
        name: product?.name ?? 'Product',
        price: Number(item.price_at_purchase) || 0,
        links: buildAccessLinks({
          postPurchaseUrl: product?.post_purchase_url,
          accessLinks: product?.access_links,
        }),
        hasFiles: pid ? productsWithFiles.has(pid) : false,
      };
    }),
  });

  await recordOutcome(db, orderId, result, recipientEmail);
  return result;
}
