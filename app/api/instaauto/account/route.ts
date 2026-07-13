// GET /api/instaauto/account — token-free connection status for the dashboard hook.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { resolveProfileId } from '@/lib/server/resolve-profile';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const creatorId = await resolveProfileId(user.id, user.email);
  if (!creatorId) return NextResponse.json({ error: 'No creator profile' }, { status: 404 });

  const db = createServiceClient();
  const { data } = await db.from('instaauto_accounts')
    .select('id, username, status, is_simulated, avatar_url, connected_at, token_expires_at')
    .eq('creator_id', creatorId).order('connected_at', { ascending: false }).maybeSingle();

  return NextResponse.json({
    account: data ?? null,
    connectConfigured: !!process.env.INSTAGRAM_APP_ID,
  });
}
