// GET /api/instaauto/connect — redirect to Meta OAuth. Disabled when the app isn't
// configured (demo mode still works). State = signed creatorId to bind the callback.
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { resolveProfileId } from '@/lib/server/resolve-profile';
import { REQUIRED_SCOPES } from '@/lib/server/instaauto/constants';

export async function GET() {
  if (!process.env.INSTAGRAM_APP_ID || !process.env.INSTAGRAM_APP_SECRET) {
    return NextResponse.json({ error: 'not_configured' }, { status: 501 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const creatorId = await resolveProfileId(user.id, user.email);
  if (!creatorId) return NextResponse.json({ error: 'No creator profile' }, { status: 404 });

  const state = signState(creatorId);
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/instaauto/callback`;
  const url = new URL('https://www.instagram.com/oauth/authorize');
  url.searchParams.set('client_id', process.env.INSTAGRAM_APP_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', REQUIRED_SCOPES.join(','));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  return NextResponse.redirect(url.toString());
}

function signState(creatorId: string): string {
  const mac = crypto.createHmac('sha256', process.env.INSTAGRAM_APP_SECRET!).update(creatorId).digest('hex').slice(0, 16);
  return `${creatorId}.${mac}`;
}
