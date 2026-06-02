---
noteId: "693537005df211f1a1752dcb7411a93a"
tags: []

---

# DigiOne — RLS Policy Reference

Complete, documented Row Level Security design for every `public` table.
Implemented by [`migrations/20260602000000_rls_policies.sql`](../migrations/20260602000000_rls_policies.sql).
Validated against PostgreSQL 18 (load + behavioral isolation test) on 2026-06-02.

> Mirrors [.claude/rules/security-model.md](../../.claude/rules/security-model.md).
> Before this migration the live DB had RLS on only `public_images` — see
> [INVENTORY.md](./INVENTORY.md) → RLS gap.

---

## Core model

```
auth.uid()  =  public.users.id  =  public.profiles.user_id
                                    public.profiles.id  ==  «creator_id» everywhere
```

Every owner check resolves through one helper:

```sql
public.current_profile_id()  -- STABLE SECURITY DEFINER
  → select id from profiles where user_id = auth.uid()
```

`SECURITY DEFINER` lets it read `profiles` without tripping that table's own RLS,
and avoids recursive policy evaluation.

### Roles
| Role | Meaning | RLS |
|---|---|---|
| `anon` | logged-out visitor (browser, anon key) | enforced |
| `authenticated` | logged-in user (browser, anon key + JWT) | enforced |
| `service_role` | server API routes (service key) | **bypassed** — no policy can block it |

Because `service_role` bypasses RLS, **revenue writes need no INSERT/UPDATE policy**:
they happen in `/api/*` routes via the service client. We only write *read* policies
for those tables.

---

## Access patterns (the 6 shapes)

| Pattern | SELECT | Write | Used by |
|---|---|---|---|
| **A. Owner-only** | own rows | own rows (all) | coupons, media_library, product_files, creator_payout_methods |
| **B. Owner read-only** | own rows | service-role only | creator_balances, transaction_ledger, creator_payouts, creator_revenue_shares, subscriptions, creator_subscription_orders |
| **C. Public-read + owner-write** | anon: published/active · owner: all | owner | products, sites, services, upsell_pages, site children |
| **D. Public-read reference** | everyone | service-role only | public_images, subscription_plans, site_templates |
| **E. Buyer-owned** | own (user_id = auth.uid()) | own | user_carts, user_wishlist, wallets, product_licenses |
| **F. Via-parent** | resolve ownership through a FK join | through parent | order_items, linkinbio_blocks/items, leads, analytics |

---

## Per-table policy table

### Identity
| Table | SELECT | INSERT/UPDATE/DELETE | Notes |
|---|---|---|---|
| `users` | own (`id = auth.uid()`) | UPDATE own | insert via signup trigger |
| `profiles` | **anon: all** | UPDATE own | storefronts show creator name/avatar |
| `user_roles` | own | — (service-role) | |

### Revenue (Pattern B — read-only own, writes service-role)
| Table | SELECT |
|---|---|
| `creator_balances` | `creator_id = current_profile_id()` |
| `transaction_ledger` | `creator_id = current_profile_id()` |
| `creator_revenue_shares` | `creator_id = current_profile_id()` |
| `creator_payouts` | `creator_id = current_profile_id()` |
| `creator_payout_requests` | `creator_id = current_profile_id()` |
| `creator_payout_request_items` | via parent `creator_payout_requests` |
| `creator_subscription_orders` | `creator_id = current_profile_id()` |
| `subscriptions` | `creator_id = current_profile_id()` |

### Revenue exceptions (client writes allowed where the app does so)
| Table | Policy |
|---|---|
| `creator_payout_methods` | Pattern A — owner manages own (add/edit bank/UPI) |
| `creator_kyc` | SELECT/INSERT/UPDATE own (app upserts KYC client-side) |

### Orders
| Table | SELECT | Notes |
|---|---|---|
| `orders` | buyer (`user_id = auth.uid()`) OR creator (`creator_id = current_profile_id()`) | writes service-role |
| `order_items` | via parent `orders` (buyer or creator) | |
| `order_referrals` | `referrer_creator_id = current_profile_id()` | |
| `product_licenses` | buyer (`user_id = auth.uid()`) | |

### Buyer account (Pattern E)
| Table | Access |
|---|---|
| `user_carts`, `user_wishlist` | ALL own |
| `user_product_access`, `user_wallets`, `user_wallet_transactions` | SELECT own |
| `user_referrals` | SELECT where referrer is me (user or creator) |

### Catalog (Pattern C)
| Table | anon SELECT | owner |
|---|---|---|
| `products` | `is_published AND deleted_at IS NULL` | ALL own |
| `product_files` | — (owner only) | ALL own |
| `upsell_pages` | all | ALL own |
| `media_library` | — (owner only) | ALL own |

### Sites + children (Pattern C / F)
| Table | anon SELECT | owner write |
|---|---|---|
| `sites` | `is_active AND deleted_at IS NULL` | ALL own (`creator_id`) |
| `site_design_tokens` | all (theme needed for preview) | ALL own (`creator_id`) |
| `site_main`, `site_singlepage`, `site_navigation`, `site_sections_config`, `site_product_assignments`, `payment_requests`, `forms`, `linkinbio_pages` | all | via parent `sites.creator_id` |
| `linkinbio_blocks` | all | via page → site |
| `linkinbio_items` | all | via block → page → site |
| `payment_submissions` | — | creator reads via request → site; insert service-role |

### Marketing
| Table | SELECT | Write |
|---|---|---|
| `coupons` | owner only | owner (Pattern A) · public validation is service-role |
| `affiliates` | creator OR affiliate_user | creator manages |
| `referral_codes` | owner (creator or user) | owner |
| `services` | anon: `is_active` | owner |
| `service_bookings` | creator own | creator UPDATE · insert service-role |
| `community_posts`, `community_reactions` | anon: all | author manages own |

### Capture / analytics (Pattern F — read via site, insert service-role)
| Table | SELECT |
|---|---|
| `guest_leads`, `lead_form` | via `sites.creator_id` |
| `conversion_events`, `product_view_events`, `site_page_views` | via `sites.creator_id` |

### Notifications / email / storage meta
| Table | SELECT | Write |
|---|---|---|
| `notifications` | recipient (user or creator) | UPDATE own (mark read) |
| `email_events` | recipient (user or creator) | service-role |
| `storage_files` | owner (user or creator) | service-role |
| `storage_file_usages` | via parent `storage_files` | service-role |

### Reference (Pattern D)
| Table | SELECT | Write |
|---|---|---|
| `public_images`, `subscription_plans`, `site_templates` | everyone | service-role only |

---

## ⚠️ Production prerequisites (the test surfaced these)

RLS policies are necessary but **not sufficient** — the role must also hold base
GRANTs. On a standard Supabase project these exist by default:

```sql
grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth   to anon, authenticated, service_role;  -- for auth.uid()
grant select, insert, update, delete on all tables in schema public
  to anon, authenticated;   -- RLS then narrows what's actually visible
```

If you ever see `permission denied for table X` (instead of empty results), it's a
**missing GRANT**, not a policy problem. Supabase applies these automatically; a
hand-built/restored DB may not — re-apply the grants above.

---

## Validation performed (2026-06-02)

Loaded baseline + this migration into a throwaway PostgreSQL 18 cluster with a
Supabase-shaped shim (auth schema, `auth.uid()`, 3 roles, default grants), seeded
two creators, and asserted:

| Check | Expected | Got |
|---|---|---|
| anon reads products | 2 published (drafts hidden) | ✅ 2 |
| anon reads creator_balances | denied / 0 rows | ✅ 0 |
| creator A sees own balance | 500 | ✅ 500 |
| creator A sees own balances count | 1 (not B's) | ✅ 1 |
| creator A sees own order | 1 | ✅ 1 |
| creator A sees products | 3 (2 own + B's published) | ✅ 3 |
| creator B sees own balance | 999 | ✅ 999 |
| cross-creator balance leak | none | ✅ none |

Re-run this on a throwaway **Supabase** project before prod — see
[RLS-TEST-CHECKLIST.md](./RLS-TEST-CHECKLIST.md).
