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

    // Phase 5 risk control: block payout once GST registration is legally due (₹20L / ₹10L
    // special-category turnover) until the creator furnishes a GSTIN.
    const { data: gstGate } = await supabaseAdmin.rpc('gst_registration_required', { p_creator_id: profileId });
    if (gstGate === true) {
      return NextResponse.json(
        { error: 'Your sales have crossed the GST registration threshold. Add your GSTIN to withdraw.', code: 'gstin_required' },
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

    // Phase 5: accrued TDS/TCS is withheld in full on the next payout. Reject a withdrawal
    // that wouldn't cover it — otherwise net_amount (amount − tax) goes negative.
    const { data: taxPreview } = await supabaseAdmin.rpc('preview_payout_tax', { p_creator_id: profileId });
    const pendingTax = Number((taxPreview as { tds?: number } | null)?.tds ?? 0)
                     + Number((taxPreview as { tcs?: number } | null)?.tcs ?? 0);
    if (pendingTax >= amount) {
      return NextResponse.json(
        { error: `Your accrued TDS/TCS of ₹${pendingTax.toFixed(2)} is withheld on your next withdrawal. Request at least ₹${Math.floor(pendingTax) + 1}.`, code: 'tax_exceeds_amount' },
        { status: 409 }
      );
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

    if (payoutError || !payout) {
      // Release the reservation we just made so a failed insert never strands
      // pending_payout (guarded so we don't clobber a concurrent change).
      await supabaseAdmin
        .from('creator_balances')
        .update({ pending_payout: balanceData.pending_payout })
        .eq('creator_id', profileId)
        .eq('pending_payout', newPending);

      // 23505 = uq_creator_payouts_one_inflight_per_creator — a concurrent request
      // won the race for the single in-flight slot. Report it as the in-flight 409.
      if (payoutError?.code === '23505') {
        return NextResponse.json(
          { error: 'You already have a payout in progress. Wait for it to complete before requesting another.' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: 'Failed to record payout ledger.' }, { status: 500 });
    }

    // Phase 5: reserve the creator's unsettled pending tax against this payout and
    // record the withholding. net_amount is what the Cashfree transfer will send.
    const { data: taxData, error: taxErr } = await supabaseAdmin.rpc('begin_payout_tax', {
      p_payout_id: payout.id,
      p_creator_id: profileId,
    });
    if (taxErr) {
      // Could not compute withholding — abort cleanly (releases reservation + pending_payout).
      await supabaseAdmin.rpc('settle_payout', { p_payout_id: payout.id, p_terminal: 'failed', p_failure_reason: 'tax_reserve_failed' });
      return NextResponse.json({ error: 'Could not compute tax withholding. Please try again.' }, { status: 500 });
    }
    const tds = Number((taxData as { tds_withheld?: number } | null)?.tds_withheld ?? 0);
    const tcs = Number((taxData as { tcs_withheld?: number } | null)?.tcs_withheld ?? 0);
    const netAmount = Math.max(Math.round((amount - tds - tcs) * 100) / 100, 0); // floor backstop vs TOCTOU

    const { data: finalPayout, error: finalErr } = await supabaseAdmin
      .from('creator_payouts')
      .update({ tds_withheld: tds, tcs_withheld: tcs, net_amount: netAmount })
      .eq('id', payout.id)
      .select()
      .single();
    if (finalErr || !finalPayout) {
      // Persisting withholding failed — abort cleanly so approve never transfers an un-withheld amount.
      await supabaseAdmin.rpc('settle_payout', { p_payout_id: payout.id, p_terminal: 'failed', p_failure_reason: 'withholding_persist_failed' });
      return NextResponse.json({ error: 'Could not finalize payout. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, payout: finalPayout }, { status: 200 });
    
  } catch (error) {
    console.error('Payout Request Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
