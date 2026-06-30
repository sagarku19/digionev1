import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { buildEncryptedKycRow } from '@/lib/server/kyc-row';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const profileId = await resolveProfileId(user.id, user.email);
    if (!profileId) return NextResponse.json({ error: 'Creator profile not found.' }, { status: 404 });

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });
    }

    const row = buildEncryptedKycRow(body);
    if (!row.legal_name || !row.pan_enc || !row.bank_account_enc || !row.ifsc_code) {
      return NextResponse.json({ error: 'legal_name, pan, bank_account and ifsc_code are required.' }, { status: 400 });
    }

    const db = createServiceClient();
    const { error } = await db
      .from('creator_kyc')
      .upsert({ creator_id: profileId, ...row }, { onConflict: 'creator_id' });
    if (error) {
      console.error('[kyc/submit] upsert failed', error.message);
      return NextResponse.json({ error: 'Failed to save KYC details.' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[kyc/submit] error', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
