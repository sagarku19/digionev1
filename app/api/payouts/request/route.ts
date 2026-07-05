import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { availableBalance } from '@/lib/shared/balance';
import { MIN_PAYOUT_INR } from '@/lib/server/payout-policy';

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

    if (amount < MIN_PAYOUT_INR) {
      return NextResponse.json({ error: `Minimum payout is ₹${MIN_PAYOUT_INR}.` }, { status: 400 });
    }

    // Initialize Admin Client to bypass RLS for secure ledger writes
    const supabaseAdmin = createServiceClient();

    // Resolve the profiles.id — every money table keys on it, NOT auth.users.id (finding #3)
    const profileId = await resolveProfileId(user.id, user.email);
    if (!profileId) {
      return NextResponse.json({ error: 'Creator profile not found.' }, { status: 404 });
    }

    // 1. Verify KYC Status - Must be verified to withdraw
    const { data: kyc } = await supabaseAdmin
      .from('creator_kyc')
      .select('status')
      .eq('creator_id', profileId)
      .single();

    if (!kyc || kyc.status !== 'verified') {
      return NextResponse.json({ error: 'KYC must be verified before requesting a payout.' }, { status: 403 });
    }

    // Risk control: one in-flight payout at a time. Belt-and-braces with the
    // optimistic pending_payout guard below (racers lose the .eq match anyway).
    const { data: inflight } = await supabaseAdmin
      .from('creator_payouts')
      .select('id')
      .eq('creator_id', profileId)
      .in('status', ['pending', 'processing'])
      .limit(1);
    if (inflight && inflight.length > 0) {
      return NextResponse.json(
        { error: 'You already have a payout in progress. Wait for it to complete before requesting another.' },
        { status: 409 }
      );
    }

    // 2. Lock and Check Balance
    const { data: balanceData, error: balanceError } = await supabaseAdmin
      .from('creator_balances')
      .select('total_earnings, total_platform_fees, total_paid_out, pending_payout, frozen_balance')
      .eq('creator_id', profileId)
      .single();

    if (balanceError || !balanceData) {
      return NextResponse.json({ error: 'Could not fetch balance details.' }, { status: 500 });
    }

    const available_balance = availableBalance(balanceData);

    if (available_balance < amount) {
      return NextResponse.json({ error: 'Insufficient available balance.' }, { status: 400 });
    }

    // 3. Mathematical Transaction
    // Decrease available_balance natively by increasing pending_payout.
    const newPending = balanceData.pending_payout + amount;

    const { data: updatedRows, error: deductionError } = await supabaseAdmin
      .from('creator_balances')
      .update({
        pending_payout: newPending,
      })
      .eq('creator_id', profileId)
      // Optimistic concurrency check -> only update if pending_payout still matches our reading.
      // supabase-js returns no error on a 0-row update, so a lost update is only detectable by
      // checking the affected rows. Exactly one row must change; otherwise it's a collision.
      .eq('pending_payout', balanceData.pending_payout)
      .select('id');

    if (deductionError || !updatedRows || updatedRows.length !== 1) {
      return NextResponse.json({ error: 'Transaction collision. Please try again.' }, { status: 409 });
    }

    // 4. Create Payout Request Log
    const { data: method } = await supabaseAdmin
      .from('creator_payout_methods')
      .select('id')
      .eq('creator_id', profileId)
      .eq('is_default', true)
      .maybeSingle();

    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('creator_payouts')
      .insert({
        creator_id: profileId,
        amount: amount,
        currency: 'INR',
        status: 'pending',
        payout_method_id: method?.id ?? null,
      })
      .select()
      .single();

    if (payoutError) {
      return NextResponse.json({ error: 'Failed to record payout ledger.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, payout }, { status: 200 });
    
  } catch (error) {
    console.error('Payout Request Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
