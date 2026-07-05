import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { fulfillOrder, fulfillPaymentLinkSubmission } from '@/lib/server/fulfillment';

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('x-webhook-signature');
    const rawBody = await req.text();

    const secret = process.env.CASHFREE_CLIENT_SECRET;
    if (!secret) {
      console.error('[webhook/cashfree] CASHFREE_CLIENT_SECRET is not configured');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // HMAC over the exact raw bytes, compared in constant time (finding #13)
    const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
    const sigBuf = Buffer.from(signature ?? '', 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');
    const signatureValid = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);

    if (!signatureValid) {
      console.warn('[webhook/cashfree] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const db = createServiceClient();

    // ── Refund webhooks (REFUND_STATUS_WEBHOOK: data.refund envelope) ──
    // Same endpoint + signature gate as payment webhooks. SUCCESS settles the
    // clawback; CANCELLED/FAILED releases the hold; PENDING/ONHOLD are no-ops.
    if (payload.type === 'REFUND_STATUS_WEBHOOK' || payload.data?.refund) {
      const r = payload.data?.refund ?? {};
      const merchantRefundId: string | undefined = r.refund_id;
      const cfRefundId = r.cf_refund_id != null ? String(r.cf_refund_id) : undefined;
      const refundStatus = String(r.refund_status ?? '').toUpperCase();

      if (!merchantRefundId) return NextResponse.json({ received: true });

      const { data: refund } = await db
        .from('refunds')
        .select('id, creator_id, amount')
        .eq('merchant_refund_id', merchantRefundId)
        .maybeSingle();
      if (!refund) {
        console.warn('[webhook/cashfree] Refund not found for refund_id:', merchantRefundId);
        return NextResponse.json({ received: true }); // stray/test event — no retry storms
      }

      if (refundStatus === 'SUCCESS' || refundStatus === 'CANCELLED' || refundStatus === 'FAILED') {
        const terminal = refundStatus === 'SUCCESS' ? 'success' : 'failed';
        const { data: settled, error: settleErr } = await db.rpc('settle_refund', {
          p_refund_id: refund.id,
          p_terminal: terminal,
          p_gateway_refund_id: cfRefundId,
          p_gateway_metadata: {
            refund_status: refundStatus,
            status_description: r.status_description ?? null,
          },
          p_failure_reason: terminal === 'failed' ? `gateway_${refundStatus}` : undefined,
        });
        // Real DB failure → 500 so Cashfree retries (claim makes retries safe no-ops).
        if (settleErr) {
          console.error('[webhook/cashfree] settle_refund failed', settleErr.message);
          return NextResponse.json({ error: 'processing failed' }, { status: 500 });
        }
        if (settled === true && terminal === 'success' && refund.creator_id) {
          await db.from('notifications').insert({
            recipient_creator_id: refund.creator_id,
            title: 'Refund processed',
            message: `₹${Number(refund.amount).toFixed(0)} was refunded to a buyer and deducted from your balance`,
            type: 'refund',
          });
        }
      }
      // PENDING / ONHOLD → acknowledge without action.
      return NextResponse.json({ received: true });
    }

    // ── Payment webhooks ──
    const gatewayOrderId: string | undefined = payload.data?.order?.order_id;
    const cfStatus: string | undefined = payload.data?.payment?.payment_status;
    const gatewayPaymentId: string | undefined =
      payload.data?.payment?.cf_payment_id != null
        ? String(payload.data.payment.cf_payment_id)
        : undefined;

    // Unknown envelope (no order, no refund) → ack. A 400 here caused Cashfree
    // retry storms for any non-payment event type.
    if (!gatewayOrderId) {
      return NextResponse.json({ received: true });
    }

    // ── Payment-link submissions (gateway ids are prefixed pl_) ── (finding #10)
    if (gatewayOrderId.startsWith('pl_')) {
      const { data: submission } = await db
        .from('payment_submissions')
        .select('id, payment_status')
        .eq('gateway_order_id', gatewayOrderId)
        .maybeSingle();

      if (!submission) {
        console.warn('[webhook/cashfree] Submission not found for gateway_order_id:', gatewayOrderId);
        return NextResponse.json({ received: true }); // acknowledge to avoid retry storms
      }
      if (submission.payment_status === 'completed' || submission.payment_status === 'refunded') {
        return NextResponse.json({ received: true });
      }

      if (cfStatus === 'SUCCESS') {
        await fulfillPaymentLinkSubmission(submission.id, gatewayPaymentId);
      } else if (cfStatus === 'FAILED' || cfStatus === 'USER_DROPPED') {
        await db
          .from('payment_submissions')
          .update({ payment_status: 'failed' })
          .eq('id', submission.id)
          .eq('payment_status', 'pending');
      }
      return NextResponse.json({ received: true });
    }

    // ── Product orders ──
    const { data: order } = await db
      .from('orders')
      .select('id, status')
      .eq('gateway_order_id', gatewayOrderId)
      .maybeSingle();

    if (!order) {
      console.warn('[webhook/cashfree] Order not found for gateway_order_id:', gatewayOrderId);
      return NextResponse.json({ received: true });
    }
    // Fast-path early exit; correctness no longer depends on it (the claim does)
    if (order.status === 'completed' || order.status === 'refunded') {
      return NextResponse.json({ received: true });
    }

    if (cfStatus === 'SUCCESS') {
      await fulfillOrder(order.id, { gatewayPaymentId });
    } else if (cfStatus === 'FAILED' || cfStatus === 'USER_DROPPED') {
      await db
        .from('orders')
        .update({ status: 'failed' })
        .eq('id', order.id)
        .eq('status', 'pending');
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[webhook/cashfree]', error);
    const msg = error instanceof Error ? error.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
