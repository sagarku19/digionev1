// Send one queued message. Provider switch: simulated accounts never hit Meta; real
// accounts decrypt the token and call graph.ts. Enforces the 24h DM window before sending.
// Returns { igMessageId } or throws SendError (caller runs backoff.classifyHttpError).
import type { Database } from '@/types/database.types';
import { DM_WINDOW_HOURS } from './constants';
import { SendError, type SendResult } from './types';
import { decryptToken } from './token-crypto';
import * as graph from './graph';

type MessageRow = Database['public']['Tables']['instaauto_messages']['Row'];
type AccountRow = Database['public']['Tables']['instaauto_accounts']['Row'];
type LeadRow = Database['public']['Tables']['instaauto_leads']['Row'];

export function isSimulatedSend(account: Pick<AccountRow, 'is_simulated'>): boolean {
  return account.is_simulated === true;
}

export function checkSendWindow(
  messageType: string,
  lead: Pick<LeadRow, 'last_user_message_at'> | null,
): { ok: boolean; reason?: string } {
  if (messageType !== 'dm') return { ok: true }; // replies use the comment window (upstream)
  const last = lead?.last_user_message_at ? new Date(lead.last_user_message_at).getTime() : 0;
  if (Date.now() - last > DM_WINDOW_HOURS * 3600_000) return { ok: false, reason: 'window_closed' };
  return { ok: true };
}

export async function sendOneMessage(
  account: AccountRow, message: MessageRow, lead: LeadRow | null,
): Promise<SendResult> {
  const win = checkSendWindow(message.message_type, lead);
  if (!win.ok) throw new SendError({ message: win.reason!, httpStatus: 400, code: win.reason!, retryable: false });

  if (isSimulatedSend(account)) {
    return { igMessageId: `sim_${message.id}` };
  }

  const token = decryptToken(account.access_token_enc ?? '');
  const snap = (message.payload_snapshot ?? {}) as { link?: string; buttons?: Array<{ title: string; payload: string }> };
  const text = message.message_text ?? '';
  try {
    if (message.message_type === 'private_reply' && message.ig_comment_id) {
      return { igMessageId: await graph.sendPrivateReply(account.ig_user_id!, message.ig_comment_id, text, token) };
    }
    if (message.message_type === 'comment_reply' && message.ig_comment_id) {
      await graph.replyToComment(message.ig_comment_id, text, token);
      return { igMessageId: null };
    }
    return { igMessageId: await graph.sendDirectMessage(account.ig_user_id!, message.recipient_ig_user_id!, text, snap.buttons, token) };
  } catch (e) {
    if (e instanceof SendError && message.message_type === 'private_reply' && /already/i.test(e.message)) {
      // One-reply-per-comment already satisfied → treat as delivered (idempotent).
      return { igMessageId: null };
    }
    throw e;
  }
}
