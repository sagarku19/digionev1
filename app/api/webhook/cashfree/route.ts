import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-webhook-signature');
    const rawBody = await req.text();

    // ── Verify Cashfree webhook signature ──
    const secret = process.env.CASHFREE_CLIENT_SECRET;
    if (!secret) {
      console.error('[webhook/cashfree] CASHFREE_CLIENT_SECRET is not configured');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('base64');

    if (signature !== expectedSignature) {
      console.warn('[webhook/cashfree] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const gatewayOrderId = payload.data?.order?.order_id;
    const cfStatus = payload.data?.payment?.payment_status;
    const gatewayPaymentId = payload.data?.payment?.cf_payment_id ?? null;

    if (!gatewayOrderId) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    // ── Fetch our order by gateway_order_id ──
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('gateway_order_id', gatewayOrderId)
      .single();

    if (!order) {
      console.warn('[webhook/cashfree] Order not found for gateway_order_id:', gatewayOrderId);
      return NextResponse.json({ received: true }); // Acknowledge to avoid retries
    }

    // ── Idempotency: skip if already processed ──
    if (order.status === 'completed' || order.status === 'refunded') {
      return NextResponse.json({ received: true });
    }

    if (cfStatus === 'SUCCESS') {
      // ── Mark order completed + record gateway payment id ──
      // Try with payment_verified_at (requires migration); fall back without it
      const completedUpdate: Record<string, any> = {
        status: 'completed',
        gateway_payment_id: gatewayPaymentId,
        payment_verified_at: new Date().toISOString(),
      };
      let { error: updateErr } = await (supabase.from('orders') as any).update(completedUpdate).eq('id', order.id);
      if (updateErr?.message?.includes('payment_verified_at')) {
        const { payment_verified_at: _, ...withoutVerified } = completedUpdate;
        await (supabase.from('orders') as any).update(withoutVerified).eq('id', order.id);
      }

      // ── Credit creator balance ──
      // creator_id is stored in order metadata (orders table has no creator_id column)
      const creatorProfileId = (order.metadata as any)?.creator_profile_id ?? null;
      if (creatorProfileId) {
        const platformFee = Number(order.total_amount) * 0.10;
        const creatorProceeds = Number(order.total_amount) - platformFee;

        const { data: balance } = await supabase
          .from('creator_balances')
          .select('*')
          .eq('creator_id', creatorProfileId)
          .single();

        if (balance) {
          await supabase.from('creator_balances').update({
            total_earnings: (balance.total_earnings ?? 0) + creatorProceeds,
            total_platform_fees: (balance.total_platform_fees ?? 0) + platformFee,
          }).eq('creator_id', creatorProfileId);
        } else {
          await supabase.from('creator_balances').insert({
            creator_id: creatorProfileId,
            total_earnings: creatorProceeds,
            total_platform_fees: platformFee,
            total_paid_out: 0,
            pending_payout: 0,
          });
        }

        // ── Transaction ledger ──
        const recordHash = crypto
          .createHash('sha256')
          .update(`${order.id}-${Date.now()}`)
          .digest('hex');
        await (supabase as any).from('transaction_ledger').insert({
          creator_id: creatorProfileId,
          order_id: order.id,
          amount: order.total_amount,
          direction: 'credit',
          tx_type: 'sale',
          currency: 'INR',
          record_hash: recordHash,
          meta: {
            platform_fee: platformFee,
            net_amount: creatorProceeds,
          },
        });

        // ── Notify creator ──
        await supabase.from('notifications').insert({
          recipient_creator_id: creatorProfileId,
          title: 'New Sale!',
          message: `You earned ₹${creatorProceeds.toFixed(0)} from a new order`,
          type: 'sale',
        } as any);
      }
    } else if (cfStatus === 'FAILED' || cfStatus === 'USER_DROPPED') {
      await supabase.from('orders')
        .update({ status: 'failed' } as any)
        .eq('id', order.id);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('[webhook/cashfree]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
