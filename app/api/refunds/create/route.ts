import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { rateLimitKey } from '@/lib/server/rate-limit';
import { initiateRefund, RefundError } from '@/lib/server/refunds';

const ERROR_STATUS: Record<string, number> = {
  not_found: 404,
  invalid_state: 409,
  over_refund: 400,
  missing_ledger: 409,
  gateway: 502,
  internal: 500,
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { orderId?: string; amount?: number; reason?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const orderId = typeof body.orderId === 'string' ? body.orderId : '';
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) {
      return NextResponse.json({ error: 'Invalid orderId.' }, { status: 400 });
    }
    const amount = body.amount == null ? null : Number(body.amount);
    if (amount != null && (!Number.isFinite(amount) || amount < 1)) {
      return NextResponse.json({ error: 'Refund amount must be at least ₹1.' }, { status: 400 });
    }
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : null;

    const profileId = await resolveProfileId(user.id, user.email);
    if (!profileId) {
      return NextResponse.json({ error: 'Creator profile not found.' }, { status: 404 });
    }

    const allowed = await rateLimitKey(`refund:${profileId}`, { max: 5, windowSeconds: 60 });
    if (!allowed) {
      return NextResponse.json({ error: 'Too many refund requests. Try again in a minute.' }, { status: 429 });
    }

    const db = createServiceClient();
    const { data: order } = await db
      .from('orders')
      .select('id, creator_id')
      .eq('id', orderId)
      .maybeSingle();
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    if (order.creator_id !== profileId) {
      return NextResponse.json({ error: 'You can only refund your own orders.' }, { status: 403 });
    }

    const refund = await initiateRefund(db, {
      orderId,
      amount,
      reason,
      initiatedBy: 'creator',
      initiatorId: profileId,
    });

    return NextResponse.json({ success: true, refund });
  } catch (e) {
    if (e instanceof RefundError) {
      return NextResponse.json({ error: e.message }, { status: ERROR_STATUS[e.code] ?? 500 });
    }
    console.error('[refunds/create]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
