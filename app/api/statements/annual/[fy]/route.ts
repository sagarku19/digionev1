export const runtime = 'nodejs'; // @react-pdf needs Node, not edge

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { storage, resolveBucket } from '@/lib/storage';
import { insertFile, findLiveByKey } from '@/lib/storage/files';
import { buildAnnualStatementModel, fyBounds } from '@/lib/server/invoices/statement';
import { renderStatementPdf } from '@/lib/server/invoices/statement-render';

export async function GET(_req: Request, { params }: { params: Promise<{ fy: string }> }) {
  try {
    const { fy } = await params;
    if (!/^\d{4}-\d{2}$/.test(fy)) {
      return NextResponse.json({ error: 'Invalid financial year (expected YYYY-YY).' }, { status: 400 });
    }
    let bounds;
    try { bounds = fyBounds(fy); } catch { return NextResponse.json({ error: 'Invalid financial year.' }, { status: 400 }); }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profileId = await resolveProfileId(user.id, user.email);
    if (!profileId) return NextResponse.json({ error: 'Creator profile not found.' }, { status: 404 });

    const db = createServiceClient();

    // Earnings: tax_transactions in the FY (by sale date), net of refunds.
    const { data: taxRows } = await db
      .from('tax_transactions')
      .select('gross_amount, commission_gross, gst_on_commission, status')
      .eq('creator_id', profileId)
      .gte('created_at', bounds.fyStart)
      .lt('created_at', bounds.fyEnd);

    let gross = 0, commission = 0, gst = 0, hasData = false;
    for (const r of taxRows ?? []) {
      const sign = r.status === 'reversed' ? -1 : 1;
      gross += sign * Number(r.gross_amount);
      commission += sign * Number(r.commission_gross);
      gst += sign * Number(r.gst_on_commission);
      hasData = true;
    }

    // TDS/TCS: creator_payouts settled (success) in the FY (by payout date).
    const { data: payoutRows } = await db
      .from('creator_payouts')
      .select('tds_withheld, tcs_withheld, status, processed_at, created_at')
      .eq('creator_id', profileId)
      .eq('status', 'success');
    let tds = 0, tcs = 0;
    for (const p of payoutRows ?? []) {
      const when = String(p.processed_at ?? p.created_at).slice(0, 10);
      if (when >= bounds.fyStart && when < bounds.fyEnd) {
        tds += Number(p.tds_withheld ?? 0);
        tcs += Number(p.tcs_withheld ?? 0);
        hasData = true;
      }
    }

    if (!hasData) return NextResponse.json({ error: 'No activity for this financial year.' }, { status: 404 });

    const { data: kyc } = await db
      .from('creator_kyc')
      .select('legal_name, gstin')
      .eq('creator_id', profileId)
      .maybeSingle();

    const model = buildAnnualStatementModel({
      fyLabel: fy,
      creator: { legalName: kyc?.legal_name ?? 'Creator', gstin: kyc?.gstin ?? null },
      grossSales: gross, commission, gstOnCommission: gst, tdsWithheld: tds, tcsWithheld: tcs,
    });
    const pdf = await renderStatementPdf(model);

    // Always-fresh: overwrite the deterministic key each request (FY keeps accruing).
    const cfg = resolveBucket('creator-content');
    const objectKey = `${profileId}/statements/annual-${fy}.pdf`;
    await storage.putObject({ bucket: cfg.name, objectKey, body: pdf, contentType: 'application/pdf' });
    const existing = await findLiveByKey(db, cfg.name, objectKey);
    if (!existing) {
      await insertFile(db, {
        owner_id: profileId, bucket: cfg.name, object_key: objectKey, file_name: `annual-statement-${fy}.pdf`,
        mime_type: 'application/pdf', size: pdf.length, visibility: 'private', kind: 'tax_doc', product_id: null,
      });
    }
    const signedUrl = await storage.createDownloadUrl({ bucket: cfg.name, objectKey, ttlSeconds: 600 });
    return NextResponse.json({ signedUrl, ttlSeconds: 600 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[statements/annual]', e);
    return NextResponse.json({ error: 'Could not generate statement.' }, { status: 500 });
  }
}
