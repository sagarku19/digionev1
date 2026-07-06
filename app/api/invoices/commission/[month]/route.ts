export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { getDigioneIdentity } from '@/lib/server/invoices/digione-identity';
import { buildCommissionInvoiceModel, fyOf } from '@/lib/server/invoices/build';
import { issueAndCacheInvoice } from '@/lib/server/invoices/issue';

function monthBounds(month: string): { start: string; endExclusive: string; label: string; lastDay: string } | null {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const endExclusive = new Date(Date.UTC(y, m, 1));
  const lastDay = new Date(Date.UTC(y, m, 0));
  const label = start.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(start), endExclusive: iso(endExclusive), label, lastDay: iso(lastDay) };
}

export async function GET(_req: Request, { params }: { params: Promise<{ month: string }> }) {
  try {
    const { month } = await params;
    const bounds = monthBounds(month);
    if (!bounds) return NextResponse.json({ error: 'Invalid month (expected YYYY-MM).' }, { status: 400 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profileId = await resolveProfileId(user.id, user.email);
    if (!profileId) return NextResponse.json({ error: 'Creator profile not found.' }, { status: 404 });

    const db = createServiceClient();
    const { data: rows } = await db
      .from('tax_transactions')
      .select('commission_net, gst_on_commission, status')
      .eq('creator_id', profileId)
      .gte('created_at', bounds.start)
      .lt('created_at', bounds.endExclusive);

    // Posted sales only — the commission Tax Invoice reflects commission on sales made this
    // month. Refund reductions belong on GST credit notes (deferred, Phase 6 follow-up).
    let net = 0, gst = 0, count = 0;
    for (const r of rows ?? []) {
      if (r.status === 'reversed') continue;
      net += Number(r.commission_net);
      gst += Number(r.gst_on_commission);
      count++;
    }
    net = Math.round(net * 100) / 100;
    gst = Math.round(gst * 100) / 100;
    if (net <= 0) return NextResponse.json({ error: 'No commission for this period.' }, { status: 404 });

    const { data: kyc } = await db
      .from('creator_kyc')
      .select('legal_name, gstin, address_line1, city, state')
      .eq('creator_id', profileId)
      .maybeSingle();
    const address = [kyc?.address_line1, kyc?.city].filter(Boolean).join(', ') || null;

    const model = buildCommissionInvoiceModel({
      invoiceNumber: '',
      invoiceDate: bounds.lastDay,
      periodLabel: bounds.label,
      salesCount: count,
      digione: getDigioneIdentity(),
      creator: { legalName: kyc?.legal_name ?? 'Creator', gstin: kyc?.gstin ?? null, address, state: kyc?.state ?? null },
      commissionNet: net,
      gstOnCommission: gst,
    });

    const { invoice, signedUrl, ttlSeconds } = await issueAndCacheInvoice(db, {
      type: 'commission', issuer: 'digione', creatorId: profileId, orderId: null, periodMonth: month,
      fy: fyOf(bounds.lastDay), isTaxInvoice: true, subtotal: net, taxAmount: gst, total: model.total,
      seriesKey: 'digione', prefix: 'DIGI', invoiceDate: bounds.lastDay, model,
    });

    return NextResponse.json({ signedUrl, ttlSeconds, invoiceNumber: invoice.invoice_number }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[invoices/commission]', e);
    return NextResponse.json({ error: 'Could not generate invoice.' }, { status: 500 });
  }
}
