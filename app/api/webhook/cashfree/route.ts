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
    const gatewayOrderId: string | undefined = payload.data?.order?.order_id;
    const cfStatus: string | undefined = payload.data?.payment?.payment_status;
    const gatewayPaymentId: string | undefined =
      payload.data?.payment?.cf_payment_id != null
        ? String(payload.data.payment.cf_payment_id)
        : undefined;

    if (!gatewayOrderId) {
      return NextResponse.json({ error: 'Missing order ID' }, { status: 400 });
    }

    const db = createServiceClient();

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
