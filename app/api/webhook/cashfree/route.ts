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

    const expectedSignature = crypto
      .createHmac('sha256', process.env.CASHFREE_CLIENT_SECRET || 'secret')
      .update(rawBody)
      .digest('base64');

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const orderId = payload.data?.order?.order_id;
    const status = payload.data?.payment?.payment_status;

    if (!orderId) {
      return NextResponse.json({ error: "Missing order ID" }, { status: 400 });
    }

    if (status === 'SUCCESS') {
      const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
      
      if (order && order.status !== 'success') {
        await supabase.from('orders').update({ status: 'success' }).eq('id', orderId);
        
        // Ledger arithmetic mapping
        const platformFee = order.total_amount * 0.10;
        const creatorProceeds = order.total_amount - platformFee;

        const { data: balance } = await (supabase as any).from('creator_balances').select('*').eq('creator_id', order.creator_id).single();
        
        if (balance) {
          await (supabase as any).from('creator_balances')
            .update({ 
              available_balance: (balance.available_balance || 0) + creatorProceeds,
              total_earned: (balance.total_earned || 0) + creatorProceeds
            })
            .eq('creator_id', order.creator_id);
        } else {
          await (supabase as any).from('creator_balances').insert({
            creator_id: order.creator_id,
            available_balance: creatorProceeds,
            total_earned: creatorProceeds
          });
        }

        // Ledger insert
        await (supabase as any).from('transaction_ledger').insert({
          creator_id: order.creator_id,
          order_id: orderId,
          amount: order.total_amount,
          fee_amount: platformFee,
          net_amount: creatorProceeds,
          type: 'sale',
          status: 'completed'
        });

        // Global activity dispatch
        await supabase.from('notifications').insert({
          user_id: order.creator_id,
          title: 'New Sale!',
          message: `You earned ₹${creatorProceeds} from order ${orderId}`,
          type: 'sale'
        });
      }
    } else if (status === 'FAILED') {
      await supabase.from('orders').update({ status: 'failed' }).eq('id', orderId);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
