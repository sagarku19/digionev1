// POST /api/checkout/payment-link — creates a Cashfree payment session for payment_requests sites.
// DB tables read: payment_requests (via siteId). Written: payment_submissions.
// Uses Cashfree Sandbox/Production based on CASHFREE_ENVIRONMENT env var.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // service role — bypasses RLS for payment_submissions write
);

const CASHFREE_ENV = process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

interface CashfreeOrderBody {
  order_id: string;
  order_amount: number;
  order_currency: string;
  customer_details: {
    customer_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  };
  order_meta: {
    return_url: string;
    notify_url: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      siteId?: string;
      name?: string;
      email?: string;
      phone?: string;
      amount?: number;
    };

    const { siteId, name, email, phone, amount } = body;

    // Validate required fields
    if (!siteId || !name || !email || !amount) {
      return NextResponse.json({ error: 'Missing required fields: siteId, name, email, amount' }, { status: 400 });
    }

    if (amount < 1) {
      return NextResponse.json({ error: 'Amount must be at least ₹1' }, { status: 400 });
    }

    // 1. Fetch the payment_request row for this site to validate it exists & is active
    const { data: payRequest, error: prErr } = await supabase
      .from('payment_requests')
      .select('id, site_id, amount, is_fixed_amount, status, title')
      .eq('site_id', siteId)
      .eq('status', 'active')
      .maybeSingle();

    if (prErr) throw prErr;

    // If no payment_request exists yet for this site, create one on-the-fly
    let paymentRequestId: string;

    if (!payRequest) {
      // Auto-create a payment_request record for this site
      const { data: newPR, error: createErr } = await supabase
        .from('payment_requests')
        .insert({
          site_id: siteId,
          title: 'Payment',
          amount: amount,
          is_fixed_amount: false,
          status: 'active',
        })
        .select('id')
        .single();

      if (createErr || !newPR) throw createErr ?? new Error('Failed to create payment request');
      paymentRequestId = newPR.id;
    } else {
      paymentRequestId = payRequest.id;

      // Enforce fixed amount if applicable
      if (payRequest.is_fixed_amount && payRequest.amount && payRequest.amount !== amount) {
        return NextResponse.json({
          error: `This is a fixed-amount link. Expected ₹${payRequest.amount}`
        }, { status: 400 });
      }
    }

    // 2. Create payment_submission record (pending) — server-side write required by RLS rules
    const submissionId = crypto.randomUUID();
    const { error: subErr } = await supabase.from('payment_submissions').insert({
      id: submissionId,
      payment_request_id: paymentRequestId,
      customer_name: name,
      customer_email: email,
      customer_phone: phone ?? '',
      amount: amount,
      payment_status: 'pending',
      gateway_name: 'cashfree',
    });

    if (subErr) throw subErr;

    // 3. Call Cashfree API to create a payment session
    const orderId = `pl_${submissionId.replace(/-/g, '').slice(0, 20)}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    const cashfreePayload: CashfreeOrderBody = {
      order_id: orderId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: submissionId, // use submission ID as stable customer ref
        customer_name: name,
        customer_email: email,
        customer_phone: phone ?? '0000000000',
      },
      order_meta: {
        return_url: `${appUrl}/payment/status?order_id={order_id}&sub=${submissionId}`,
        notify_url: `${appUrl}/api/webhook/cashfree`,
      },
    };

    const cfRes = await fetch(`${CASHFREE_ENV}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_CLIENT_ID!,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET!,
      },
      body: JSON.stringify(cashfreePayload),
    });

    const cfData = await cfRes.json() as {
      payment_session_id?: string;
      order_id?: string;
      message?: string;
    };

    if (!cfRes.ok || !cfData.payment_session_id) {
      console.error('[payment-link] Cashfree error:', cfData);
      return NextResponse.json(
        { error: cfData.message ?? 'Cashfree order creation failed' },
        { status: 502 }
      );
    }

    // 4. Update submission with gateway order_id
    await supabase
      .from('payment_submissions')
      .update({ gateway_order_id: orderId })
      .eq('id', submissionId);

    return NextResponse.json({
      payment_session_id: cfData.payment_session_id,
      order_id: orderId,
      submission_id: submissionId,
      environment: process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION' ? 'production' : 'sandbox',
      // For Cashfree JS SDK: pass payment_session_id to cashfree.checkout()
      // For redirect-based: use the Cashfree hosted payment page
      payment_url: `https://payments${process.env.CASHFREE_ENVIRONMENT !== 'PRODUCTION' ? '-test' : ''}.cashfree.com/order/#${cfData.payment_session_id}`,
    });
  } catch (err: unknown) {
    console.error('[api/checkout/payment-link]', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
