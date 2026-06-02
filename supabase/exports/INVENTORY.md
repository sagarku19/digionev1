---
noteId: "2923eaf05df011f1a1752dcb7411a93a"
tags: []

---

# Supabase Live DB Inventory

**Project ref:** `qcendfisvyjnwmefruba`
**Snapshot date:** 2026-06-02
**Source DB version:** PostgreSQL 17.6 (dumped with pg_dump 18.3)
**Connection used:** direct host `db.qcendfisvyjnwmefruba.supabase.co:5432` (the pooler hangs)

This is a complete read-only audit of everything in the live database, used to build
the reproducible baseline. If a future audit disagrees with these numbers, the DB
drifted — regenerate the baseline (see [REBUILD.md](../REBUILD.md)).

---

## Schemas present

| Schema | Owner | Notes |
|---|---|---|
| `public` | app | **All DigiOne tables.** 59 tables, captured in baseline. |
| `auth` | Supabase | Managed by Supabase. **2 app triggers bind here** (see below). |
| `storage` | Supabase | Managed by Supabase. 3 buckets + 11 RLS policies are ours. |
| `extensions` | Supabase | Hosts pgcrypto, uuid-ossp, pg_stat_statements. |
| `graphql`, `graphql_public` | Supabase | Auto-managed. Nothing to recreate. |
| `realtime` | Supabase | Auto-managed. Nothing to recreate. |
| `vault` | Supabase | supabase_vault extension. Nothing of ours stored. |

**Takeaway:** only `public` (full), plus a thin slice of `storage` and `auth`, are ours
to recreate. Everything else comes free with any new Supabase project.

---

## public schema — counts

| Object | Count | Where it's captured |
|---|---|---|
| Tables (BASE TABLE) | 59 | `migrations/00000000000000_baseline.sql` |
| Enums (types) | 21 | baseline |
| Functions | 6 | baseline |
| Triggers (on public tables) | 4 | baseline |
| Indexes | 55 (141 incl. PK/unique constraint indexes) | baseline |
| Sequences | 1 (`transaction_ledger_id_seq`) | baseline |
| Views / materialized views | 0 | — |
| RLS policies | **at snapshot: 1** (`public_images`). **Now: all 59 tables** | `migrations/20260602000000_rls_policies.sql` |

### Enums (21)
`ab_test_status, builder_asset_type, content_status, conversion_event_type,
device_type, discount_type, font_source_type, kyc_status, layout_role_type,
offer_type, order_status, page_block_type, page_type, payout_status, payout_type,
product_relation_type, site_section_type, storage_provider_type,
subscription_plan_type, user_role_type, wallet_direction`

### Functions (6)
| Function | Purpose | Bound to |
|---|---|---|
| `handle_new_user()` | Creates `public.users` + `public.profiles` on signup | **trigger on `auth.users`** |
| `handle_user_email_confirmed()` | Flips `is_verified` / `email_verified` on confirm | **trigger on `auth.users`** |
| `update_product_search_vector()` | Maintains `products.search_vector` | trigger on `public.products` |
| `update_blog_post_search_vector()` | Blog search vector (no bound trigger live) | — |
| `update_updated_at_column()` | Generic `updated_at` touch | linkinbio_* triggers |
| `update_projects_updated_at_column()` | `updated_at` touch (no bound trigger live) | — |

### Triggers
| Table | Trigger | Function |
|---|---|---|
| `auth.users` | `on_auth_user_created` | `handle_new_user` |
| `auth.users` | `on_auth_user_updated` | `handle_user_email_confirmed` |
| `public.products` | `trg_product_search_vector` | `update_product_search_vector` |
| `public.linkinbio_blocks` | `update_linkinbio_blocks_updated_at` | `update_updated_at_column` |
| `public.linkinbio_items` | `update_linkinbio_items_updated_at` | `update_updated_at_column` |
| `public.linkinbio_pages` | `update_linkinbio_pages_updated_at` | `update_updated_at_column` |

> ⚠️ The two `auth.users` triggers are **outside** the public-schema dump. They are
> recreated in `exports/storage-and-auth.sql`. Forget them = signup silently fails
> to create profile rows.

---

## Extensions

| Extension | Version | Schema |
|---|---|---|
| `pgcrypto` | 1.3 | extensions |
| `uuid-ossp` | 1.1 | extensions |
| `pg_stat_statements` | 1.11 | extensions |
| `supabase_vault` | 0.3.1 | vault |
| `plpgsql` | 1.0 | pg_catalog |

All are present by default on Supabase or enabled in the baseline. `pgcrypto` is
re-enabled by the autodm migration too.

---

## Storage

| Bucket | Public | Size limit | MIME allow-list |
|---|---|---|---|
| `public-asset` | yes | 5 MB | any |
| `uploads` | yes | none | any |
| `user_files` | yes | none | any |

**11 RLS policies on `storage.objects`** — captured in `exports/storage-and-auth.sql`
and `exports/rls-policies.txt`.

---

## Row counts (data that exists today)

Tables with data — useful to know what you'd lose on a reset, and what to seed.

| Table | Rows | Seeded? |
|---|---:|---|
| order_items | 14 | no (transactional) |
| orders | 14 | no (transactional) |
| site_design_tokens | 14 | no (per-creator) |
| site_navigation | 14 | no (per-creator) |
| site_sections_config | 11 | no (per-creator) |
| **public_images** | **10** | **yes → seed.sql** |
| sites | 10 | no (per-creator) |
| linkinbio_blocks | 7 | no |
| products | 6 | no |
| linkinbio_items | 5 | no |
| site_main | 5 | no |
| profiles | 4 | no (user data) |
| site_singlepage | 4 | no |
| users | 4 | no (user data) |
| **subscription_plans** | **3** | **yes → seed.sql** |
| upsell_pages | 3 | no |
| lead_form, payment_submissions | 2 each | no |
| coupons, creator_kyc, forms, linkinbio_pages, payment_requests, referral_codes, services, site_product_assignments | 1 each | no |
| (39 other tables) | 0 | — |

Total: 59 public tables. Only **2 tables hold reference data** worth seeding;
everything else is user/transactional and intentionally left empty on a fresh DB.

---

## Reconciliation: existing migrations vs live DB

| Migration | Status vs live DB | Action |
|---|---|---|
| `20260416_marketing_tables.sql` | **APPLIED** — community_posts, community_reactions, services, service_bookings all live | Folded into baseline. Kept for history (no-op, `IF NOT EXISTS`). |
| `20260418_insta_autodm.sql` | **NOT APPLIED** — zero `insta_*` tables/types in live DB | Keep as a separate migration to run *after* baseline. Already idempotent. |

---

## Surprising / worth knowing

1. **RLS was effectively off at snapshot** (only `public_images`), despite
   `security-model.md` claiming ~20 protected tables. **Closed 2026-06-02** by
   `migrations/20260602000000_rls_policies.sql` (all 59 tables). Design in
   [RLS-POLICIES.md](./RLS-POLICIES.md); verify before prod via
   [RLS-TEST-CHECKLIST.md](./RLS-TEST-CHECKLIST.md).
2. **`insta_autodm` migration was never run** — the Instagram auto-DM feature schema
   does not exist in prod.
3. **`site_templates` is empty** despite being a "template" table — nothing to seed.
4. **One `public_images` seed row points at the OLD project's storage URL**
   (`qcendfisvyjnwmefruba.supabase.co/.../supaimg-1.jpeg`). On a new project that
   image 404s until re-uploaded. The other 9 are external Unsplash URLs and are fine.
5. **Generated column:** `storage_files.public_url` is `GENERATED ALWAYS AS (cdn_url)`.
   Preserved in baseline.
