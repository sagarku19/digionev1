// POST /api/instaauto/account/demo — one-click simulated account (no OAuth). Enables the
// full pipeline demo without Meta. One demo account per creator (idempotent).
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const creatorId = await resolveProfileId(user.id, user.email);
  if (!creatorId) return NextResponse.json({ error: 'No creator profile' }, { status: 404 });

  const db = createServiceClient();
  const { data: existing } = await db.from('instaauto_accounts')
    .select('id').eq('creator_id', creatorId).eq('is_simulated', true).maybeSingle();
  if (existing) return NextResponse.json({ accountId: existing.id, demo: true });

  const { data, error } = await db.from('instaauto_accounts').insert({
    creator_id: creatorId, is_simulated: true, status: 'active',
    username: 'demo_creator', avatar_url: null,
  }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accountId: data.id, demo: true }, { status: 201 });
}
