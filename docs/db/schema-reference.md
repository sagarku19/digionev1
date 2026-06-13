---
noteId: "0e1c8130675b11f1bffb2f446ab401a4"
tags: []

---

# DigiOne Schema Reference

Quick-reference for every public table. Data sourced from the live Supabase DB (`qcendfisvyjnwmefruba`) on 2026-06-14.

**Legend — Owner column:** the column RLS policies key on. Usually `creator_id` (resolves to `profiles.id`, not `auth.users.id`) or `user_id` (resolves to `auth.uid()` via the `users` mirror table). `—` means public-read or no owner concept.

All 63 tables have RLS enabled. The "Policies" count is the number of distinct `pg_policies` rows; 0 means RLS is on but no explicit policies exist (effectively blocks all access unless using service role).

---

| Table | Purpose | Owner column | RLS policies | Primary writer |
|---|---|---|---|---|
| `ab_tests` | A/B test configurations for creator products | `creator_id` | on / 1 | `useAbTests` hook |
| `affiliates` | Affiliate relationships between creators and affiliate profiles | `creator_id` | on / 2 | `useAffiliates` hook |
| `community_posts` | Creator community feed posts | `creator_id` | on / 2 | `useCommunity` hook |
| `community_reactions` | Reactions (likes/emoji) on community posts | `creator_id` | on / 2 | `useCommunity` hook |
| `conversion_events` | Storefront conversion tracking events | — | on / 1 | storefront client (anon) |
| `coupons` | Discount codes created by creators | `creator_id` | on / 2 | `useCoupons` hook |
| `creator_balances` | Running balance ledger per creator: `total_earnings`, `total_platform_fees`, `total_paid_out`, `pending_payout` | `creator_id` | on / 2 | fulfillment service-role (`credit_creator_balance` RPC) |
| `creator_kyc` | KYC submission and verification status per creator | `creator_id` | on / 4 | `useEarnings` hook (client upsert); verified status set manually |
| `creator_payout_methods` | Bank account / UPI details for payout disbursement | `creator_id` | on / 1 | settings page |
| `creator_payout_request_items` | Line items within a payout request batch | `payout_request_id` | on / 1 | `/api/payouts/request` (service-role) |
| `creator_payout_requests` | Batched payout request records | `creator_id` | on / 1 | `/api/payouts/request` (service-role) |
| `creator_payouts` | Individual payout disbursement records | `creator_id` | on / 2 | `/api/payouts/request` (service-role) |
| `creator_revenue_shares` | Revenue share splits (e.g. co-creator arrangements) | `creator_id` | on / 1 | (unused/empty in v1) |
| `creator_subscription_orders` | DigiOne platform subscription purchase records | `creator_id` | on / 1 | (unused/empty in v1) |
| `email_events` | Email send/open/click event log | `creator_id` | on / 1 | automation service |
| `forms` | Lead-capture form definitions attached to sites | `site_id` → `sites.creator_id` | on / 2 | site builder |
| `guest_leads` | Anonymous visitor contact captures (pre-auth) | `site_id` → `sites.creator_id` | on / 1 | `/api/leads` (service-role) |
| `lead_form` | Individual lead submissions linked to a form | `form_id` → `forms` | on / 1 | `/api/leads` (service-role) |
| `linkinbio_analytics` | Page-view and click events for link-in-bio sites | `site_id` | on / 1 | `/api/linkinbio/track` (service-role) |
| `linkinbio_blocks` | Section blocks on a link-in-bio page | `page_id` → `linkinbio_pages` | on / 2 | site builder |
| `linkinbio_items` | Individual links/products within a block | `block_id` → `linkinbio_blocks` | on / 2 | site builder |
| `linkinbio_pages` | Root page record for a link-in-bio site | `site_id` | on / 2 | `/api/sites/create` (service-role) |
| `media_library` | Creator's uploaded media file catalogue | `creator_id` | on / 1 | `/api/upload` + dashboard media picker |
| `notifications` | In-app notifications for creators and buyers | `recipient_creator_id` | on / 2 | fulfillment service-role |
| `order_items` | Line items within an order | `order_id` → `orders` | on / 1 | `/api/checkout/create` (service-role) |
| `order_referrals` | Referral attribution rows linking orders to referral codes | `order_id` | on / 2 | `/api/checkout/create` (pending); fulfillment (settled) |
| `orders` | Master order record created at checkout | `creator_id` | on / 3 | `/api/checkout/create` (service-role); status by fulfillment + webhook |
| `payment_requests` | Payment-link site configuration (fixed or open amount) | — | on / 2 | site builder |
| `payment_submissions` | Individual payment-link submissions (buyer fills the form) | — | on / 1 | `/api/checkout/payment-link` (service-role) |
| `product_files` | Deliverable files uploaded for a product | `creator_id` | on / 1 | `/api/upload` + dashboard products |
| `product_licenses` | License key records for licensed products | — | on / 1 | (unused/empty in v1) |
| `product_view_events` | Storefront product page view tracking | — | on / 1 | storefront client (anon) |
| `products` | Creator product catalogue | `creator_id` | on / 3 | dashboard products page / `useProducts` hook |
| `profiles` | Creator profile (display name, avatar, slug, bio) | `user_id` → `users` | on / 3 | signup callback; `useProfile` hook |
| `public_images` | Platform-managed public image assets | — | on / 2 | admin / seed scripts |
| `rate_limits` | IP-keyed rate-limit counters for API routes | — | on / 0 | `check_rate_limit` RPC (service-role) — no RLS policies; only accessible via service role |
| `referral_codes` | Referral codes owned by creators or users | `owner_creator_id` | on / 2 | `useReferrals` hook |
| `service_bookings` | Bookings made against a creator service | `creator_id` | on / 2 | `useServices` hook |
| `services` | Creator-defined bookable services | `creator_id` | on / 2 | `useServices` hook |
| `site_design_tokens` | Per-site colour/typography/radius design tokens | `creator_id` | on / 2 | `/api/sites/create`; site builder |
| `site_main` | Main storefront site content config | `site_id` | on / 2 | `/api/sites/create`; site builder |
| `site_navigation` | Navigation items for a site | `site_id` | on / 2 | `/api/sites/create`; site builder |
| `site_page_views` | Aggregate page view counts per site | — | on / 1 | `/api/linkinbio/track` (service-role) |
| `site_product_assignments` | Products assigned to display on a store site | `site_id` | on / 2 | site builder |
| `site_sections_config` | Section layout configuration for a site | `site_id` | on / 2 | `/api/sites/create`; site builder |
| `site_singlepage` | Single-page sales site content and linked product | `site_id` | on / 2 | `/api/sites/create`; site builder |
| `site_templates` | Predefined site templates | — | on / 1 | admin / seed scripts |
| `sites` | Root site record (type: main/single/linkinbio/payment) | `creator_id` | on / 3 | `/api/sites/create` (service-role) |
| `storage_file_usages` | Tracks where a storage file is referenced | `file_id` → `storage_files` | on / 1 | `/api/upload` |
| `storage_files` | Storage object metadata (bucket + path + mime + size) | `owner_creator_id` | on / 1 | `/api/upload` (service-role) |
| `subscription_plans` | DigiOne platform subscription plan definitions | — | on / 1 | admin / seed scripts |
| `subscriptions` | Creator's active DigiOne platform subscription | `creator_id` | on / 1 | (unused/empty in v1) |
| `transaction_ledger` | Immutable financial event log; UNIQUE on `record_hash` | `creator_id` | on / 2 | fulfillment service-role only |
| `upsell_pages` | Upsell funnel pages linked to a primary product | `creator_id` | on / 2 | `useUpsellPages` hook |
| `user_carts` | Buyer shopping cart items | `user_id` | on / 1 | `useCart` hook |
| `user_product_access` | Durable buyer access grants (one row per order+product) | `user_id` | on / 1 | fulfillment service-role (`upsert` on conflict `order_id,product_id`) |
| `user_referrals` | Buyer-side referral tracking (invited users) | `user_id` | on / 1 | `useReferrals` hook |
| `user_roles` | Explicit role assignments for users | `user_id` | on / 1 | admin |
| `user_wallet_transactions` | Wallet credit/debit events | `user_id` | on / 1 | (unused/empty in v1) |
| `user_wallets` | Buyer wallet balance | `user_id` | on / 1 | (unused/empty in v1) |
| `user_wishlist` | Buyer product wishlist | `user_id` | on / 1 | (unused/empty in v1) |
| `users` | Mirror of `auth.users`; bridged by `auth_provider_id` | `id` (auth.uid()) | on / 3 | Supabase Auth trigger |

---

## Revenue tables — special rules

The following tables must **only be written via service-role API routes**. Never write to them from client components or using the anon/cookie Supabase client.

| Table | Reason |
|---|---|
| `orders` | Source of truth for payment state; written by `/api/checkout/create` and flipped by fulfillment |
| `creator_balances` | Financial aggregate; only modified via `credit_creator_balance` RPC or `/api/payouts/request` |
| `transaction_ledger` | Immutable audit log; UNIQUE `record_hash` prevents replays |
| `creator_payouts` | Payout record; written by `/api/payouts/request` after KYC + balance checks |

## Tables with 0 RLS policies

`rate_limits` has RLS enabled but no policies. This is intentional: only the `check_rate_limit` RPC (which runs as `SECURITY DEFINER`) touches it. Direct table access via any key other than service-role is blocked.
