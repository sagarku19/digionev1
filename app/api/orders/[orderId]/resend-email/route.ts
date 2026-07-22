// POST /api/orders/[orderId]/resend-email
// Creator-facing: re-sends the purchase-confirmation ("access link") email for one
// of the creator's own orders and records the outcome on orders.confirmation_email_*.
// Cookie session required; the order must belong to the calling creator.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { rateLimitKey } from '@/lib/server/rate-limit';
import { sendAndRecordOrderConfirmation } from '@/lib/server/order-email';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
      return NextResponse.json({ error: 'Invalid orderId.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profileId = await resolveProfileId(user.id, user.email);
    if (!profileId) {
      return NextResponse.json({ error: 'Creator profile not found.' }, { status: 404 });
    }

    const allowed = await rateLimitKey(`resend-email:${profileId}`, { max: 10, windowSeconds: 60 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests. Try again in a minute.' }, { status: 429 });
    }

    const db = createServiceClient();
    const { data: order } = await db
      .from('orders')
      .select('id, creator_id, status')
      .eq('id', orderId)
      .maybeSingle();
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    if (order.creator_id !== profileId) {
      return NextResponse.json({ error: 'You can only resend your own orders.' }, { status: 403 });
    }
    if (order.status !== 'completed') {
      return NextResponse.json({ error: 'Only completed orders can be resent.' }, { status: 409 });
    }

    const result = await sendAndRecordOrderConfirmation(orderId);
    if (result.status === 'failed') {
      return NextResponse.json({ error: `Email failed: ${result.error}` }, { status: 502 });
    }
    if (result.status === 'skipped') {
      return NextResponse.json({ error: `Email skipped: ${result.reason}` }, { status: 422 });
    }
    return NextResponse.json({ ok: true, status: result.status });
  } catch (error) {
    console.error('[orders/resend-email]', error);
    const msg = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
