// Normalize the Meta Instagram webhook envelope into InboundEvent[]. Defensive:
// unknown shapes yield []. Each entry.id is the receiving IG account (ig_user_id).
// Docs: https://developers.facebook.com/docs/instagram-platform/webhooks (confirm fields).
import type { InboundEvent, InboundEventType } from './types';

function str(v: unknown): string { return typeof v === 'string' ? v : ''; }

export function parseWebhookEnvelope(env: unknown): (InboundEvent & { accountIgId: string })[] {
  const out: (InboundEvent & { accountIgId: string })[] = [];
  const e = env as { object?: string; entry?: unknown[] } | null;
  if (!e || e.object !== 'instagram' || !Array.isArray(e.entry)) return out;

  for (const entryRaw of e.entry) {
    const entry = entryRaw as { id?: string; changes?: unknown[]; messaging?: unknown[] };
    const accountIgId = str(entry.id);

    // Comment / live-comment changes.
    for (const chRaw of entry.changes ?? []) {
      const ch = chRaw as { field?: string; value?: Record<string, unknown> };
      if (ch.field === 'comments' && ch.value) {
        const v = ch.value;
        const from = v.from as { id?: string; username?: string } | undefined;
        const media = v.media as { id?: string } | undefined;
        out.push({
          accountIgId, eventType: 'comment', igUserId: str(from?.id), igUsername: from?.username,
          text: str(v.text), commentId: str(v.id) || undefined, mediaId: media?.id,
          commentCreatedAt: v.timestamp ? String(v.timestamp) : undefined, raw: ch,
        });
      }
    }

    // Messaging: DM / story reply / story mention / postback.
    for (const mRaw of entry.messaging ?? []) {
      const m = mRaw as {
        sender?: { id?: string }; message?: Record<string, unknown>; postback?: Record<string, unknown>;
      };
      const senderId = str(m.sender?.id);
      if (m.postback) {
        out.push({ accountIgId, eventType: 'postback', igUserId: senderId, text: '',
          payloadRef: str(m.postback.payload) || undefined, raw: m });
      } else if (m.message) {
        const replyTo = m.message.reply_to as { story?: unknown } | undefined;
        const attachments = m.message.attachments as Array<{ type?: string }> | undefined;
        let type: InboundEventType = 'dm';
        if (replyTo?.story) type = 'story_reply';
        else if (attachments?.some(a => a.type === 'story_mention')) type = 'story_mention';
        out.push({ accountIgId, eventType: type, igUserId: senderId, text: str(m.message.text), raw: m });
      }
    }
  }
  return out;
}
