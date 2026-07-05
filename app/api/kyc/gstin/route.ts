import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { rateLimitKey } from '@/lib/server/rate-limit';
import { isValidGstin } from '@/lib/shared/gstin';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: { gstin?: string };
    try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

    const gstin = typeof body.gstin === 'string' ? body.gstin.trim().toUpperCase() : '';
    if (!isValidGstin(gstin)) {
      return NextResponse.json({ error: 'Enter a valid 15-character GSTIN.' }, { status: 400 });
    }

    const profileId = await resolveProfileId(user.id, user.email);
    if (!profileId) return NextResponse.json({ error: 'Creator profile not found.' }, { status: 404 });

    const allowed = await rateLimitKey(`gstin:${profileId}`, { max: 5, windowSeconds: 60 });
    if (!allowed) return NextResponse.json({ error: 'Too many attempts. Try again in a minute.' }, { status: 429 });

    const db = createServiceClient();
    const { error } = await db
      .from('creator_kyc')
      .update({ gstin, gstin_verified: false, gstin_added_at: new Date().toISOString() })
      .eq('creator_id', profileId);
    if (error) return NextResponse.json({ error: 'Could not save GSTIN.' }, { status: 500 });

    return NextResponse.json({ ok: true, registered: true });
  } catch (e) {
    console.error('[kyc/gstin]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
