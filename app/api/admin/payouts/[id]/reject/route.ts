import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: payoutId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createServiceClient();
    // Re-read role from the DB (service client has no JWT — is_super_admin() would be false).
    const { data: actor } = await db.from('users').select('role').eq('auth_provider_id', user.id).maybeSingle();
    if (actor?.role !== 'super_admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const reason = typeof (body as { reason?: string }).reason === 'string' && (body as { reason: string }).reason.trim()
      ? (body as { reason: string }).reason.trim()
      : 'Rejected by admin';

    // Only a still-pending payout can be rejected (never after the transfer fired).
    const { data: payout } = await db.from('creator_payouts').select('status').eq('id', payoutId).maybeSingle();
    if (!payout) return NextResponse.json({ error: 'Payout not found.' }, { status: 404 });
    if (payout.status !== 'pending') return NextResponse.json({ error: `Cannot reject a ${payout.status} payout.` }, { status: 409 });

    // Atomic + pending-only: p_expect_status='pending' means settle_payout can NEVER fail an
    // already-claimed (processing) payout — closes the reject-vs-approve double-pay race.
    const { data: ok, error: settleErr } = await db.rpc('settle_payout', {
      p_payout_id: payoutId, p_terminal: 'failed', p_failure_reason: reason, p_expect_status: 'pending',
    });
    if (settleErr) {
      console.error('[admin/payouts/reject] settle failed', settleErr.message);
      return NextResponse.json({ error: 'Failed to reject payout.' }, { status: 500 });
    }
    if (!ok) return NextResponse.json({ error: 'Payout is no longer pending.' }, { status: 409 });
    return NextResponse.json({ ok: true, status: 'failed' });
  } catch (e) {
    console.error('[admin/payouts/reject]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
