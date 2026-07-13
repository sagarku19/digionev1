// Shared inbound processing, called by BOTH the real webhook and the simulate route.
// Resolves the account → active automations → keyword match → inserts an event → upserts
// the lead → follow-gates → enqueues instaauto_messages (frozen payload_snapshot).
// Then eagerly drains the account (fast path). Never throws to the caller.
import type { createServiceClient } from '@/lib/supabase/service';
import type { Database, Json } from '@/types/database.types';
import type { InboundEvent } from './types';
import { COMMENT_MAX_AGE_DAYS, FAST_PATH_BATCH } from './constants';
import { matchKeyword } from './keyword-match';
import { resolvePayload, type DmPayload } from './payload';
import { eventDedupKey } from './dedup';
import { drainAccount } from './drain';

type Db = ReturnType<typeof createServiceClient>;
type AccountRow = Database['public']['Tables']['instaauto_accounts']['Row'];
type AutomationRow = Database['public']['Tables']['instaauto_automations']['Row'];

const TRIGGER_FOR: Record<string, string> = {
  comment: 'comment', dm: 'dm_keyword', story_reply: 'story_reply', story_mention: 'story_mention',
};

function commentTooOld(iso?: string): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && Date.now() - t > COMMENT_MAX_AGE_DAYS * 86400_000;
}

export async function processInboundEvent(db: Db, account: AccountRow, ev: InboundEvent): Promise<void> {
  // Postbacks (follow-gate button) are handled separately.
  if (ev.eventType === 'postback') return processPostback(db, account, ev);
  if (ev.eventType === 'comment' && commentTooOld(ev.commentCreatedAt)) return;

  const { data: automations } = await db.from('instaauto_automations')
    .select('*, instaauto_keywords(word, is_negative), instaauto_media_targets(ig_media_id)')
    .eq('account_id', account.id).eq('status', 'active').is('deleted_at', null);
  if (!automations?.length) return;

  const wantTrigger = TRIGGER_FOR[ev.eventType];

  for (const autoRaw of automations) {
    const auto = autoRaw as AutomationRow & {
      instaauto_keywords: { word: string; is_negative: boolean }[];
      instaauto_media_targets: { ig_media_id: string }[];
    };
    if (!(auto.trigger_types ?? []).includes(wantTrigger)) continue;
    if (ev.eventType === 'comment' && auto.media_scope === 'specific') {
      if (!auto.instaauto_media_targets.some((m) => m.ig_media_id === ev.mediaId)) continue;
    }
    const match = matchKeyword(ev.text, auto.instaauto_keywords ?? [], auto.match_mode);
    if (!match.matched) continue;

    await fireAutomation(db, account, auto, ev, match.keyword ?? null);
    break; // first matching automation wins
  }
}

async function fireAutomation(
  db: Db, account: AccountRow, auto: AutomationRow, ev: InboundEvent, keyword: string | null,
): Promise<void> {
  const dedup = eventDedupKey({ accountId: account.id, eventType: ev.eventType, externalId: ev.commentId ?? undefined });
  const { data: event, error: evErr } = await db.from('instaauto_events').insert({
    creator_id: account.creator_id, account_id: account.id, automation_id: auto.id,
    event_type: ev.eventType, ig_user_id: ev.igUserId, ig_username: ev.igUsername ?? null,
    matched_keyword: keyword, dedup_key: dedup, payload: ev.raw as Json,
  }).select('id').single();
  if (evErr || !event) return; // dedup unique violation ⇒ already processed

  await db.from('instaauto_leads').upsert({
    creator_id: account.creator_id, account_id: account.id, ig_user_id: ev.igUserId,
    ig_username: ev.igUsername ?? null, first_source: ev.eventType, first_automation_id: auto.id,
    last_user_message_at: new Date().toISOString(),
  }, { onConflict: 'creator_id,ig_user_id', ignoreDuplicates: false });

  const resolved = resolvePayload(auto.dm_payload as DmPayload, { name: ev.igUsername });
  const isComment = ev.eventType === 'comment';

  // Public comment reply (optional).
  if (isComment && resolved.commentReply && ev.commentId) {
    await enqueue(db, account, auto, event.id, ev, 'comment_reply', resolved.commentReply, ev.commentId);
  }

  // Follow-gate.
  if (auto.require_follow) {
    const notFollower = resolved.notFollowerMessage || 'Follow first, then tap ✅ to get the link.';
    const buttons = [{ title: '✅ I followed', payload: `FOLLOW_OK:${auto.id}` }];
    await enqueue(db, account, auto, event.id, ev, isComment ? 'private_reply' : 'dm', notFollower, ev.commentId, { buttons });
    return; // link is delivered on the postback re-check
  }

  // Ungated: deliver the link now.
  await enqueue(db, account, auto, event.id, ev, isComment ? 'private_reply' : 'dm', resolved.messageText, ev.commentId, { link: resolved.link });
}

async function enqueue(
  db: Db, account: AccountRow, auto: AutomationRow, eventId: string, ev: InboundEvent,
  messageType: 'dm' | 'private_reply' | 'comment_reply', text: string, commentId?: string,
  extra?: { link?: string; buttons?: Array<{ title: string; payload: string }> },
): Promise<void> {
  await db.from('instaauto_messages').insert({
    creator_id: account.creator_id, automation_id: auto.id, account_id: account.id, event_id: eventId,
    recipient_ig_user_id: ev.igUserId, recipient_username: ev.igUsername ?? null,
    message_type: messageType, message_text: text,
    payload_snapshot: { text, link: extra?.link ?? null, buttons: extra?.buttons ?? null },
    ig_comment_id: messageType === 'dm' ? null : commentId ?? null,
  }); // UNIQUE(event_id, message_type) makes redelivery a no-op
}

async function processPostback(db: Db, account: AccountRow, ev: InboundEvent): Promise<void> {
  const [tag, automationId] = (ev.payloadRef ?? '').split(':');
  if (tag !== 'FOLLOW_OK' || !automationId) return;

  const { data: auto } = await db.from('instaauto_automations').select('*').eq('id', automationId).maybeSingle();
  if (!auto) return;

  // Live follow re-check.
  let isFollower = false;
  if (!account.is_simulated) {
    try {
      const { getUserProfile } = await import('./graph');
      const { decryptToken } = await import('./token-crypto');
      const prof = await getUserProfile(account.ig_user_id!, ev.igUserId, decryptToken(account.access_token_enc ?? ''));
      isFollower = prof.isFollower;
    } catch { isFollower = false; }
  } else {
    isFollower = true; // demo: postback implies "followed"
  }

  await db.from('instaauto_leads').update({
    is_follower: isFollower, follow_checked_at: new Date().toISOString(), last_user_message_at: new Date().toISOString(),
  }).eq('creator_id', account.creator_id).eq('ig_user_id', ev.igUserId);

  if (!isFollower) return; // still not following → no delivery

  const { data: event } = await db.from('instaauto_events').insert({
    creator_id: account.creator_id, account_id: account.id, automation_id: auto.id,
    event_type: 'postback', ig_user_id: ev.igUserId, ig_username: ev.igUsername ?? null,
    dedup_key: eventDedupKey({ accountId: account.id, eventType: 'postback', externalId: ev.payloadRef }),
    payload: ev.raw as Json,
  }).select('id').single();
  if (!event) return;

  const resolved = resolvePayload((auto as AutomationRow).dm_payload as DmPayload, { name: ev.igUsername });
  await enqueue(db, account, auto as AutomationRow, event.id, ev, 'dm', resolved.messageText, undefined, { link: resolved.link });
}

export async function drainFastPath(db: Db, account: AccountRow): Promise<void> {
  try { await drainAccount(db, account, FAST_PATH_BATCH); } catch { /* cron will retry */ }
}
