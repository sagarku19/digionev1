---
noteId: "553d37e0747f11f193a7f790bf9449ed"
tags: []

---

# Phase 1 — Cashfree Payouts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a creator request a withdrawal that a super_admin approves, which sends money via Cashfree Payouts V2 and settles through Phase 0's `settle_payout()` — all idempotent, signature-verified, and scheduler-free.

**Architecture:** Reuse Phase 0's `settle_payout()` as the only terminal mutation. A thin server-only `cashfree-payouts.ts` client does beneficiary/transfer/get/verify. Admin approve → ensure beneficiary (decrypt KYC bank) → atomic claim `pending→processing` → transfer; a signature-verified webhook (and a lazy/manual sync route) call `settle_payout`. Destination is derived from the verified KYC bank; the platform absorbs the transfer fee.

**Tech Stack:** Next.js 16 route handlers, Supabase (service-role + RLS), Node `crypto` (HMAC-SHA256), Cashfree Payouts V2 REST, Vitest. Supabase MCP for migration + type regen (Windows CLI broken).

**Spec:** `docs/superpowers/specs/2026-06-30-phase1-cashfree-payouts-design.md`
**Conventions:** commit to `main` (no feature branch). Project id `qcendfisvyjnwmefruba`. Service-role writes via `createServiceClient()`. Admin gate via `is_super_admin()` re-read server-side. `_enc` KYC columns are `text` (Phase 0); decrypt with `decryptField`.

---

## Grounded facts (verified live 2026-06-30)

- `settle_payout(p_payout_id uuid, p_terminal 'success'|'failed', p_gateway_payout_id text, p_gateway_metadata jsonb, p_failure_reason text)` exists, `security definer`, revoked from anon/authenticated. Success → ledger `payout` debit (bytea hex hash) + `total_paid_out += amount` + release `pending_payout`; failed → release hold only. Idempotent via status claim.
- `creator_payouts`: cols `id, creator_id, payout_request_id, payout_method_id, amount, currency, status, gateway_name('cashfree'), gateway_payout_id, gateway_batch_id, gateway_metadata, initiated_at, processed_at, failure_reason, created_at, updated_at`. Status CHECK `pending/processing/success/failed`. **Default still `'initiated'` (bug — fix in Task 2).** RLS: select-own + admin-select (writes service-role only).
- `creator_payout_methods`: `id, creator_id, type(enum payout_type), is_default, upi_id, account_holder_name, account_number, ifsc_code, bank_name, branch_name, status('pending'), metadata jsonb, version(int=1), created_at, updated_at`. RLS `*_all_own` (ALL). 0 rows.
- `creator_kyc`: has `beneficiary_id`, `beneficiary_metadata`(jsonb default '{}'), `pan_enc/bank_account_enc/upi_id_enc` (now **text**, `enc:v1:` envelopes), `bank_last4`, `ifsc_code`, `bank_account_name`, `legal_name`, `status`.
- `is_super_admin()` RLS helper exists. `createServiceClient()` from `@/lib/supabase/service`. `createClient()` (cookie) from `@/lib/supabase/server`. `resolveProfileId(userId, email)` from `@/lib/server/resolve-profile`.
- `payout_type` enum values: confirm in Task 1 (likely `bank`/`upi` or `bank_account`/`upi`) via `select enum_range(null::payout_type)`.

---

## File structure

| File | Responsibility | Status |
|---|---|---|
| `supabase/migrations/20260701000000_phase1_payouts.sql` | status default fix + `account_last4` column | create |
| `src/lib/server/payout-policy.ts` (+`.test.ts`) | `MIN_PAYOUT_INR`, `kycToBeneficiaryPayload()`, `kycToPayoutMethodRow()` | create |
| `src/lib/server/cashfree-payouts.ts` (+`.test.ts`) | Payouts client + `verifyPayoutWebhookSignature()` | create |
| `app/api/payouts/request/route.ts` | + min-payout guard + ensure/set `payout_method_id` | modify |
| `app/api/admin/payouts/[id]/approve/route.ts` | beneficiary → claim → transfer | create |
| `app/api/admin/payouts/[id]/reject/route.ts` | pending-only → `settle_payout('failed')` | create |
| `app/api/admin/payouts/sync/route.ts` | poll stuck `processing` (dual-auth: super_admin OR `CRON_SECRET`) | create |
| `app/api/webhook/cashfree-payout/route.ts` | verify signature → `settle_payout` | create |
| `src/hooks/commerce/useEarnings.ts` | add `requestPayout` mutation (POST request route) | modify |
| `src/hooks/admin/usePayoutQueue.ts` | admin queue read + approve/reject/sync mutations | create |
| `app/dashboard/earnings/…` (withdraw drawer) | SideDrawer withdraw UI | modify |
| `app/dashboard/admin/payouts/page.tsx` | admin approval queue UI | create |
| `src/components/dashboard/Sidebar.tsx` | super_admin-only "Payouts (Admin)" link | modify |
| `.env.example`, `.claude/rules/env-vars.md`, `.claude/rules/api-routes.md`, `docs/reference/dashboard-map.md` | docs | modify |
| `types/database.types.ts` | regen after migration | regenerate |

---

## Task 1: Sandbox spike — confirm + record the Cashfree Payouts V2 contract

**No code ships from this task except a documented constants file.** It removes the external-API unknowns so later tasks are concrete. PAUSE point for the human (needs sandbox creds).

**Files:**
- Create: `src/lib/server/cashfree-payouts.contract.md` (recorded findings)

- [ ] **Step 1: Confirm payout_type enum + Payouts activation**

Via Supabase MCP `execute_sql` on `qcendfisvyjnwmefruba`:
```sql
select enum_range(null::payout_type);
```
Record the exact labels (used for `creator_payout_methods.type`).

- [ ] **Step 2: Get sandbox Payouts credentials**

Confirm with the human: `CASHFREE_PAYOUT_CLIENT_ID`, `CASHFREE_PAYOUT_CLIENT_SECRET` for **sandbox**, and that Payouts is activated. Put them in `.env.local` (never commit). Base URL sandbox = `https://sandbox.cashfree.com/payout`.

- [ ] **Step 3: Confirm the exact V2 contract against the live reference + a sandbox call**

From `https://www.cashfree.com/docs/api-reference/payouts/` (V2), record into `cashfree-payouts.contract.md`:
1. **Auth:** exact headers + `x-api-version` value; whether a `POST /payout/v2/authorize` bearer step is required or `x-client-id`/`x-client-secret` headers are used directly.
2. **Create beneficiary:** method, path (e.g. `POST /payout/v2/beneficiary`), and the exact body field names (beneficiary_id, beneficiary_name, instrument details for bank acct no + IFSC and/or VPA, contact details), and the "already exists" error shape.
3. **Create transfer:** method, path (e.g. `POST /payout/v2/transfers`), exact body (transfer_id, transfer_amount, transfer_mode value for bank vs UPI, beneficiary_details), and success/duplicate response shape.
4. **Get transfer:** `GET /payout/v2/transfers/{transfer_id}` (or query form) + the status field name + terminal values.
5. **Webhook:** which variant THIS sandbox account sends — legacy **form-POST** (`signature` param, sorted-values HMAC-SHA256/base64, oldest API secret) vs V2 **JSON** (`x-webhook-signature` + `x-webhook-timestamp`). Record the exact event names + payload fields (`transferId`/`transfer_id`, status, `referenceId`, `reason`, `utr`, `acknowledged`).

- [ ] **Step 4: Commit the contract notes**
```bash
git add src/lib/server/cashfree-payouts.contract.md
git commit -m "docs(payouts): record confirmed Cashfree Payouts V2 contract (auth, beneficiary, transfer, webhook)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

> Tasks 4, 6, 8 reference this file for exact field names. If a field differs from the spec's assumed shape, follow the **contract file** (it's ground truth from the live API).

---

## Task 2: Migration — status default + account_last4

**Files:**
- Create: `supabase/migrations/20260701000000_phase1_payouts.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Phase 1 — Payouts wiring (2026-07-01)
-- Spec: docs/superpowers/specs/2026-06-30-phase1-cashfree-payouts-design.md
-- 1. Fix creator_payouts.status default (was 'initiated', invalid under the Phase 0 CHECK).
-- 2. Add creator_payout_methods.account_last4 (non-secret display; full number stays encrypted in creator_kyc).
alter table public.creator_payouts alter column status set default 'pending';
alter table public.creator_payout_methods add column if not exists account_last4 text;
```

- [ ] **Step 2: Apply via Supabase MCP**

Call `mcp__plugin_supabase_supabase__apply_migration` (`project_id: qcendfisvyjnwmefruba`, `name: phase1_payouts`, `query`: the file contents). Then verify:
```sql
select column_default from information_schema.columns where table_schema='public' and table_name='creator_payouts' and column_name='status';
-- expect: 'pending'::text
select exists(select 1 from information_schema.columns where table_schema='public' and table_name='creator_payout_methods' and column_name='account_last4');
-- expect: true
```

- [ ] **Step 3: Commit**
```bash
git add supabase/migrations/20260701000000_phase1_payouts.sql
git commit -m "feat(db): phase1 payouts — status default 'pending', payout_methods.account_last4

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: `payout-policy.ts` — min amount + KYC→beneficiary/method mappers (TDD)

Pure functions: the min-payout constant and the mappers that turn a decrypted KYC row into a Cashfree beneficiary payload and a `creator_payout_methods` display row. No Cashfree calls, no DB — fully unit-testable.

**Files:**
- Create: `src/lib/server/payout-policy.ts`
- Test: `src/lib/server/payout-policy.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/server/payout-policy.test.ts
import { describe, it, expect } from 'vitest';
import { MIN_PAYOUT_INR, kycToBeneficiaryPayload, kycToPayoutMethodRow } from './payout-policy';

const kyc = {
  legal_name: 'Ada Lovelace',
  bank_account_name: 'Ada Lovelace',
  bank_account_plain: '1234567890',   // already-decrypted by the caller
  ifsc_code: 'HDFC0001234',
  bank_last4: '7890',
  upi_id_plain: '',
};

describe('payout-policy', () => {
  it('exposes a ₹100 minimum', () => {
    expect(MIN_PAYOUT_INR).toBe(100);
  });

  it('builds a bank beneficiary payload from decrypted KYC', () => {
    const p = kycToBeneficiaryPayload('benef_abc', kyc);
    expect(p.beneficiary_id).toBe('benef_abc');
    expect(p.beneficiary_name).toBe('Ada Lovelace');
    expect(p.bank_account_number).toBe('1234567890');
    expect(p.bank_ifsc).toBe('HDFC0001234');
  });

  it('builds a non-secret payout-method row (no full account number)', () => {
    const row = kycToPayoutMethodRow('creator-1', kyc);
    expect(row.creator_id).toBe('creator-1');
    expect(row.account_holder_name).toBe('Ada Lovelace');
    expect(row.ifsc_code).toBe('HDFC0001234');
    expect(row.account_last4).toBe('7890');
    expect(row.status).toBe('verified');
    expect(row.is_default).toBe(true);
    expect((row as Record<string, unknown>).account_number).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it, verify FAIL**

Run: `npm test -- src/lib/server/payout-policy.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
// src/lib/server/payout-policy.ts
// Payout policy + pure mappers (server-only). No Cashfree calls, no DB.
export const MIN_PAYOUT_INR = 100;

export interface DecryptedKyc {
  legal_name: string | null;
  bank_account_name: string | null;
  bank_account_plain: string;   // decrypted by the caller (decryptField)
  ifsc_code: string | null;
  bank_last4: string | null;
  upi_id_plain?: string;        // decrypted UPI, optional
}

export interface BeneficiaryPayload {
  beneficiary_id: string;
  beneficiary_name: string;
  bank_account_number: string;
  bank_ifsc: string;
  vpa?: string;
}

export function kycToBeneficiaryPayload(beneficiaryId: string, kyc: DecryptedKyc): BeneficiaryPayload {
  const payload: BeneficiaryPayload = {
    beneficiary_id: beneficiaryId,
    beneficiary_name: (kyc.bank_account_name || kyc.legal_name || '').trim(),
    bank_account_number: kyc.bank_account_plain.trim(),
    bank_ifsc: (kyc.ifsc_code || '').trim().toUpperCase(),
  };
  const vpa = (kyc.upi_id_plain || '').trim();
  if (vpa) payload.vpa = vpa;
  return payload;
}

export interface PayoutMethodRow {
  creator_id: string;
  type: string;            // payout_type label confirmed in Task 1 (e.g. 'bank')
  account_holder_name: string;
  ifsc_code: string;
  account_last4: string;
  status: 'verified';
  is_default: true;
}

export function kycToPayoutMethodRow(creatorId: string, kyc: DecryptedKyc): PayoutMethodRow {
  return {
    creator_id: creatorId,
    type: 'bank',          // replace with the confirmed payout_type label if different
    account_holder_name: (kyc.bank_account_name || kyc.legal_name || '').trim(),
    ifsc_code: (kyc.ifsc_code || '').trim().toUpperCase(),
    account_last4: (kyc.bank_last4 || '').trim(),
    status: 'verified',
    is_default: true,
  };
}
```
(If Task 1 reported a `payout_type` label other than `'bank'`, change the `type` literal here and re-run the test.)

- [ ] **Step 4: Run it, verify PASS**

Run: `npm test -- src/lib/server/payout-policy.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**
```bash
git add src/lib/server/payout-policy.ts src/lib/server/payout-policy.test.ts
git commit -m "feat(payouts): payout-policy — MIN_PAYOUT_INR + pure KYC->beneficiary/method mappers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: `cashfree-payouts.ts` — client + webhook signature verifier (TDD the verifier)

The HTTP methods use the **contract file from Task 1**. The signature verifier is fully testable now (documented algorithm). Write the verifier TDD; write the HTTP methods against the confirmed contract.

**Files:**
- Create: `src/lib/server/cashfree-payouts.ts`
- Test: `src/lib/server/cashfree-payouts.test.ts`

- [ ] **Step 1: Write the failing test for the legacy form-POST signature verifier**

```ts
// src/lib/server/cashfree-payouts.test.ts
import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyPayoutWebhookSignatureLegacy } from './cashfree-payouts';

// Legacy scheme: sort POST params (except signature) by key, concat values, HMAC-SHA256 base64.
function sign(params: Record<string, string>, secret: string): string {
  const data = Object.keys(params).filter(k => k !== 'signature').sort().map(k => params[k]).join('');
  return crypto.createHmac('sha256', secret).update(data).digest('base64');
}

describe('verifyPayoutWebhookSignatureLegacy', () => {
  const secret = 'test_secret';
  const params = { event: 'TRANSFER_SUCCESS', transferId: 'po_1', referenceId: 'cf_9', eventTime: '2026-07-01' };

  it('accepts a correct signature', () => {
    const signature = sign(params, secret);
    expect(verifyPayoutWebhookSignatureLegacy({ ...params, signature }, secret)).toBe(true);
  });

  it('rejects a tampered amount/param', () => {
    const signature = sign(params, secret);
    expect(verifyPayoutWebhookSignatureLegacy({ ...params, transferId: 'po_HACK', signature }, secret)).toBe(false);
  });

  it('rejects a missing signature', () => {
    expect(verifyPayoutWebhookSignatureLegacy({ ...params }, secret)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it, verify FAIL**

Run: `npm test -- src/lib/server/cashfree-payouts.test.ts`
Expected: FAIL (module/function not found).

- [ ] **Step 3: Implement the client**

```ts
// src/lib/server/cashfree-payouts.ts
// Cashfree Payouts V2 client — SERVER ONLY. Never import client-side.
// Exact request/response shapes per src/lib/server/cashfree-payouts.contract.md (Task 1 spike).
import crypto from 'crypto';

const BASE = process.env.CASHFREE_PAYOUT_ENVIRONMENT === 'PRODUCTION'
  ? 'https://api.cashfree.com/payout'
  : 'https://sandbox.cashfree.com/payout';

function headers() {
  return {
    'Content-Type': 'application/json',
    'x-client-id': process.env.CASHFREE_PAYOUT_CLIENT_ID!,
    'x-client-secret': process.env.CASHFREE_PAYOUT_CLIENT_SECRET!,
    // x-api-version value confirmed in the contract file:
    'x-api-version': process.env.CASHFREE_PAYOUT_API_VERSION ?? '2024-01-01',
  };
}

// Constant-time compare of two base64 strings.
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a); const bb = Buffer.from(b);
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

// Legacy form-POST webhook: sort params (except 'signature') by key, concat values, HMAC-SHA256 base64.
export function verifyPayoutWebhookSignatureLegacy(params: Record<string, string>, secret: string): boolean {
  const received = params.signature;
  if (!received) return false;
  const data = Object.keys(params).filter(k => k !== 'signature').sort().map(k => params[k]).join('');
  const expected = crypto.createHmac('sha256', secret).update(data).digest('base64');
  return safeEqual(expected, received);
}

// V2 JSON webhook (if the account uses it): HMAC-SHA256 of (timestamp + rawBody), base64. Confirm in contract file.
export function verifyPayoutWebhookSignatureV2(rawBody: string, timestamp: string, signature: string, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(timestamp + rawBody).digest('base64');
  return safeEqual(expected, signature);
}

export interface BeneficiaryInput {
  beneficiary_id: string; beneficiary_name: string; bank_account_number: string; bank_ifsc: string; vpa?: string;
}

// Bodies below follow the contract file. Adjust field nesting to the confirmed V2 schema.
export async function createBeneficiary(b: BeneficiaryInput): Promise<{ ok: boolean; alreadyExists: boolean; raw: unknown }> {
  const res = await fetch(`${BASE}/v2/beneficiary`, { method: 'POST', headers: headers(), body: JSON.stringify(b), cache: 'no-store' });
  const raw = await res.json().catch(() => ({}));
  if (res.ok) return { ok: true, alreadyExists: false, raw };
  // Cashfree returns a specific code/message for an existing beneficiary — treat as success (idempotent).
  const msg = JSON.stringify(raw).toLowerCase();
  if (res.status === 409 || msg.includes('already exists') || msg.includes('beneficiary_id_already_exists')) {
    return { ok: true, alreadyExists: true, raw };
  }
  return { ok: false, alreadyExists: false, raw };
}

export async function initiateTransfer(input: { transfer_id: string; transfer_amount: number; beneficiary_id: string; mode: 'banktransfer' | 'upi' }): Promise<{ accepted: boolean; raw: unknown }> {
  const body = {
    transfer_id: input.transfer_id,
    transfer_amount: input.transfer_amount,
    transfer_mode: input.mode,
    beneficiary_details: { beneficiary_id: input.beneficiary_id },
  };
  const res = await fetch(`${BASE}/v2/transfers`, { method: 'POST', headers: headers(), body: JSON.stringify(body), cache: 'no-store' });
  const raw = await res.json().catch(() => ({}));
  // 200/201/202 (or a duplicate transfer_id → already accepted) = accepted; await webhook for terminal status.
  const msg = JSON.stringify(raw).toLowerCase();
  const accepted = res.ok || msg.includes('transfer_id_already_present') || msg.includes('already exists');
  return { accepted, raw };
}

export async function getTransfer(transferId: string): Promise<{ status: string | null; raw: unknown }> {
  const res = await fetch(`${BASE}/v2/transfers/${encodeURIComponent(transferId)}`, { headers: headers(), cache: 'no-store' });
  const raw = await res.json().catch(() => ({}));
  const status = (raw as { status?: string; transfer_status?: string })?.status
    ?? (raw as { transfer_status?: string })?.transfer_status ?? null;
  return { status, raw };
}
```

- [ ] **Step 4: Run it, verify PASS + typecheck**

Run: `npm test -- src/lib/server/cashfree-payouts.test.ts`
Expected: PASS (3 tests).
Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**
```bash
git add src/lib/server/cashfree-payouts.ts src/lib/server/cashfree-payouts.test.ts
git commit -m "feat(payouts): Cashfree Payouts V2 client + webhook signature verifier

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Harden the request route (min-payout + payout_method_id)

**Files:**
- Modify: `app/api/payouts/request/route.ts`

- [ ] **Step 1: Add the min-payout guard**

After the `amount` validation block (currently rejects `<= 0`), add — import at top: `import { MIN_PAYOUT_INR } from '@/lib/server/payout-policy';` — and after the existing amount check:
```ts
    if (amount < MIN_PAYOUT_INR) {
      return NextResponse.json({ error: `Minimum payout is ₹${MIN_PAYOUT_INR}.` }, { status: 400 });
    }
```

- [ ] **Step 2: Set payout_method_id on the inserted payout**

The destination derivation (create the `creator_payout_methods` row + Cashfree beneficiary) happens at **approval** time (Task 6), so at request time we only ensure a `payout_method_id` reference if one already exists; otherwise leave null and let approval populate it. Change the `creator_payouts` insert to look up an existing default method:
```ts
    const { data: method } = await supabaseAdmin
      .from('creator_payout_methods')
      .select('id')
      .eq('creator_id', profileId)
      .eq('is_default', true)
      .maybeSingle();

    const { data: payout, error: payoutError } = await supabaseAdmin
      .from('creator_payouts')
      .insert({ creator_id: profileId, amount, currency: 'INR', status: 'pending', payout_method_id: method?.id ?? null })
      .select()
      .single();
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**
```bash
git add app/api/payouts/request/route.ts
git commit -m "feat(payouts): enforce ₹100 minimum + link default payout_method on request

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Approve route — beneficiary → claim → transfer

**Files:**
- Create: `app/api/admin/payouts/[id]/approve/route.ts`

- [ ] **Step 1: Write the route**

```ts
// app/api/admin/payouts/[id]/approve/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { decryptField } from '@/lib/server/kyc-crypto';
import { kycToBeneficiaryPayload, kycToPayoutMethodRow } from '@/lib/server/payout-policy';
import { createBeneficiary, initiateTransfer } from '@/lib/server/cashfree-payouts';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: payoutId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createServiceClient();
    // Re-read super_admin from the DB (never trust JWT for money actions).
    const { data: isAdmin } = await db.rpc('is_super_admin');
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: payout } = await db.from('creator_payouts')
      .select('id, creator_id, amount, status, payout_method_id').eq('id', payoutId).maybeSingle();
    if (!payout) return NextResponse.json({ error: 'Payout not found.' }, { status: 404 });
    if (payout.status !== 'pending') return NextResponse.json({ error: `Payout is ${payout.status}, not pending.` }, { status: 409 });

    const { data: kyc } = await db.from('creator_kyc')
      .select('legal_name, bank_account_name, bank_account_enc, ifsc_code, bank_last4, upi_id_enc, beneficiary_id, status')
      .eq('creator_id', payout.creator_id).maybeSingle();
    if (!kyc || kyc.status !== 'verified') return NextResponse.json({ error: 'Creator KYC not verified.' }, { status: 409 });

    // Decrypt bank (Phase 0 _enc columns are text enc:v1 envelopes).
    let bankPlain = '';
    try { bankPlain = decryptField(kyc.bank_account_enc ?? ''); } catch { /* handled below */ }
    if (!bankPlain) return NextResponse.json({ error: 'Could not read bank details (decrypt failed).' }, { status: 500 });
    const upiPlain = (() => { try { return decryptField(kyc.upi_id_enc ?? ''); } catch { return ''; } })();
    const dkyc = { legal_name: kyc.legal_name, bank_account_name: kyc.bank_account_name, bank_account_plain: bankPlain, ifsc_code: kyc.ifsc_code, bank_last4: kyc.bank_last4, upi_id_plain: upiPlain };

    // Ensure beneficiary.
    let beneficiaryId = kyc.beneficiary_id as string | null;
    if (!beneficiaryId) {
      beneficiaryId = `benef_${payout.creator_id}`;
      const ben = await createBeneficiary(kycToBeneficiaryPayload(beneficiaryId, dkyc));
      if (!ben.ok) return NextResponse.json({ error: 'Beneficiary creation failed.' }, { status: 502 });
      await db.from('creator_kyc').update({ beneficiary_id: beneficiaryId, beneficiary_metadata: ben.raw as object }).eq('creator_id', payout.creator_id);
    }

    // Ensure a default payout-method row exists (display only; non-secret).
    let methodId = payout.payout_method_id as string | null;
    if (!methodId) {
      const { data: m } = await db.from('creator_payout_methods')
        .upsert(kycToPayoutMethodRow(payout.creator_id, dkyc), { onConflict: 'creator_id,is_default' })
        .select('id').maybeSingle();
      methodId = m?.id ?? null;
    }

    // Atomic claim pending -> processing (idempotent against double-approve).
    const { data: claimed } = await db.from('creator_payouts')
      .update({ status: 'processing', payout_method_id: methodId, initiated_at: new Date().toISOString() })
      .eq('id', payoutId).eq('status', 'pending').select('id').maybeSingle();
    if (!claimed) return NextResponse.json({ error: 'Payout already claimed.' }, { status: 409 });

    // Initiate transfer; transfer_id = payout.id (Cashfree dedupes duplicates).
    const tr = await initiateTransfer({ transfer_id: payoutId, transfer_amount: Number(payout.amount), beneficiary_id: beneficiaryId!, mode: 'banktransfer' });
    if (!tr.accepted) {
      // Known failure → release the hold via settle_payout('failed'); creator can re-request.
      await db.rpc('settle_payout', { p_payout_id: payoutId, p_terminal: 'failed', p_gateway_payout_id: null, p_gateway_metadata: tr.raw as object, p_failure_reason: 'transfer_init_failed' });
      return NextResponse.json({ error: 'Transfer initiation failed; hold released.' }, { status: 502 });
    }
    await db.from('creator_payouts').update({ gateway_metadata: tr.raw as object }).eq('id', payoutId);
    return NextResponse.json({ ok: true, status: 'processing' });
  } catch (e) {
    console.error('[admin/payouts/approve]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```
> Note: the `creator_payout_methods` upsert uses `onConflict: 'creator_id,is_default'` — confirm a matching unique index exists; if not, drop the `onConflict` and do a select-then-insert. (Task 1 / a quick `pg_indexes` check decides this; if absent, the select-then-insert fallback is: select default method, insert if none.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. If `is_super_admin` RPC isn't in the generated types, regenerate types first (Task 11) or call it via `db.rpc('is_super_admin' as never)` with a typed cast — prefer regen.

- [ ] **Step 3: Commit**
```bash
git add app/api/admin/payouts/[id]/approve/route.ts
git commit -m "feat(payouts): admin approve — ensure beneficiary, atomic claim, initiate transfer

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Reject route — pending-only → settle failed

**Files:**
- Create: `app/api/admin/payouts/[id]/reject/route.ts`

- [ ] **Step 1: Write the route**

```ts
// app/api/admin/payouts/[id]/reject/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: payoutId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = createServiceClient();
    const { data: isAdmin } = await db.rpc('is_super_admin');
    if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const reason = typeof (body as { reason?: string }).reason === 'string' ? (body as { reason: string }).reason : 'Rejected by admin';

    // Only a still-pending payout can be rejected (never after the transfer fired).
    const { data: payout } = await db.from('creator_payouts').select('status').eq('id', payoutId).maybeSingle();
    if (!payout) return NextResponse.json({ error: 'Payout not found.' }, { status: 404 });
    if (payout.status !== 'pending') return NextResponse.json({ error: `Cannot reject a ${payout.status} payout.` }, { status: 409 });

    const { data: ok } = await db.rpc('settle_payout', { p_payout_id: payoutId, p_terminal: 'failed', p_gateway_payout_id: null, p_gateway_metadata: null, p_failure_reason: reason });
    if (!ok) return NextResponse.json({ error: 'Payout no longer pending.' }, { status: 409 });
    return NextResponse.json({ ok: true, status: 'failed' });
  } catch (e) {
    console.error('[admin/payouts/reject]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit` → clean.
```bash
git add app/api/admin/payouts/[id]/reject/route.ts
git commit -m "feat(payouts): admin reject — pending-only, releases hold via settle_payout

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Webhook route — verify → settle

**Files:**
- Create: `app/api/webhook/cashfree-payout/route.ts`

- [ ] **Step 1: Write the route (legacy form-POST variant; swap to V2 JSON per the contract file if that's what the account uses)**

```ts
// app/api/webhook/cashfree-payout/route.ts
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { verifyPayoutWebhookSignatureLegacy } from '@/lib/server/cashfree-payouts';

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const params = Object.fromEntries(new URLSearchParams(raw)) as Record<string, string>;
    const secret = process.env.CASHFREE_PAYOUT_WEBHOOK_SECRET ?? process.env.CASHFREE_PAYOUT_CLIENT_SECRET ?? '';
    if (!verifyPayoutWebhookSignatureLegacy(params, secret)) {
      console.warn('[webhook/cashfree-payout] invalid signature');
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }

    const event = params.event;
    const transferId = params.transferId ?? params.transfer_id;   // = our creator_payouts.id
    if (!transferId) return NextResponse.json({ received: true });  // nothing to do; don't trigger retries

    const db = createServiceClient();
    if (event === 'TRANSFER_SUCCESS') {
      await db.rpc('settle_payout', { p_payout_id: transferId, p_terminal: 'success', p_gateway_payout_id: params.referenceId ?? null, p_gateway_metadata: params, p_failure_reason: null });
    } else if (event === 'TRANSFER_FAILED') {
      await db.rpc('settle_payout', { p_payout_id: transferId, p_terminal: 'failed', p_gateway_payout_id: params.referenceId ?? null, p_gateway_metadata: params, p_failure_reason: params.reason ?? 'transfer_failed' });
    }
    // settle_payout is idempotent (status claim) — duplicates/late events are no-ops.
    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('[webhook/cashfree-payout]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit` → clean.
```bash
git add app/api/webhook/cashfree-payout/route.ts
git commit -m "feat(payouts): signature-verified payout webhook -> settle_payout (idempotent)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Sync route — lazy/manual reconcile (cron-ready, dual-auth)

**Files:**
- Create: `app/api/admin/payouts/sync/route.ts`

- [ ] **Step 1: Write the route**

```ts
// app/api/admin/payouts/sync/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { getTransfer } from '@/lib/server/cashfree-payouts';

const STALE_MINUTES = 15;

export async function POST(req: Request) {
  try {
    const db = createServiceClient();
    // Dual-auth: a super_admin session OR the cron secret header.
    const cronSecret = req.headers.get('x-cron-secret');
    let authed = !!cronSecret && cronSecret === process.env.CRON_SECRET;
    if (!authed) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) { const { data: isAdmin } = await db.rpc('is_super_admin'); authed = !!isAdmin; }
    }
    if (!authed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const cutoff = new Date(Date.now() - STALE_MINUTES * 60_000).toISOString();
    const { data: stuck } = await db.from('creator_payouts')
      .select('id').eq('status', 'processing').lt('initiated_at', cutoff).limit(50);

    let settled = 0;
    for (const p of stuck ?? []) {
      const { status } = await getTransfer(p.id);
      const s = (status ?? '').toUpperCase();
      if (['SUCCESS', 'COMPLETED', 'PAID'].includes(s)) {
        await db.rpc('settle_payout', { p_payout_id: p.id, p_terminal: 'success', p_gateway_payout_id: null, p_gateway_metadata: { synced: true, status: s }, p_failure_reason: null });
        settled++;
      } else if (['FAILED', 'REJECTED', 'REVERSED', 'CANCELLED'].includes(s)) {
        await db.rpc('settle_payout', { p_payout_id: p.id, p_terminal: 'failed', p_gateway_payout_id: null, p_gateway_metadata: { synced: true, status: s }, p_failure_reason: `synced_${s}` });
        settled++;
      }
      // else still in-flight → leave processing.
    }
    return NextResponse.json({ checked: stuck?.length ?? 0, settled });
  } catch (e) {
    console.error('[admin/payouts/sync]', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```
> Terminal-status string sets are best-effort; reconcile them against the contract file's confirmed transfer-status values in Task 1.

- [ ] **Step 2: Typecheck + commit**

Run: `npx tsc --noEmit` → clean.
```bash
git add app/api/admin/payouts/sync/route.ts
git commit -m "feat(payouts): cron-ready sync route — reconcile stuck processing payouts (dual-auth)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Creator withdraw UI + admin queue UI

This task has two UI surfaces; both follow `.claude/rules/dashboard-design.md`. Build the hooks first, then the pages.

**Files:**
- Modify: `src/hooks/commerce/useEarnings.ts` (add `requestPayout`)
- Create: `src/hooks/admin/usePayoutQueue.ts`
- Modify: `app/dashboard/earnings/` page (withdraw `SideDrawer`)
- Create: `app/dashboard/admin/payouts/page.tsx`
- Modify: `src/components/dashboard/Sidebar.tsx`

- [ ] **Step 1: Add `requestPayout` to `useEarnings`**

In `src/hooks/commerce/useEarnings.ts`, add a mutation (alongside `updateKyc`):
```ts
  const requestPayoutMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await fetch('/api/payouts/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? 'Payout request failed.');
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['earnings', 'summary'] }),
  });
```
Export `requestPayout: requestPayoutMutation.mutateAsync` + `isRequestingPayout: requestPayoutMutation.isPending` from the hook's return.

- [ ] **Step 2: Build the withdraw `SideDrawer` on the earnings page**

In the earnings page, add a "Withdraw" button (disabled unless `kyc?.status === 'verified'`; otherwise link to `/dashboard/settings/billing`). The drawer uses the existing `SideDrawer` primitive: show available balance, the destination line (`kyc.bank_last4` → "Payout to ••••{bank_last4}"), a `CurrencyInput` (₹) constrained to `MIN_PAYOUT_INR ≤ x ≤ available`, inline validation, and a `ConfirmDialog` on submit calling `requestPayout(amount)`. On success, toast + the payouts `DataTable` refetches. Use only token classes; `StatusPill` for each payout row's status.

- [ ] **Step 3: Build `usePayoutQueue` (admin)**

```ts
// src/hooks/admin/usePayoutQueue.ts
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export function usePayoutQueue() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'payouts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_payouts')
        .select('id, creator_id, amount, status, failure_reason, created_at, creator_payout_methods(account_last4, ifsc_code)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const act = (path: string) => useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await fetch(`/api/admin/payouts/${id}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((d as { error?: string }).error ?? `${path} failed`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'payouts'] }),
  });
  const sync = useMutation({
    mutationFn: async () => { const res = await fetch('/api/admin/payouts/sync', { method: 'POST' }); if (!res.ok) throw new Error('sync failed'); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'payouts'] }),
  });
  return { payouts: data ?? [], isLoading, approve: act('approve'), reject: act('reject'), sync };
}
```
> `creator_payouts` RLS is select-own + admin-select, so a super_admin's browser client sees all rows. Reads are fine client-side; the writes go through the service-role API routes.

- [ ] **Step 4: Build the admin page + lazy-sync-on-load**

`app/dashboard/admin/payouts/page.tsx` (`'use client'`): a list/`DataTable` of payouts (creator, amount, destination ••••last4, `StatusPill`, requested-at). Pending rows get **Approve** (`ConfirmDialog`) + **Reject** (reason prompt). A header **"Sync statuses"** button calls `sync`. **On mount, fire `sync.mutate()` once** (lazy on-read). Follow the list-page archetype; super_admin-only content. Add `pt-6`/`PageHeader` top spacing.

- [ ] **Step 5: Sidebar link (super_admin only)**

In `src/components/dashboard/Sidebar.tsx`, add a nav entry "Payouts · Admin" → `/dashboard/admin/payouts`, rendered only when the session role is `super_admin` (use the existing role/session source in the sidebar; if none, gate by a `useAuthSession`-derived flag). Keep lucide icon + token styling.

- [ ] **Step 6: Typecheck, lint, color-grep**

Run: `npx tsc --noEmit` → clean.
Run: `npx eslint app/dashboard/admin/payouts/page.tsx src/hooks/admin/usePayoutQueue.ts` → no errors.
Run the dashboard hardcoded-color grep from `dashboard-design.md` on the new page → expect 0.

- [ ] **Step 7: Commit**
```bash
git add src/hooks/commerce/useEarnings.ts src/hooks/admin/usePayoutQueue.ts app/dashboard/earnings app/dashboard/admin/payouts/page.tsx src/components/dashboard/Sidebar.tsx
git commit -m "feat(payouts): creator withdraw drawer + super_admin approval queue UI

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: Env docs, types regen, sandbox e2e, doc state

**Files:**
- Modify: `.env.example`, `.claude/rules/env-vars.md`, `.claude/rules/api-routes.md`, `docs/reference/dashboard-map.md`, `types/database.types.ts`, `.claude/todo-later/11(half)-…overhaul.md`

- [ ] **Step 1: Env docs**

Add to `.env.example` + `.claude/rules/env-vars.md`: `CASHFREE_PAYOUT_CLIENT_ID`, `CASHFREE_PAYOUT_CLIENT_SECRET`, `CASHFREE_PAYOUT_ENVIRONMENT` (`SANDBOX|PRODUCTION`), `CASHFREE_PAYOUT_API_VERSION`, `CASHFREE_PAYOUT_WEBHOOK_SECRET`, `CRON_SECRET` — all server-only secrets (except ENVIRONMENT/API_VERSION which are non-secret config).

- [ ] **Step 2: Regenerate types**

Per `.claude/rules/supabase-reference.md` MCP fallback: call `generate_typescript_types`, extract the `types` field to `types/database.types.ts` (Node: `node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync(process.argv[1],'utf8'));fs.writeFileSync('types/database.types.ts',p.types,'utf8')" "<tool-results-path>"`). Confirm `account_last4` present; `npx tsc --noEmit` clean.

- [ ] **Step 3: API + dashboard map docs**

In `.claude/rules/api-routes.md` add rows for `POST /api/admin/payouts/[id]/approve`, `/reject`, `POST /api/admin/payouts/sync`, `POST /api/webhook/cashfree-payout`. In `docs/reference/dashboard-map.md` add `/dashboard/admin/payouts` and note the earnings withdraw drawer.

- [ ] **Step 4: Sandbox end-to-end (manual; PAUSE)**

With sandbox creds + a webhook pointed at the deployed `/api/webhook/cashfree-payout` (or a tunnel): as a creator request ₹100 → as super_admin approve → confirm a sandbox transfer fires → confirm the webhook settles → verify in DB: `creator_payouts.status='success'`, a `transaction_ledger` `payout` debit row, `creator_balances.total_paid_out += 100`, `pending_payout` released. Then force a `TRANSFER_FAILED` (sandbox tool) on a second payout → confirm the hold is released and no debit. Record results.

- [ ] **Step 5: Full gauntlet + commit docs**

Run: `npx tsc --noEmit` · `npm run lint` · `npm test` · `/verify` → all green.
Update the blueprint `11(half)` Plan-state Phase 1 row → status + spec/plan links; note the reconcile scheduler is still deferred (cron-ready route exists). Commit:
```bash
git add .env.example .claude/rules/env-vars.md .claude/rules/api-routes.md docs/reference/dashboard-map.md types/database.types.ts ".claude/todo-later/11(half)-2026-06-30-payments-earnings-payout-kyc-overhaul.md"
git commit -m "docs(payouts): env + api-routes + dashboard-map + blueprint state for phase1

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Verification checklist (Phase 1 done when)

- [ ] Creator can request a payout (≥ ₹100, ≤ available); KYC-unverified is blocked + routed to billing.
- [ ] super_admin sees the queue; **Approve** creates beneficiary (once) + fires the transfer; **Reject** (pending-only) releases the hold.
- [ ] Double-approve is a no-op (atomic claim); reject after `processing` is refused.
- [ ] Signature-verified webhook settles success/failed via `settle_payout`; bad signature → 401; duplicates → no-op.
- [ ] Sandbox e2e: success path writes one ledger `payout` debit + `total_paid_out` + releases hold; failed path releases hold, no debit.
- [ ] Sync route reconciles a stuck `processing` payout; lazy-on-load + manual button both work; dual-auth enforced.
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm test`, `/verify` pass.

## Self-review notes (addressed)

- **Spec coverage:** §3 flow → Tasks 5/6/7/8. §4 schema → Task 2 + the non-secret method row in Task 3/6. §5 units → Tasks 3/4/6/7/8/9. §6 no-cron reconcile → Task 9 + Task 10 lazy-on-load. §7 edge cases → approve/reject/webhook/sync guards. §8 UI → Task 10. §9 security → super_admin re-read, signature verify, service-role writes, dual-auth. §10 testing → Tasks 3/4 unit + Task 11 sandbox e2e. §12 open items → Task 1 spike.
- **External-API uncertainty** is isolated to Task 1 (spike) + the contract file; client field names in Task 4/6 say "follow the contract file." This is deliberate, not a placeholder — the wire format is only knowable against the live sandbox.
- **Type consistency:** `kycToBeneficiaryPayload`/`kycToPayoutMethodRow`/`DecryptedKyc` identical across Tasks 3/6; `verifyPayoutWebhookSignatureLegacy(params, secret)` identical Task 4/8; `settle_payout` arg names match the Phase 0 RPC across Tasks 6/7/8/9; `transfer_id = creator_payouts.id` consistent.
- **Decisions honored:** admin-approved (6/7), derive-from-KYC (3/6), platform-absorbs-fee (settle debits `amount`, no fee line), no-cron (9 + lazy load), min ₹100 (3/5), beneficiary via transfer-time validation (no penny-drop task).
