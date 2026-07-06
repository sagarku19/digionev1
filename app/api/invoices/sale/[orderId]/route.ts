export const runtime = 'nodejs'; // @react-pdf needs Node, not edge

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { buildSaleInvoiceModel, fyOf } from '@/lib/server/invoices/build';
import { issueAndCacheInvoice } from '@/lib/server/invoices/issue';

export async function GET(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ error: 'Invalid orderId.' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createServiceClient();
    const { data: order } = await db
      .from('orders')
      .select('id, creator_id, total_amount, status, customer_name, customer_email, user_id, created_at, order_items(price_at_purchase, products(name))')
      .eq('id', orderId)
      .maybeSingle();
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    if (order.status !== 'completed' || Number(order.total_amount) <= 0) {
      return NextResponse.json({ error: 'No invoice is available for this order.' }, { status: 404 });
    }

    const profileId = await resolveProfileId(user.id, user.email);
    const isCreator = !!profileId && order.creator_id === profileId;
    const isBuyer =
      order.user_id === user.id ||
      (!!order.customer_email && !!user.email && order.customer_email.toLowerCase() === user.email.toLowerCase());
    if (!isCreator && !isBuyer) {
      return NextResponse.json({ error: 'You cannot access this invoice.' }, { status: 403 });
    }
    if (!order.creator_id) return NextResponse.json({ error: 'Order has no creator.' }, { status: 404 });

    const { data: kyc } = await db
      .from('creator_kyc')
      .select('legal_name, gstin, address_line1, city, state')
      .eq('creator_id', order.creator_id)
      .maybeSingle();
    const address = [kyc?.address_line1, kyc?.city].filter(Boolean).join(', ') || null;

    const items = (order.order_items ?? []).map((it) => {
      const prod = Array.isArray(it.products) ? it.products[0] : it.products;
      return { name: prod?.name ?? 'Product', price: Number(it.price_at_purchase) };
    });
    const invoiceDate = String(order.created_at).slice(0, 10);
    const fy = fyOf(invoiceDate);

    const model = buildSaleInvoiceModel({
      invoiceNumber: '', // authoritative number injected by issueAndCacheInvoice
      invoiceDate,
      creator: { legalName: kyc?.legal_name ?? 'Creator', gstin: kyc?.gstin ?? null, address, state: kyc?.state ?? null },
      buyer: { name: order.customer_name, email: order.customer_email },
      items,
      total: Number(order.total_amount),
    });

    const { invoice, signedUrl, ttlSeconds } = await issueAndCacheInvoice(db, {
      type: 'sale', issuer: 'creator', creatorId: order.creator_id, orderId: order.id, periodMonth: null,
      fy, isTaxInvoice: false, subtotal: model.subtotal, taxAmount: 0, total: model.total,
      seriesKey: order.creator_id, prefix: 'INV', invoiceDate, model,
    });

    return NextResponse.json({ signedUrl, ttlSeconds, invoiceNumber: invoice.invoice_number }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[invoices/sale]', e);
    return NextResponse.json({ error: 'Could not generate invoice.' }, { status: 500 });
  }
}
