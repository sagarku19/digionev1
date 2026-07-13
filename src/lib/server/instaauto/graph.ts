// Meta Instagram Graph API — thin fetch wrappers. Server-only. All calls throw SendError
// on non-2xx with the parsed Meta error code so backoff.classifyHttpError can decide retry.
// Docs: https://developers.facebook.com/docs/instagram-platform (confirm version/paths).
import { IG_API_VERSION } from './constants';
import { SendError } from './types';

const GRAPH = `https://graph.instagram.com/${IG_API_VERSION}`;

async function call(url: string, init: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetch(url, init);
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const err = (json.error ?? {}) as { message?: string; code?: number };
    throw new SendError({
      message: err.message ?? `Graph ${res.status}`,
      httpStatus: res.status, code: String(err.code ?? res.status),
      retryable: false, // caller re-classifies via backoff.classifyHttpError(res.status, err.code)
    });
  }
  return json;
}

export async function exchangeCodeForShortToken(code: string, redirectUri: string): Promise<{ token: string; userId: string }> {
  const body = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!, client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: 'authorization_code', redirect_uri: redirectUri, code,
  });
  const json = await call('https://api.instagram.com/oauth/access_token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body,
  });
  return { token: String(json.access_token), userId: String(json.user_id) };
}

export async function exchangeForLongLivedToken(shortToken: string): Promise<{ token: string; expiresIn: number }> {
  const u = new URL(`${GRAPH}/access_token`);
  u.searchParams.set('grant_type', 'ig_exchange_token');
  u.searchParams.set('client_secret', process.env.INSTAGRAM_APP_SECRET!);
  u.searchParams.set('access_token', shortToken);
  const json = await call(u.toString(), { method: 'GET' });
  return { token: String(json.access_token), expiresIn: Number(json.expires_in ?? 5184000) };
}

export async function refreshLongLivedToken(token: string): Promise<{ token: string; expiresIn: number }> {
  const u = new URL(`${GRAPH}/refresh_access_token`);
  u.searchParams.set('grant_type', 'ig_refresh_token');
  u.searchParams.set('access_token', token);
  const json = await call(u.toString(), { method: 'GET' });
  return { token: String(json.access_token), expiresIn: Number(json.expires_in ?? 5184000) };
}

export async function getUserProfile(igUserId: string, igsid: string, token: string): Promise<{ username?: string; name?: string; isFollower: boolean }> {
  const u = new URL(`${GRAPH}/${igsid}`);
  u.searchParams.set('fields', 'name,username,is_user_follow_business');
  u.searchParams.set('access_token', token);
  const json = await call(u.toString(), { method: 'GET' });
  return { username: json.username as string | undefined, name: json.name as string | undefined, isFollower: json.is_user_follow_business === true };
}

export async function sendPrivateReply(igUserId: string, commentId: string, text: string, token: string): Promise<string | null> {
  const json = await call(`${GRAPH}/${igUserId}/messages`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ recipient: { comment_id: commentId }, message: { text } }),
  });
  return (json.message_id as string) ?? null;
}

export async function sendDirectMessage(igUserId: string, recipientId: string, text: string, buttons: Array<{ title: string; payload: string }> | undefined, token: string): Promise<string | null> {
  const message = buttons?.length
    ? { attachment: { type: 'template', payload: { template_type: 'button', text, buttons: buttons.map(b => ({ type: 'postback', title: b.title, payload: b.payload })) } } }
    : { text };
  const json = await call(`${GRAPH}/${igUserId}/messages`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ recipient: { id: recipientId }, message }),
  });
  return (json.message_id as string) ?? null;
}

export async function replyToComment(commentId: string, text: string, token: string): Promise<void> {
  await call(`${GRAPH}/${commentId}/replies`, {
    method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ message: text }),
  });
}

export async function subscribeWebhooks(igUserId: string, token: string): Promise<void> {
  const u = new URL(`${GRAPH}/${igUserId}/subscribed_apps`);
  u.searchParams.set('subscribed_fields', 'comments,messages,message_postbacks');
  u.searchParams.set('access_token', token);
  await call(u.toString(), { method: 'POST' });
}
