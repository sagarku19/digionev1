// POST /api/admin/refunds/[id]/approve  (super_admin only)
// Approves a pending refund request: runs the real refund engine (initiateRefund →
// begin_refund → Cashfree), then releases the request-time hold and links the refund.
// Hold-before-release ordering: if the gateway call fails, the request-time hold stays
// intact and the request stays pending (safe to retry).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { initiateRefund, RefundError } from '@/lib/server/refunds';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: requestId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
      return NextResponse.json({ error: 'Invalid request id.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createServiceClient();
    // Re-read role from the DB (service client has no JWT — is_super_admin() would be false).
    const { data: actor } = await db.from('users').select('role').eq('auth_provider_id', user.id).maybeSingle();
    if (actor?.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: reqRow } = await db
      .from('refund_requests')
      .select('id, order_id, creator_id, amount, reason, status')
      .eq('id', requestId)
      .maybeSingle();
    if (!reqRow) return NextResponse.json({ error: 'Refund request not found.' }, { status: 404 });
    if (reqRow.status !== 'pending') {
      return NextResponse.json({ error: `Request is ${reqRow.status}, not pending.` }, { status: 409 });
    }

    let refund;
    try {
      refund = await initiateRefund(db, {
        orderId: reqRow.order_id,
        amount: reqRow.amount,
        reason: reqRow.reason,
        initiatedBy: 'admin',
        initiatorId: reqRow.creator_id,
      });
    } catch (e) {
      if (e instanceof RefundError) return NextResponse.json({ error: e.message }, { status: 502 });
      throw e;
    }

    const { data: finalized } = await db.rpc('approve_refund_request', {
      p_request_id: requestId,
      p_reviewer: user.id,
      p_refund_id: refund.refundId,
    });
    if (!finalized) {
      // Request was no longer pending (race) — the refund is already in flight. Log and
      // report success; the refund itself is the source of truth for the money.
      console.warn('[admin/refunds/approve] request not pending at finalize', requestId);
    }

    return NextResponse.json({ success: true, refundId: refund.refundId });
  } catch (e) {
    console.error('[admin/refunds/approve]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
