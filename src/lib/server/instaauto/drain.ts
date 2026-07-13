// Shared drainer for both the after() fast-path and the cron. Claims queued messages
// (FOR UPDATE SKIP LOCKED via RPC), sends them paced, and settles through the atomic
// finalize/fail RPCs. Returns counts for observability.
import type { createServiceClient } from '@/lib/supabase/service';
import type { Database } from '@/types/database.types';
import { MAX_ATTEMPTS, SEND_SPACING_MS } from './constants';
import { SendError } from './types';
import { computeBackoffSeconds, classifyHttpError } from './backoff';
import { sendOneMessage } from './send';

type Db = ReturnType<typeof createServiceClient>;
type AccountRow = Database['public']['Tables']['instaauto_accounts']['Row'];
type MessageRow = Database['public']['Tables']['instaauto_messages']['Row'];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function drainAccount(db: Db, account: AccountRow, limit: number): Promise<{ sent: number; failed: number }> {
  const { data: claimed, error } = await db.rpc('instaauto_claim_messages', { p_account_id: account.id, p_limit: limit });
  if (error || !claimed?.length) return { sent: 0, failed: 0 };

  let sent = 0, failed = 0;
  for (let i = 0; i < claimed.length; i++) {
    const msg = claimed[i] as MessageRow;
    const { data: lead } = await db.from('instaauto_leads')
      .select('*').eq('creator_id', msg.creator_id).eq('ig_user_id', msg.recipient_ig_user_id ?? '').maybeSingle();
    try {
      const provider = account.is_simulated ? 'simulated' : 'real';
      const result = await sendOneMessage(account, msg, lead ?? null);
      // The generated TS types emit non-nullable for p_ig_message_id, p_is_follower, and
      // p_follow_checked_at, but the SQL RPC accepts NULL for all three (COALESCE guards).
      // Cast through unknown to pass the nullable runtime values the RPC was designed for.
      await db.rpc('instaauto_finalize_send', {
        p_message_id: msg.id, p_ig_message_id: result.igMessageId, p_provider: provider,
        p_is_follower: lead?.is_follower, p_follow_checked_at: lead?.follow_checked_at,
      } as unknown as Parameters<typeof db.rpc<'instaauto_finalize_send'>>[1]);
      sent++;
    } catch (e) {
      const se = e instanceof SendError ? e : new SendError({ message: String(e), httpStatus: 500, code: 'unknown', retryable: true });
      const cls = classifyHttpError(se.httpStatus, Number(se.code) || undefined);
      const terminal = !cls.retryable || msg.attempts >= MAX_ATTEMPTS;
      await db.rpc('instaauto_fail_send', {
        p_message_id: msg.id, p_outcome: terminal ? 'terminal_error' : 'retryable_error',
        p_error_code: se.code, p_error_message: se.message, p_http_status: se.httpStatus,
        p_terminal: terminal, p_backoff_seconds: computeBackoffSeconds(msg.attempts),
        p_revoke_account: cls.isOAuthInvalid,
      });
      failed++;
    }
    if (i < claimed.length - 1) await sleep(SEND_SPACING_MS);
  }
  return { sent, failed };
}
