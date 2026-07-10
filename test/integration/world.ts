// Test "world" — seeds a full creator/buyer/product/order graph against the live
// test Supabase project and tears it all down afterwards. Every integration file
// creates one World in beforeAll and calls cleanup() in afterAll.
//
// Seeding a creator goes through auth.admin.createUser so the real handle_new_user
// trigger builds the public.users + public.profiles rows exactly like production —
// profiles.id is the creator_id every money table keys on.

import crypto from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/database.types';

export function hasCreds(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function serviceClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Anon (RLS-enforced) client — used by the isolation tests to prove policies hold.
export function anonClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// A client authenticated as a seeded user — subsequent queries run under that user's
// JWT, so RLS applies exactly as it would in the app.
export async function signInAs(email: string, password: string): Promise<SupabaseClient<Database>> {
  const c = anonClient();
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signInAs(${email}) failed: ${error.message}`);
  return c;
}

const short = () => crypto.randomUUID().slice(0, 8);

export interface SeededUser {
  authId: string;
  profileId: string;
  email: string;
  password: string;
}

export interface SeededOrder {
  orderId: string;
  gatewayOrderId: string;
}

export class World {
  readonly db = serviceClient();
  readonly runId = short();

  private authUserIds: string[] = [];
  private profileIds: string[] = [];
  private orderIds: string[] = [];
  private productIds: string[] = [];
  private siteIds: string[] = [];
  private paymentRequestIds: string[] = [];
  private submissionIds: string[] = [];
  private referralCodeIds: string[] = [];
  private couponIds: string[] = [];

  async createUser(role: 'creator' | 'buyer'): Promise<SeededUser> {
    const email = `pf-int-${role}-${this.runId}-${short()}@example.test`;
    const password = `Pw-${crypto.randomUUID()}`;
    const { data, error } = await this.db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role, full_name: `Test ${role}` },
    });
    if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
    const authId = data.user.id;
    this.authUserIds.push(authId);

    const { data: profile, error: pErr } = await this.db
      .from('profiles')
      .select('id')
      .eq('user_id', authId)
      .maybeSingle();
    if (pErr || !profile) throw new Error(`profile not created by trigger for ${authId}: ${pErr?.message}`);
    this.profileIds.push(profile.id);
    return { authId, profileId: profile.id, email, password };
  }

  async createCoupon(creatorId: string, opts?: { percent?: number; maxUses?: number | null }): Promise<string> {
    const { data, error } = await this.db
      .from('coupons')
      .insert({
        creator_id: creatorId,
        code: `CPN${this.runId}${short()}`.toUpperCase().slice(0, 20),
        discount_type: 'percentage',
        discount_value: opts?.percent ?? 10,
        current_uses: 0,
        max_uses: opts?.maxUses ?? null,
        is_active: true,
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(`createCoupon failed: ${error?.message}`);
    this.couponIds.push(data.id);
    return data.id;
  }

  async createPaymentSite(creatorId: string): Promise<string> {
    const { data: site, error } = await this.db
      .from('sites')
      .insert({ creator_id: creatorId, site_type: 'payment', slug: `pay-${this.runId}-${short()}`, is_active: true })
      .select('id')
      .single();
    if (error || !site) throw new Error(`createPaymentSite failed: ${error?.message}`);
    this.siteIds.push(site.id);
    return site.id;
  }

  async createProduct(creatorId: string, opts?: { price?: number; published?: boolean; name?: string }): Promise<string> {
    const { data, error } = await this.db
      .from('products')
      .insert({
        creator_id: creatorId,
        name: opts?.name ?? `Int Test Product ${short()}`,
        price: opts?.price ?? 1000,
        is_published: opts?.published ?? true,
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(`createProduct failed: ${error?.message}`);
    this.productIds.push(data.id);
    return data.id;
  }

  async setKyc(
    creatorId: string,
    opts?: { status?: string; panLast4?: string | null; gstin?: string | null; state?: string | null }
  ): Promise<void> {
    const { error } = await this.db.from('creator_kyc').upsert(
      {
        creator_id: creatorId,
        status: opts?.status ?? 'verified',
        pan_last4: opts?.panLast4 ?? '1234',
        gstin: opts?.gstin ?? null,
        state: opts?.state ?? null,
        legal_name: 'Test Creator',
      },
      { onConflict: 'creator_id' }
    );
    if (error) throw new Error(`setKyc failed: ${error.message}`);
  }

  async setDefaultPayoutMethod(creatorId: string): Promise<string> {
    const { data, error } = await this.db
      .from('creator_payout_methods')
      .insert({
        creator_id: creatorId,
        type: 'bank_transfer',
        account_holder_name: 'Test Creator',
        ifsc_code: 'HDFC0000001',
        account_last4: '4321',
        status: 'verified',
        is_default: true,
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(`setDefaultPayoutMethod failed: ${error?.message}`);
    return data.id;
  }

  async createPendingOrder(opts: {
    creatorId: string;
    productId: string;
    price: number;
    buyerUserId?: string | null;
    email?: string | null;
    status?: string;
    gatewayPaymentId?: string | null;
    couponId?: string | null;
  }): Promise<SeededOrder> {
    const orderId = crypto.randomUUID();
    const gatewayOrderId = `ord_${orderId.replace(/-/g, '')}`;
    const metadata: Record<string, unknown> = { creator_profile_id: opts.creatorId };
    if (opts.couponId) metadata.coupon_id = opts.couponId;

    const { error } = await this.db.from('orders').insert({
      id: orderId,
      gateway_order_id: gatewayOrderId,
      user_id: opts.buyerUserId ?? null,
      creator_id: opts.creatorId,
      total_amount: opts.price,
      status: opts.status ?? 'pending',
      customer_name: 'Test Buyer',
      customer_email: opts.email ?? null,
      customer_phone: '9999999999',
      gateway_payment_id: opts.gatewayPaymentId ?? null,
      metadata: metadata as Json,
    });
    if (error) throw new Error(`createPendingOrder failed: ${error.message}`);
    this.orderIds.push(orderId);

    const { error: iErr } = await this.db.from('order_items').insert({
      order_id: orderId,
      product_id: opts.productId,
      price_at_purchase: opts.price,
    });
    if (iErr) throw new Error(`order_items insert failed: ${iErr.message}`);

    return { orderId, gatewayOrderId };
  }

  async createReferralCode(ownerCreatorId: string): Promise<string> {
    const { data, error } = await this.db
      .from('referral_codes')
      .insert({
        code: `REF${this.runId}${short()}`.toUpperCase().slice(0, 20),
        owner_creator_id: ownerCreatorId,
        is_active: true,
      })
      .select('id')
      .single();
    if (error || !data) throw new Error(`createReferralCode failed: ${error?.message}`);
    this.referralCodeIds.push(data.id);
    return data.id;
  }

  async addPendingReferral(orderId: string, referralCodeId: string, referrerCreatorId: string, rewardPercent: number): Promise<void> {
    const { error } = await this.db.from('order_referrals').insert({
      order_id: orderId,
      referral_code_id: referralCodeId,
      referrer_creator_id: referrerCreatorId,
      status: 'pending',
      metadata: { reward_percent: rewardPercent } as Json,
    });
    if (error) throw new Error(`addPendingReferral failed: ${error.message}`);
  }

  async createPaymentLinkSubmission(creatorId: string, amount: number): Promise<{ submissionId: string; gatewayOrderId: string }> {
    const siteId = await this.createPaymentSite(creatorId);

    const { data: pr, error: prErr } = await this.db
      .from('payment_requests')
      .insert({ site_id: siteId, title: 'Int Test Payment' })
      .select('id')
      .single();
    if (prErr || !pr) throw new Error(`payment_requests insert failed: ${prErr?.message}`);
    this.paymentRequestIds.push(pr.id);

    const submissionId = crypto.randomUUID();
    const gatewayOrderId = `pl_${submissionId.replace(/-/g, '')}`;
    const { error: subErr } = await this.db.from('payment_submissions').insert({
      id: submissionId,
      payment_request_id: pr.id,
      customer_name: 'Test Buyer',
      customer_email: `buyer-${short()}@example.test`,
      customer_phone: '9999999999',
      amount,
      payment_status: 'pending',
      gateway_order_id: gatewayOrderId,
    });
    if (subErr) throw new Error(`payment_submissions insert failed: ${subErr.message}`);
    this.submissionIds.push(submissionId);

    return { submissionId, gatewayOrderId };
  }

  // Register an order created outside the World (e.g. by a route handler under test)
  // so teardown deletes it and its children.
  trackOrder(orderId: string): void {
    this.orderIds.push(orderId);
  }

  async balance(creatorId: string) {
    const { data } = await this.db
      .from('creator_balances')
      .select('total_earnings, total_platform_fees, total_paid_out, pending_payout, frozen_balance')
      .eq('creator_id', creatorId)
      .maybeSingle();
    return data;
  }

  async cleanup(): Promise<void> {
    const db = this.db;
    const swallow = async (p: PromiseLike<unknown>) => {
      try {
        await p;
      } catch {
        /* best-effort teardown */
      }
    };

    if (this.orderIds.length) {
      await swallow(db.from('transaction_ledger').delete().in('order_id', this.orderIds));
      await swallow(db.from('tax_transactions').delete().in('order_id', this.orderIds));
      await swallow(db.from('user_product_access').delete().in('order_id', this.orderIds));
      await swallow(db.from('guest_entitlements').delete().in('order_id', this.orderIds));
      await swallow(db.from('order_referrals').delete().in('order_id', this.orderIds));
      await swallow(db.from('order_items').delete().in('order_id', this.orderIds));
    }
    if (this.profileIds.length) {
      await swallow(db.from('transaction_ledger').delete().in('creator_id', this.profileIds));
      await swallow(db.from('tax_transactions').delete().in('creator_id', this.profileIds));
      await swallow(db.from('wallet_frozen_logs').delete().in('creator_id', this.profileIds));
      await swallow(db.from('refunds').delete().in('creator_id', this.profileIds));
      await swallow(db.from('notifications').delete().in('recipient_creator_id', this.profileIds));
      await swallow(db.from('creator_payouts').delete().in('creator_id', this.profileIds));
      await swallow(db.from('creator_payout_methods').delete().in('creator_id', this.profileIds));
      await swallow(db.from('subscriptions').delete().in('creator_id', this.profileIds));
      await swallow(db.from('creator_kyc').delete().in('creator_id', this.profileIds));
      await swallow(db.from('coupons').delete().in('creator_id', this.profileIds));
    }
    // Payment-link rows may be created by a route under test (not tracked by id),
    // so clear them by their tracked site first.
    if (this.siteIds.length) {
      const { data: prs } = await db.from('payment_requests').select('id').in('site_id', this.siteIds);
      const prIds = (prs ?? []).map((r) => r.id);
      if (prIds.length) await swallow(db.from('payment_submissions').delete().in('payment_request_id', prIds));
      await swallow(db.from('payment_requests').delete().in('site_id', this.siteIds));
    }
    if (this.submissionIds.length) await swallow(db.from('payment_submissions').delete().in('id', this.submissionIds));
    if (this.paymentRequestIds.length) await swallow(db.from('payment_requests').delete().in('id', this.paymentRequestIds));
    if (this.referralCodeIds.length) await swallow(db.from('referral_codes').delete().in('id', this.referralCodeIds));
    if (this.orderIds.length) await swallow(db.from('orders').delete().in('id', this.orderIds));
    if (this.productIds.length) await swallow(db.from('products').delete().in('id', this.productIds));
    if (this.siteIds.length) await swallow(db.from('sites').delete().in('id', this.siteIds));
    if (this.profileIds.length) await swallow(db.from('creator_balances').delete().in('creator_id', this.profileIds));

    if (this.authUserIds.length) {
      await swallow(db.from('profiles').delete().in('user_id', this.authUserIds));
      await swallow(db.from('users').delete().in('id', this.authUserIds));
      for (const id of this.authUserIds) await swallow(db.auth.admin.deleteUser(id));
    }
  }
}
