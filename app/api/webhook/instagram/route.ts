// GET  /api/webhook/instagram — hub.challenge subscription verification.
// POST /api/webhook/instagram — HMAC verify → 200 fast → process via after().
import { NextResponse, after } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyMetaSignature } from '@/lib/server/instaauto/webhook-verify';
import { parseWebhookEnvelope } from '@/lib/server/instaauto/event-parse';
import { processInboundEvent, drainFastPath } from '@/lib/server/instaauto/pipeline';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  if (mode === 'subscribe' && token && token === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? '', { status: 200 });
  }
  return new NextResponse('forbidden', { status: 403 });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const ok = verifyMetaSignature(rawBody, req.headers.get('x-hub-signature-256'), process.env.INSTAGRAM_APP_SECRET ?? '');
  if (!ok) return NextResponse.json({ error: 'invalid signature' }, { status: 401 });

  let envelope: unknown = null;
  try { envelope = JSON.parse(rawBody); } catch { return NextResponse.json({ received: true }); }

  after(async () => {
    try {
      const db = createServiceClient();
      const events = parseWebhookEnvelope(envelope);
      const byAccount = new Map<string, string>(); // igAccountId → account.id
      for (const ev of events) {
        const accountId = byAccount.get(ev.accountIgId);
        let account;
        if (!accountId) {
          const { data } = await db.from('instaauto_accounts').select('*')
            .eq('ig_user_id', ev.accountIgId).eq('status', 'active').maybeSingle();
          if (!data) continue;
          account = data; byAccount.set(ev.accountIgId, data.id);
        } else {
          const { data } = await db.from('instaauto_accounts').select('*').eq('id', accountId).maybeSingle();
          account = data;
        }
        if (!account) continue;
        await processInboundEvent(db, account, ev);
        await drainFastPath(db, account);
      }
    } catch (e) {
      console.error('[webhook/instagram] processing failed', e);
    }
  });

  return NextResponse.json({ received: true });
}
