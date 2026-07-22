// POST /api/admin/refunds/[id]/reject  (super_admin only)
// Rejects a pending refund request: releases the request-time hold and records the
// admin's reason. No gateway call, no money moves out.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: requestId } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
      return NextResponse.json({ error: 'Invalid request id.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let reason: string | null = null;
    try {
      const body = await req.json();
      if (typeof body?.reason === 'string') reason = body.reason.trim().slice(0, 500) || null;
    } catch {
      /* reason is optional */
    }

    const db = createServiceClient();
    const { data: actor } = await db.from('users').select('role').eq('auth_provider_id', user.id).maybeSingle();
    if (actor?.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: ok } = await db.rpc('reject_refund_request', {
      p_request_id: requestId,
      p_reviewer: user.id,
      p_reason: reason ?? undefined,
    });
    if (!ok) {
      return NextResponse.json({ error: 'Request not found or not pending.' }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[admin/refunds/reject]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
