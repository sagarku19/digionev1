import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyPayoutWebhookSignatureLegacy } from '@/lib/server/cashfree-payouts';
import type { Json } from '@/types/database.types';

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const params = Object.fromEntries(new URLSearchParams(raw)) as Record<string, string>;
    const secret = process.env.CASHFREE_PAYOUT_WEBHOOK_SECRET ?? process.env.CASHFREE_PAYOUT_CLIENT_SECRET ?? '';
    if (!secret) {
      // Fail CLOSED — never verify against an empty key (would accept forged events).
      console.error('[webhook/cashfree-payout] no signing secret configured');
      return NextResponse.json({ error: 'not configured' }, { status: 500 });
    }
    if (!verifyPayoutWebhookSignatureLegacy(params, secret)) {
      console.warn('[webhook/cashfree-payout] invalid signature');
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }

    const event = params.event;
    const transferId = params.transferId ?? params.transfer_id;   // = our creator_payouts.id
    if (!transferId) return NextResponse.json({ received: true });  // nothing to do; avoid retry storms

    const db = createServiceClient();
    let settleErr: { message: string } | null = null;
    if (event === 'TRANSFER_SUCCESS') {
      ({ error: settleErr } = await db.rpc('settle_payout', { p_payout_id: transferId, p_terminal: 'success', p_gateway_payout_id: params.referenceId, p_gateway_metadata: params as Json }));
    } else if (event === 'TRANSFER_FAILED') {
      ({ error: settleErr } = await db.rpc('settle_payout', { p_payout_id: transferId, p_terminal: 'failed', p_gateway_payout_id: params.referenceId, p_gateway_metadata: params as Json, p_failure_reason: params.reason ?? 'transfer_failed' }));
    }
    // A real DB failure must NOT be ACKed — return non-2xx so Cashfree retries. settle_payout is
    // idempotent (status claim), so a duplicate/late retry that finds nothing to claim is a safe no-op.
    if (settleErr) {
      console.error('[webhook/cashfree-payout] settle failed', settleErr.message);
      return NextResponse.json({ error: 'processing failed' }, { status: 500 });
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('[webhook/cashfree-payout]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
