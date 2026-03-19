import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const supabase = await createClient(); // Uses cookies to verify the JWT
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount } = await req.json();

    if (!amount || isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount requested.' }, { status: 400 });
    }

    // Initialize Admin Client to bypass RLS for secure ledger writes
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Verify KYC Status - Must be verified to withdraw
    const { data: kyc } = await supabaseAdmin
      .from('creator_kyc')
      .select('status')
      .eq('creator_id', user.id)
      .single();

    if (!kyc || kyc.status !== 'verified') {
      return NextResponse.json({ error: 'KYC must be verified before requesting a payout.' }, { status: 403 });
    }

    // 2. Lock and Check Balance
    const { data: balanceData, error: balanceError } = await supabaseAdmin
      .from('creator_balances')
      .select('total_earnings, total_platform_fees, total_paid_out, pending_payout')
      .eq('creator_id', user.id)
      .single();

    if (balanceError || !balanceData) {
      return NextResponse.json({ error: 'Could not fetch balance details.' }, { status: 500 });
    }

    const available_balance = balanceData.total_earnings - balanceData.total_platform_fees - balanceData.total_paid_out - balanceData.pending_payout;

    if (available_balance < amount) {
      return NextResponse.json({ error: 'Insufficient available balance.' }, { status: 400 });
    }

    // 3. Mathematical Transaction
    // Decrease available_balance natively by increasing pending_payout.
    const newPending = balanceData.pending_payout + amount;

    const { error: deductionError } = await supabaseAdmin
      .from('creator_balances')
      .update({
        pending_payout: newPending,
      })
      .eq('creator_id', user.id)
      // Optimistic concurrency check -> only update if pending_payout matches our reading
      .eq('pending_payout', balanceData.pending_payout); 

    if (deductionError) {
      return NextResponse.json({ error: 'Transaction collision. Please try again.' }, { status: 409 });
    }

    // 4. Create Payout Request Log
    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('creator_payouts')
      .insert({
        creator_id: user.id,
        amount: amount,
        currency: 'INR',
        status: 'pending'
      })
      .select()
      .single();

    if (payoutError) {
      return NextResponse.json({ error: 'Failed to record payout ledger.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, payout }, { status: 200 });
    
  } catch (error: any) {
    console.error('Payout Request Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
