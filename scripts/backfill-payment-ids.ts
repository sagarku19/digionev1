
// One-off backfill: fill orders.gateway_payment_id from Cashfree for completed/
// refunded orders fulfilled before the 2026-07-08 status-page payment-id fix
// (webhook orders already have it). Reads the SUCCESS payment's cf_payment_id
// from Cashfree and writes it. Idempotent — only touches rows where the column
// is still NULL. Dry-run by default; pass --apply to write.
//   npx tsx --env-file=.env.local scripts/backfill-payment-ids.ts
//   npx tsx --env-file=.env.local scripts/backfill-payment-ids.ts --apply
import { createServiceClient } from '../lib/supabase/service';

const CASHFREE_ENV = process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

async function getPaymentId(gatewayOrderId: string): Promise<{ id?: string; note: string }> {
  try {
    const res = await fetch(`${CASHFREE_ENV}/orders/${gatewayOrderId}/payments`, {
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_CLIENT_ID!,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET!,
      },
      cache: 'no-store',
    });
    if (!res.ok) return { note: `HTTP ${res.status}` };
    const payments: unknown = await res.json();
    if (!Array.isArray(payments)) return { note: 'no payments array' };
    // Cashfree response is untyped at the fetch boundary; narrow the two fields used.
    const success = (payments as Array<{ payment_status?: string; cf_payment_id?: string | number }>)
      .find((p) => p?.payment_status === 'SUCCESS');
    if (success?.cf_payment_id == null) return { note: `no SUCCESS payment (${payments.length} attempt(s))` };
    return { id: String(success.cf_payment_id), note: 'ok' };
  } catch (e) {
    return { note: e instanceof Error ? e.message : 'fetch error' };
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  const db = createServiceClient();

  const { data: orders, error } = await db.from('orders')
    .select('id, gateway_order_id, status, total_amount, created_at')
    .is('gateway_payment_id', null)
    .not('gateway_order_id', 'is', null)
    .in('status', ['completed', 'refunded'])
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);

  const rows = (orders ?? []).filter((o) => o.gateway_order_id?.startsWith('ord_'));
  console.log(CASHFREE_ENV);
  console.log(`mode: ${apply ? 'APPLY' : 'DRY-RUN'} — ${rows.length} completed/refunded order(s) missing gateway_payment_id\n`);

  let updated = 0, resolved = 0, unresolved = 0;
  for (const o of rows) {
    const { id, note } = await getPaymentId(o.gateway_order_id!);
    if (!id) {
      unresolved++;
      console.log(`  x ${o.id}  ${o.gateway_order_id}  Rs${o.total_amount}  -> ${note}`);
      continue;
    }
    resolved++;
    if (apply) {
      const { error: upErr } = await db.from('orders')
        .update({ gateway_payment_id: id })
        .eq('id', o.id)
        .is('gateway_payment_id', null);
      if (upErr) { console.log(`  ! ${o.id}  update failed: ${upErr.message}`); continue; }
      updated++;
      console.log(`  ok ${o.id}  ${o.gateway_order_id}  -> ${id} (written)`);
    } else {
      console.log(`  - ${o.id}  ${o.gateway_order_id}  Rs${o.total_amount}  -> ${id} (would write)`);
    }
  }

  console.log(`\nresolved ${resolved}, unresolved ${unresolved}${apply ? `, written ${updated}` : ''}`);
  if (!apply && resolved > 0) console.log('re-run with --apply to write.');
}

main().catch((e) => { console.error(e); process.exit(1); });
