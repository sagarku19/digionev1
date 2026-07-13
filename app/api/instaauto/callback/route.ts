// GET /api/instaauto/callback — exchange code → long-lived token → encrypt → upsert
// instaauto_accounts → subscribe webhooks. Verifies the signed state.
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/supabase/service';
import { exchangeCodeForShortToken, exchangeForLongLivedToken, getUserProfile, subscribeWebhooks } from '@/lib/server/instaauto/graph';
import { encryptToken } from '@/lib/server/instaauto/token-crypto';
import { REQUIRED_SCOPES } from '@/lib/server/instaauto/constants';

function verifyState(state: string | null): string | null {
  if (!state) return null;
  const [creatorId, mac] = state.split('.');
  if (!creatorId || !mac) return null;
  const expect = crypto.createHmac('sha256', process.env.INSTAGRAM_APP_SECRET!).update(creatorId).digest('hex').slice(0, 16);
  return mac === expect ? creatorId : null;
}

export async function GET(req: Request) {
  const base = process.env.NEXT_PUBLIC_APP_URL!;
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const creatorId = verifyState(url.searchParams.get('state'));
  if (!code || !creatorId) return NextResponse.redirect(`${base}/dashboard/autodm?connect=error`);

  try {
    const redirectUri = `${base}/api/instaauto/callback`;
    const short = await exchangeCodeForShortToken(code, redirectUri);
    const long = await exchangeForLongLivedToken(short.token);
    const profile = await getUserProfile(short.userId, short.userId, long.token).catch(() => ({ username: undefined, isFollower: false }));

    const db = createServiceClient();
    await db.from('instaauto_accounts').upsert({
      creator_id: creatorId, ig_user_id: short.userId, username: profile.username ?? null,
      access_token_enc: encryptToken(long.token),
      token_expires_at: new Date(Date.now() + long.expiresIn * 1000).toISOString(),
      scopes: REQUIRED_SCOPES, status: 'active', is_simulated: false,
      connected_at: new Date().toISOString(), last_refreshed_at: new Date().toISOString(),
    }, { onConflict: 'ig_user_id' });

    await subscribeWebhooks(short.userId, long.token).catch((e) => console.error('[instaauto/callback] subscribe failed', e));
    return NextResponse.redirect(`${base}/dashboard/autodm?connect=success`);
  } catch (e) {
    console.error('[instaauto/callback]', e);
    return NextResponse.redirect(`${base}/dashboard/autodm?connect=error`);
  }
}
