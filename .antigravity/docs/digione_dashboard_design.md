# DigiOne — Creator Dashboard Design Specification

> Complete UI/UX specification for the creator-facing dashboard.  
> Stack: Next.js 15, React 19, TypeScript, Tailwind CSS v4, Framer Motion, Supabase, Shadcn UI.  
> All routes are under `/dashboard/*` and require `role = 'creator'` authentication.

---

## Table of Contents

1. [Design System](#1-design-system)
2. [Sidebar Navigation](#2-sidebar-navigation)
3. [Page: Home](#3-page-home)
4. [Page: Analytics](#4-page-analytics)
5. [Page: Notifications](#5-page-notifications)
6. [Page: My Stores](#6-page-my-stores)
7. [Page: Products](#7-page-products)
8. [Page: Orders](#8-page-orders)
9. [Page: Payment Links](#9-page-payment-links)
10. [Page: Blog](#10-page-blog)
11. [Page: Site Customizer](#11-page-site-customizer)
12. [Page: Visual Builder](#12-page-visual-builder)
13. [Page: Media Library](#13-page-media-library)
14. [Page: Earnings](#14-page-earnings)
15. [Page: Payouts](#15-page-payouts)
16. [Page: KYC & Compliance](#16-page-kyc--compliance)
17. [Page: Transaction Ledger](#17-page-transaction-ledger)
18. [Page: Coupons](#18-page-coupons)
19. [Page: Referrals](#19-page-referrals)
20. [Page: Affiliates](#20-page-affiliates)
21. [Page: A/B Tests](#21-page-ab-tests)
22. [Page: Guest Leads](#22-page-guest-leads)
23. [Page: Plan & Billing](#23-page-plan--billing)
24. [Page: API & Rate Limits](#24-page-api--rate-limits)
25. [Page: Support](#25-page-support)
26. [Page: Profile & Settings](#26-page-profile--settings)
27. [Component Library](#27-component-library)
28. [Data Fetching Patterns](#28-data-fetching-patterns)

---

## 1. Design System

### Colour Tokens

```css
/* Brand */
--color-brand:          #6366F1;   /* Indigo 500 — primary actions */
--color-brand-hover:    #4F46E5;   /* Indigo 600 */
--color-brand-subtle:   rgba(99,102,241,0.10);
--color-brand-border:   rgba(99,102,241,0.30);

/* Semantic */
--color-success:        #10B981;   /* Emerald 500 */
--color-success-subtle: rgba(16,185,129,0.10);
--color-warning:        #F59E0B;   /* Amber 500 */
--color-warning-subtle: rgba(245,158,11,0.10);
--color-danger:         #EF4444;   /* Red 500 */
--color-danger-subtle:  rgba(239,68,68,0.10);

/* Neutrals (light mode) */
--color-bg:             #FFFFFF;
--color-bg-2:           #F8FAFC;   /* Sidebar, card backgrounds */
--color-bg-3:           #F1F5F9;   /* Input fills, hover states */
--color-border:         #E2E8F0;
--color-border-strong:  #CBD5E1;
--color-text:           #0F172A;
--color-text-2:         #475569;
--color-text-3:         #94A3B8;
```

### Typography

| Element | Size | Weight | Usage |
|---------|------|--------|-------|
| Page title | 22px | 500 | H1 on each page |
| Section heading | 16px | 500 | Card titles, sub-sections |
| Body | 14px | 400 | Tables, descriptions |
| Label | 12px | 500 | Form labels, column headers |
| Caption | 11px | 400 | Timestamps, meta info |

### Spacing Scale

Base unit = 4px. Use multiples: 4, 8, 12, 16, 20, 24, 32, 40, 48.

### Layout

- **Sidebar width:** 240px fixed, collapsible to 60px on mobile
- **Content area:** `calc(100vw - 240px)`, max-width 1200px, centered padding 24px
- **Top bar height:** 56px
- **Card border-radius:** 12px
- **Input border-radius:** 8px
- **Button border-radius:** 8px

---

## 2. Sidebar Navigation

**Route prefix:** `/dashboard`  
**Schema tables read:** `profiles`, `creator_balances`, `creator_kyc`, `subscriptions`, `notifications`

### Layout Structure

```
┌─────────────────────────────────┐
│  CREATOR CARD                   │  ← profiles + subscriptions
│  Avatar · Name · Plan badge     │
│  Pending payout · Total earned  │  ← creator_balances
│  KYC status banner              │  ← creator_kyc.status
├─────────────────────────────────┤
│  NAV SECTIONS (scrollable)      │
│                                 │
│  OVERVIEW                       │
│    Home                         │
│    Analytics                    │
│    Notifications  [6 unread]    │  ← notifications.is_read count
│                                 │
│  STORE                          │
│    My stores       ▸ expand     │  ← sites (by creator_id)
│      └ Main store               │
│      └ Figma Course             │
│      └ Mentorship               │
│      └ + New site               │
│    Products        ▸ expand     │  ← products
│      └ All products             │
│      └ Bundles                  │  ← product_bundles
│      └ Product files            │  ← product_files
│      └ Licenses                 │  ← product_licenses
│      └ Reviews                  │  ← product_ratings
│    Orders          [10]         │  ← orders count
│    Payment links   [3]          │  ← payment_requests count
│    Blog                         │  ← blog_posts
│                                 │
│  BUILDER                        │
│    Site customizer              │  ← site_sections_config
│    Visual builder  ▸ expand     │  ← projects > pages
│      └ Landing pages            │
│      └ Saved components         │  ← saved_components
│      └ Page templates           │  ← page_templates
│    Media library                │  ← media_library
│                                 │
│  MONEY                          │
│    Earnings        [₹1,772 due] │  ← creator_balances.pending_payout
│    Payouts                      │  ← creator_payout_requests
│    KYC & compliance             │  ← creator_kyc
│    Transaction ledger           │  ← transaction_ledger
│                                 │
│  MARKETING                      │
│    Coupons                      │  ← coupons
│    Referrals                    │  ← referral_codes + user_referrals
│    Affiliates                   │  ← affiliates
│    A/B tests                    │  ← site_ab_tests
│    Guest leads                  │  ← guest_leads
│                                 │
│  ACCOUNT                        │
│    Plan & billing               │  ← subscriptions + subscription_plans
│    API & rate limits            │  ← api_rate_limits
│    Support         [1 open]     │  ← support_tickets count
│                                 │
├─────────────────────────────────┤
│  Profile & settings             │  ← profiles + users
│  Log out                        │
└─────────────────────────────────┘
```

### Creator Card (top of sidebar)

- **Avatar:** `profiles.avatar_url` — circular, 34px, initials fallback
- **Name:** `profiles.full_name`
- **Plan badge:** `subscription_plans.plan_name` from active `subscriptions` row — indigo pill with star icon
- **Pending payout:** `creator_balances.pending_payout` — green text
- **Total earned:** `creator_balances.total_earnings` — muted text
- **KYC banner:**
  - `creator_kyc.status = 'verified'` → green banner "KYC verified"
  - `creator_kyc.status = 'pending'` → amber banner "Complete KYC to enable payouts" → links to `/dashboard/kyc`
  - `creator_kyc.status = 'rejected'` → red banner "KYC rejected — resubmit" → links to `/dashboard/kyc`
  - No KYC row → amber banner "KYC required"

### Nav Item States

- **Default:** 13px text, `--color-text-2`, 16px icon
- **Active:** left border 2px `--color-brand`, `--color-brand-subtle` background, `--color-brand` text
- **Hover:** `--color-bg-3` background
- **Unread badge:** right-aligned pill — red for urgent (refunds, KYC), indigo for counts, green for money
- **Expandable:** chevron rotates 90° on open; sub-items indent 26px, 12px text

---

## 3. Page: Home

**Route:** `/dashboard`  
**Schema tables:** `creator_balances`, `orders`, `products`, `creator_revenue_shares`, `notifications`, `site_page_views`, `conversion_events`

### Top Bar

- **Left:** "Home" title + "Welcome back, {first_name}"
- **Right:** Notification bell (unread count badge) + "New product" primary button → opens product create modal

### Stats Row (4 cards)

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Total earned │ │ This month   │ │ Orders       │ │ Products live│
│ ₹5,272       │ │ ₹1,899       │ │ 10           │ │ 3            │
│ All time     │ │ vs ₹999 last │ │ 4 completed  │ │ 1 draft      │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

Data sources:
- `creator_balances.total_earnings`
- `creator_revenue_shares` SUM for current month
- `orders` COUNT + status breakdown
- `products` COUNT where `is_published = true / false`

### Revenue Chart (line chart — 30 days)

- X-axis: last 30 days
- Y-axis: daily earnings in ₹
- Data: `creator_revenue_shares.creator_earnings_amount` grouped by `created_at::date`
- Tooltip: date, amount, order count

### Recent Orders Table (5 rows)

Columns: Order ID (gateway_order_id) | Buyer | Product | Amount | Status | Time

Data: `orders JOIN order_items JOIN products` latest 5 by `orders.created_at`

Status pills:
- `completed` → green
- `pending` → amber
- `failed` → red
- `refunded` → slate
- `cancelled` → gray

### Top Products by Revenue (horizontal bar)

Data: `creator_revenue_shares` GROUP BY `product_id` → JOIN `products.name`  
Shows top 4 products with ₹ amounts and percentage bars.

### Pending Actions Panel

Surfaces critical items needing attention:
- Unread refund requests: `notifications WHERE type='refund' AND is_read=false`
- KYC status if not verified: `creator_kyc.status != 'verified'`
- Pending payout available: `creator_balances.pending_payout > 0` and `creator_kyc.status = 'verified'`
- Draft products: `products WHERE is_published = false`
- Open support tickets: `support_tickets WHERE status IN ('open','in_progress')`

### Quick Links Row

Six icon buttons: New product · New site · View orders · Request payout · Add coupon · View analytics

---

## 4. Page: Analytics

**Route:** `/dashboard/analytics`  
**Schema tables:** `site_page_views`, `product_view_events`, `conversion_events`, `orders`, `creator_revenue_shares`

### Date Range Picker

Preset options: Today · Last 7 days · Last 30 days · Last 90 days · Custom range  
Defaults to Last 30 days on load.

### Overview Metrics Row (6 stats)

```
Total views | Unique sessions | Product views | Add-to-cart | Purchases | Conversion rate
13          | 11              | 7             | 3           | 6         | 54.5%
```

Data:
- `site_page_views` COUNT in range
- Unique by `session_id`
- `product_view_events` COUNT
- `conversion_events WHERE event_type='add_to_cart'`
- `conversion_events WHERE event_type='purchase'`
- Conversion rate = purchases / unique sessions × 100

### Revenue Over Time (area chart)

- `creator_revenue_shares` grouped by day
- Stacked by product if toggled

### Traffic Sources (doughnut chart)

`site_page_views.utm_source` — Google / Instagram / YouTube / Direct / Other  
Each slice clickable to filter table below.

### Top Pages Table

`site_page_views` GROUP BY `page_slug` — columns: Page slug · Views · Unique sessions · Avg time

### Device Breakdown (3 stat cards)

`site_page_views.device_type` — Desktop / Mobile / Tablet  
Shows % share with small bar indicator.

### Conversion Funnel (horizontal funnel diagram)

```
Product views → Add to cart → Checkout start → Purchase
7               3              2                6
               43%             66%             300%
```

Data: `product_view_events` → `conversion_events` by event_type

### UTM Campaigns Table

`site_page_views` GROUP BY `utm_source`, `utm_medium`, `utm_campaign`  
Columns: Source · Medium · Campaign · Sessions · Conversions · Revenue

### Product Performance Table

JOIN `product_view_events + conversion_events + creator_revenue_shares`  
Columns: Product · Views · Purchases · Revenue · Conversion %

---

## 5. Page: Notifications

**Route:** `/dashboard/notifications`  
**Schema table:** `notifications` (WHERE `recipient_creator_id = auth_profile_id()`)

### Filter Tabs

All · Sales · Payouts · Reviews · Refunds · KYC · Orders

### Notification Item Structure

Each row contains:
- **Unread dot** (left edge, indigo, hidden when `is_read = true`)
- **Type icon** (36px rounded square, colour-coded):
  - `sale` → green background 🎉
  - `refund` → red background 🔄
  - `payout` → indigo background 💸
  - `review` → amber background ⭐
  - `kyc_reminder` → amber background 🔔
  - `kyc_rejected` → red background ❌
  - `order` → green background ✅
  - `wallet` → indigo background 💰
- **Title** (`notifications.title`) — bold when unread
- **Message** (`notifications.message`) — single line, truncated
- **Timestamp** (`notifications.created_at`) — relative: "2 days ago"
- **Action link** mapped from `notifications.action_url`:
  - `/dashboard/orders` → "View orders"
  - `/dashboard/payouts` → "View payouts"
  - `/dashboard/reviews` → "View review"
  - `/dashboard/kyc` → "Complete KYC"

### Bulk Actions

- "Mark all read" — UPDATE `notifications SET is_read = true WHERE recipient_creator_id = ?`
- Checkbox multi-select → "Mark selected read" | "Delete selected"

### Real-time Updates

Subscribe to Supabase `notifications` table INSERT events filtered by `recipient_creator_id`.  
New notifications slide in at top with a brief highlight animation.

---

## 6. Page: My Stores

**Route:** `/dashboard/sites`  
**Schema tables:** `sites`, `site_main`, `site_singlepage`, `site_blog`, `site_product_assignments`

### Store Cards Grid

One card per `sites` row for this creator. Card contains:

```
┌────────────────────────────────────────┐
│ [site_type badge]  [ssl_status badge]  │
│                                        │
│ Store name (from site_main.title)      │
│ digione.ai/{slug}         [Live link]  │
│                                        │
│ Products: 3  |  Views: 1,240           │
│                                        │
│ [Customize]  [View live]  [···]        │
└────────────────────────────────────────┘
```

**Site type badges:**
- `main` → indigo "Main store"
- `single` → purple "Product page"
- `payment` → green "Payment link"
- `blog` → slate "Blog"

**SSL status badges:**
- `active` → green "SSL active"
- `pending` → amber "SSL pending"
- `none` → gray "No SSL"
- `failed` → red "SSL failed"

### Add New Site Flow

Button: "+ New site" → modal with 4 site type options  
Each option shows template previews from `site_templates` table.

### Store Quick Settings Drawer

Clicking a card opens a right drawer with tabs:
- **General:** title, description, logo, banner (from `site_main`)
- **Domain:** `sites.custom_domain`, `domain_verified`, `ssl_status`
- **SEO:** meta_keywords, meta_description (from `site_main`)
- **Social:** social_links jsonb editor (from `site_main`)
- **Legal:** legal_pages toggle set (from `site_main`)

---

## 7. Page: Products

**Route:** `/dashboard/products`  
**Schema tables:** `products`, `product_files`, `product_bundles`, `product_bundle_items`, `product_licenses`, `product_ratings`

### Toolbar

- **Search:** fulltext on `products.name`
- **Filter:** Category dropdown (Course / Ebook / Design Asset / Template / Photography) · Status (Published / Draft / All)
- **Sort:** Newest / Price high-low / Most sold
- **+ New product** (primary button)

### Product Table

Columns:

| Column | Source | Notes |
|--------|--------|-------|
| Thumbnail | `products.thumbnail_url` | 48×48 rounded |
| Name | `products.name` | + category badge |
| Price | `products.price` | ₹ formatted |
| Status | `products.is_published` | Green "Live" / Gray "Draft" |
| Sales | JOIN `order_items` COUNT | number sold |
| Revenue | JOIN `creator_revenue_shares` SUM | total earned |
| Files | JOIN `product_files` COUNT | "2 files" |
| Created | `products.created_at` | relative |
| Actions | — | Edit · Duplicate · Delete · View |

### Product Detail / Edit Page

**Route:** `/dashboard/products/[productId]`

Tabs:

**Details tab**
- Name (text input)
- Description (rich text editor)
- Price (`products.price`)
- Category (select)
- Thumbnail upload
- Gallery images (`products.images` jsonb array)
- Product link (`products.product_link`)
- Post-purchase URL (`products.post_purchase_url`)
- Post-purchase instructions (`products.post_purchase_instructions`)
- Publish toggle (`products.is_published`)
- Discover page toggle (`products.is_on_discover_page`)
- License toggle (`products.is_licensable`) → license type select

**Files tab**
- File list from `product_files` — label, type, size, version, download count, primary flag
- Upload new file → creates `storage_files` + `product_files` rows
- Drag to reorder

**Bundles tab**
- Shows `product_bundles` this product belongs to
- Create new bundle button → bundle editor (name, description, select products, bundle_price, compare_at_price)

**Reviews tab**
- `product_ratings` for this product
- Columns: Buyer · Rating (stars) · Title · Review text · Verified purchase · Approved · Date
- Toggle `is_approved` per review

**Related tab**
- `product_related` — upsell / cross-sell relationships
- Add product → select type (upsell / cross_sell / bundle)

**Assignments tab**
- `site_product_assignments` — which stores show this product
- Toggle visibility and placement (featured / front_main)

### New Product Modal / Page

Step wizard:
1. Product type (Course / Ebook / Design Asset / Template / Photography)
2. Basic details (name, price, description)
3. Upload files
4. Configure delivery (post-purchase URL or file link)
5. Publish settings

---

## 8. Page: Orders

**Route:** `/dashboard/orders`  
**Schema tables:** `orders`, `order_items`, `products`, `guest_leads`, `creator_revenue_shares`

### Summary Stats Row

```
All orders: 10 | Completed: 5 | Pending: 2 | Refunded: 1 | Failed: 2
```

### Orders Table

Columns:

| Column | Source |
|--------|--------|
| Order ID | `orders.gateway_order_id` (CF_ORD_001 style) |
| Buyer | `orders.customer_name` + `customer_email` |
| Product(s) | JOIN `order_items → products.name` |
| Amount | `orders.total_amount` |
| Status | `orders.status` colour-coded pill |
| Payment | `orders.payment_method` + `gateway_name` |
| Date | `orders.created_at` relative |
| Revenue | `creator_revenue_shares.creator_earnings_amount` |
| Actions | View · Refund (if completed) |

**Guest orders:** show "Guest" badge with `orders.guest_lead_id` linkable to guest leads page.

### Order Detail Drawer / Page

**Route:** `/dashboard/orders/[orderId]`

Sections:
- **Order summary:** ID, status, created_at, gateway_order_id, gateway_payment_id
- **Buyer info:** customer_name, customer_email, customer_phone; link to user profile if `user_id` not null
- **Items:** order_items list with product name, price_at_purchase, quantity
- **Revenue share:** gross_amount, platform_fee_percent, platform_fee_amount, creator_earnings_amount, status
- **Timeline:** created → payment → fulfilled → refunded (if applicable)
- **Actions:** Refund button (if status=completed) · Resend access email button

### Filters

Status · Date range · Payment method · Site (origin_site_id) · Search by buyer name/email

---

## 9. Page: Payment Links

**Route:** `/dashboard/payment-links`  
**Schema tables:** `payment_requests`, `payment_submissions`, `sites (type='payment')`

### Payment Link Cards

One card per `payment_requests` row:

```
┌──────────────────────────────────────────┐
│ 1-on-1 Mentorship — 60 min              │
│ digione.ai/arjun/mentorship/one-on-one  │
│                                          │
│ ₹2,500 fixed                            │
│ 3 submissions · ₹7,500 collected        │
│ Status: Active                          │
│                                         │
│ [Copy link]  [View submissions]  [Edit] │
└──────────────────────────────────────────┘
```

### Create Payment Link

Fields:
- Title (`payment_requests.title`)
- Description (`payment_requests.description`)
- Amount type: Fixed or flexible (`is_fixed_amount`)
- Amount (`payment_requests.amount`) — hidden if flexible
- Status (active/inactive)
- Payment site selector (`payment_requests.site_id`)

### Submissions Table

**Route:** `/dashboard/payment-links/[requestId]/submissions`

`payment_submissions` for this request:

| Customer name | Email | Phone | Amount | Status | Date | Gateway ID |
|---|---|---|---|---|---|---|

Status: `paid` (green) · `pending` (amber) · `failed` (red)

---

## 10. Page: Blog

**Route:** `/dashboard/blog`  
**Schema tables:** `blog_posts`, `site_blog`, `sites (type='blog')`

### Blog Post List

Toolbar: Search · Filter by site · Filter by status (Published / Draft) · + New post

Table columns:

| Column | Source |
|--------|--------|
| Title | `blog_posts.title` |
| Slug | `blog_posts.slug` |
| Site | `blog_posts.site_id` → `sites.child_slug` |
| Status | `blog_posts.is_published` pill |
| Access | `blog_posts.is_free` — "Free" or "Paid" pill |
| Gated product | `blog_posts.product_id` → product name if set |
| Views | `blog_posts.view_count` |
| Tags | `blog_posts.tags` array pills (first 3) |
| Published | `blog_posts.published_at` relative |
| Actions | Edit · View · Delete |

### Post Editor

**Route:** `/dashboard/blog/[postId]`

Left: Rich text editor (title, description, content HTML)  
Right panel:
- **Publish settings:** is_published toggle + published_at date picker
- **Access control:** is_free toggle → if false, product selector (`blog_posts.product_id`)
- **SEO:** slug (auto-generated), description
- **Media:** thumbnail_url picker from media_library
- **Video:** video_url, video_embed_url, video_source select
- **Tags:** multi-input (stored as `blog_posts.tags` text[])
- **Sort order:** drag position in blog listing

Search vector (`tsvector`) is auto-updated by database trigger on save — no frontend work needed.

---

## 11. Page: Site Customizer

**Route:** `/dashboard/sites/[siteId]/customize`  
**Schema tables:** `site_sections_config`, `site_design_tokens`, `site_navigation`, `site_theme_presets`, `site_ab_tests`, `sites`, `site_main`

### Layout: Three Panels

```
┌───────────────┬──────────────────────────┬────────────────────┐
│ LEFT (280px)  │   CENTER (flex-1)        │  RIGHT (360px)     │
│ Section tree  │   Live preview iframe    │  Section settings  │
│               │   + device toolbar       │  or Theme editor   │
└───────────────┴──────────────────────────┴────────────────────┘
```

### Left Panel: Section Tree

Shows `site_sections_config.sections` jsonb array as a draggable list.  
Each row: drag handle · section label · eye (visibility toggle) · expand arrow.

Section types available (from `site_section_type` enum):
`hero_banner`, `featured_products`, `product_grid`, `testimonials`, `about_creator`, `faq_accordion`, `countdown_timer`, `social_proof`, `email_capture`, `video_showcase`, `rich_text`, `image_gallery`, `product_comparison`, `pricing_table`, `announcement_bar`, `sticky_cta`, `trust_badges`, `custom_html`

"Add section" button → opens section library modal (icon + name grid).

### Center: Live Preview

iframe renders the actual storefront URL.  
Device toggle toolbar: Desktop (1280px) · Tablet (768px) · Mobile (390px).  
"View live" → opens new tab.

### Right Panel: Section Settings

Context-sensitive form per section type. Each section's `settings` is stored in the sections jsonb array item.

**hero_banner fields:**
- Heading text (rich text inline)
- Subheading text
- Background type (color / gradient / image / video) → colour picker or URL
- CTA label + href + style (primary / secondary / outline)
- Layout (centered / left-aligned / split)
- Overlay opacity slider (0–100)
- Min height (auto / 50vh / 75vh / 100vh)

**featured_products fields:**
- Section heading
- Product multi-select (from `products WHERE is_published=true`)
- Display style (grid / carousel / masonry)
- Columns (2 / 3 / 4)
- Show price toggle
- Show CTA toggle
- Card style (minimal / bordered / shadow)

**faq_accordion fields:**
- FAQ items: list editor (question + answer pairs), add/remove/reorder
- Default open index

**countdown_timer fields:**
- End date/time picker
- Heading above timer
- Post-countdown behaviour (hide / show message / redirect)

**testimonials fields:**
- Testimonials list (author, text, rating, avatar_url)
- Layout (grid / carousel / masonry)
- Show rating stars toggle

**Right Panel — Theme Editor Tab:**

Section 1 — Colors  
`site_design_tokens.color_palette` jsonb — 6 pickers: primary, secondary, accent, surface, text, muted

Section 2 — Typography  
`site_design_tokens.typography` jsonb — heading font (Google Fonts picker), body font, base_size_px slider (12–20), scale_ratio select (1.1–1.8)

Section 3 — Spacing  
`site_design_tokens.spacing_scale` jsonb — base_px selector (4 / 8 / 12)

Section 4 — Borders  
`site_design_tokens.border_radius_scale` jsonb — global border-radius slider (0–24px)

Section 5 — Presets  
`site_theme_presets` — grid of system presets (`is_system_preset=true`) + creator's own. Click to apply. "Save current as preset" → INSERT into `site_theme_presets`.

**Right Panel — Navigation Tab:**

`site_navigation` fields:
- Logo URL (image picker)
- Logo alt text
- Nav items (drag-reorder list — each: label, url, open_in_new toggle)
- Show cart icon toggle
- Show search toggle
- Sticky header toggle
- Footer bottom text
- Social links (Instagram, YouTube, Twitter, LinkedIn, etc.)

**Top Bar:**

- Store name (inline edit → `site_main.title`)
- Auto-save status ("Saved 2s ago" / "Saving...")
- Publish button → sets `sites.is_active = true`, refreshes iframe
- Undo / Redo (last 20 section config changes, stored in component state)

---

## 12. Page: Visual Builder

**Route:** `/dashboard/projects/[projectId]/builder`  
**Schema tables:** `projects`, `pages`, `page_blocks`, `page_block_media`, `page_versions`, `saved_components`, `page_edit_locks`, `builder_fonts`, `builder_assets`, `media_library`

### Layout: Three Panels

```
┌──────────────┬──────────────────────────────┬──────────────┐
│ LEFT (280px) │      CENTER CANVAS           │ RIGHT (320px)│
│ 5-tab sidebar│   Infinite canvas            │ 4-tab panel  │
└──────────────┴──────────────────────────────┴──────────────┘
```

### Left Sidebar — 5 Tabs

**Tab 1: Layers**
- Tree view of `page_blocks` hierarchy: section → row → column → block
- Each node: visibility toggle (`is_visible`), lock toggle (`is_locked`), rename on double-click (`display_name`)
- Drag to reorder (`sort_order`)
- Right-click: Duplicate · Delete · Wrap in section · Add above/below

**Tab 2: Add Blocks**  
Block categories (collapsible):
- Layout: Section, Row, 2-col, 3-col, 4-col, Grid
- Text: Heading, Paragraph, Rich text, List, Quote, Code block
- Media: Image, Video, Gallery, Lottie, Icon, SVG
- Interactive: Button, Link, Form, Input, Dropdown, Countdown, Tabs, Accordion, Modal trigger, Tooltip
- E-commerce: Product card, Product grid, Buy now, Price display, Cart button, Reviews
- Data: Table, Comparison table, Pricing table, Progress bar, Stat counter
- Embed: YouTube, Vimeo, Spotify, Twitter/X, Calendly, Google Maps, Custom HTML
- Creator: Bio card, Social links, Newsletter, Course outline, Product showcase

**Tab 3: Components**
- `saved_components` grid — name, thumbnail, tags
- Search by tag or category
- "Save selection as component" button
- Community toggle → `is_public = true` components from all creators

**Tab 4: Media Library**
- `media_library` browser — grid of images/videos/docs
- Upload button → `storage_files` + `media_library` INSERT
- Filter by `media_type` (image / video / document / other)
- `is_favorite` star toggle
- `usage_count` shown per file

**Tab 5: Pages**
- List of `pages` in this `project_id`
- Add page · Duplicate · Delete · Rename (`pages.name`)
- Set homepage (`pages.is_homepage = true`)
- Drag to reorder
- Settings icon → page SEO modal (`seo_title`, `seo_description`, `seo_keywords`, `slug`)

### Center Canvas

- Infinite canvas, zoom 25%–200% (zoom stored in component state)
- Pan: space+drag or middle mouse
- Device frames: Desktop / Laptop / Tablet / Mobile / Custom width
- Breakpoint ruler with indicators
- Grid overlay (8px, toggle on/off)
- Snap lines (show distance labels)
- Multi-select: shift+click or drag-select box
- Keyboard shortcuts:
  - `Delete` — remove selected
  - `Ctrl+D` — duplicate block
  - `Ctrl+G` — group selection
  - `Ctrl+Z / Ctrl+Shift+Z` — undo/redo
  - Arrow keys — nudge 1px; Shift+Arrow — nudge 10px

Block hover state: blue outline + block type tooltip  
Block selected: blue outline + resize handles on edges/corners  
Parent section: dashed outline + section label top-left

**Floating Canvas Toolbar (top-center):**  
Undo · Redo · Hand tool · Select tool · Add block (+) · Preview mode toggle · Device switcher · Zoom control (shows %)

**Edit Lock:** On enter, INSERT into `page_edit_locks` with `expires_at = NOW() + 5 min`. Refresh every 4 minutes while active. On exit, DELETE lock. If another user's lock exists → show read-only banner.

### Right Panel — 4 Tabs

**Tab 1: Content** — per-block context editor (see section 2.4 of PRD)

**Tab 2: Style** — layout, background, border, shadow, typography, effects, responsive overrides  
Breakpoint switcher (Desktop / Tablet / Mobile) at panel top.  
Responsive overrides stored in `page_blocks.padding` and `page_blocks.margin` jsonb.

**Tab 3: Animate** — entrance animation, hover state, parallax  
Live preview card plays animation on demand.

**Tab 4: Settings** — custom ID, CSS classes, scoped CSS (stored in `page_blocks.custom_css`), HTML attributes (`html_attributes` jsonb), visibility rules, semantic role.

### Top Bar

- `projects.name` / `pages.name` breadcrumb (both inline-editable)
- Left: Undo/Redo, History panel button
- Center: Device switcher tabs
- Right: Auto-save status · Share preview link · Publish dropdown (Publish / Schedule / Staging)
- Settings gear → Page SEO modal

### History Panel (slide-out from left)

`page_versions` list — timestamp, label, `is_autosave`, restore button.  
Manual save → prompt for label → INSERT `page_versions`.  
Autosave every 60s → INSERT with `is_autosave = true`.

---

## 13. Page: Media Library

**Route:** `/dashboard/media`  
**Schema tables:** `media_library`, `storage_files`, `storage_file_usages`

### Toolbar

- Search (`media_library.file_name`, `alt_text`, `tags`)
- Filter by `media_type` (All / Images / Videos / Documents / Other)
- Filter by `is_favorite`
- Sort: Newest / Largest / Most used (`usage_count`)
- Grid / List toggle
- Upload button

### Grid View

Each card:
- Thumbnail (`thumbnail_url` for images, type icon for others)
- File name (truncated)
- File size (`storage_files.size_bytes` human-formatted)
- Usage count (`media_library.usage_count` or `storage_file_usages` COUNT)
- Star toggle (`is_favorite`)
- On hover: Copy URL · Edit · Delete

### Detail Drawer

Opens on click:
- Full preview (image) or playback (video)
- **File name** (editable)
- **Alt text** (editable — `media_library.alt_text`)
- **Tags** (editable — `media_library.tags` text[])
- **Dimensions:** width × height (images only)
- **Duration:** `media_library.duration_seconds` (video only)
- **Storage URL** (copyable)
- **Used in:** `storage_file_usages` list — entity_type, entity_id, field_name
- **Uploaded:** `media_library.created_at`

### Upload

Supports: image/jpeg, image/png, image/webp, image/gif, video/mp4, application/pdf, application/zip, .fig, .sketch  
On upload:
1. Upload to Supabase Storage → `storage_files` INSERT
2. Create `media_library` row with extracted metadata (dimensions, type, size)
3. Generate thumbnail for images via edge function

---

## 14. Page: Earnings

**Route:** `/dashboard/earnings`  
**Schema tables:** `creator_balances`, `creator_revenue_shares`, `orders`, `order_items`, `products`, `subscriptions`

### Summary Cards Row

```
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│ Total earned     │ │ Platform fees    │ │ Total paid out   │ │ Pending payout   │
│ ₹5,272.15        │ │ ₹323.80          │ │ ₹3,500.00        │ │ ₹1,772.15        │
│ All time         │ │ 5% avg rate      │ │ 1 payout         │ │ Ready to request │
└──────────────────┘ └──────────────────┘ └──────────────────┘ └──────────────────┘
```

"Request payout" CTA button shown next to pending payout card (active only when KYC verified).

### Earnings by Product (table)

JOIN `creator_revenue_shares + products + order_items`

| Product | Units sold | Gross | Platform fee | Net earnings |
|---------|-----------|-------|-------------|--------------|
| Figma Masterclass 2024 | 2 | ₹3,998 | ₹199.90 | ₹3,798.10 |
| UI/UX Career Ebook | 1 | ₹499 | ₹24.95 | ₹474.05 |

### Revenue Share Detail Table

`creator_revenue_shares` full table:

| Order ID | Product | Buyer | Gross | Fee % | Fee | Net | Status | Date |
|----------|---------|-------|-------|-------|-----|-----|--------|------|

Status pills: `settled` (green) · `pending` (amber) · `refunded` (red)

### Monthly Revenue Chart (bar chart)

`creator_revenue_shares` grouped by month, showing gross vs net side by side.

### Platform Fee Explanation Banner

Shows current plan's fee rate from `subscriptions → subscription_plans.platform_fee_percent`.  
"Upgrade to Pro to reduce your platform fee from 7% to 5%" — shown only when relevant.

---

## 15. Page: Payouts

**Route:** `/dashboard/payouts`  
**Schema tables:** `creator_payout_requests`, `creator_payout_request_items`, `creator_payouts`, `creator_payout_methods`, `creator_balances`, `creator_kyc`

### Payout Balance Banner

```
Available for payout: ₹1,772.15        [Request payout]
KYC status: Verified  ·  Default method: UPI (arjun@ybl)
```

If KYC not verified → banner shows "Complete KYC to enable payouts" linking to `/dashboard/kyc`.

### Payout Request History Table

`creator_payout_requests`:

| Request ID | Amount | Method | Status | Submitted | Admin notes |
|------------|--------|--------|--------|-----------|-------------|

Status pills: `pending` (amber) · `approved` (blue) · `rejected` (red) · `processed` (green)

Click row → drawer showing `creator_payout_request_items` (which revenue shares were included).

### Payout Disbursement History

`creator_payouts`:

| Amount | Method | Gateway ID | Status | Processed |
|--------|--------|-----------|--------|-----------|

Status: `initiated` · `processed` · `failed`

### Payout Methods

`creator_payout_methods`:

Each method card:
- Type badge (UPI / Bank Transfer)
- UPI ID or masked account number + IFSC
- Default badge if `is_default = true`
- Verification status pill (`pending` / `verified` / `rejected`)
- Edit · Delete · Set as default actions

"Add payout method" button → modal with UPI or Bank Transfer tabs.

### Request Payout Modal

1. Shows available balance (`creator_balances.pending_payout`)
2. Select payout method (from verified `creator_payout_methods`)
3. Enter amount (max = pending_payout)
4. Confirm → INSERT `creator_payout_requests`

---

## 16. Page: KYC & Compliance

**Route:** `/dashboard/kyc`  
**Schema tables:** `creator_kyc`

### Status Banner

Full-width banner at top:
- `verified` → green "Your KYC is verified. Payouts enabled."
- `pending` → amber "KYC under review. We'll notify you within 2 business days."
- `rejected` → red "KYC rejected — {rejection reason}. Please resubmit."
- No row / `kyc_level = 'none'` → indigo "Complete KYC to enable payouts."

### KYC Progress Stepper

```
Step 1: PAN Verification    ✅ Verified
Step 2: Bank/UPI Linking    ✅ Verified
Step 3: Address Proof       ○ Pending
Step 4: Review              ○ Pending
```

Step completion based on:
- Step 1: `creator_kyc.pan_verified`
- Step 2: `creator_kyc.bank_verified OR upi_verified`
- Step 3: `creator_kyc.address_line1 NOT NULL`
- Step 4: `creator_kyc.status = 'verified'`

### PAN Verification Section

Fields:
- Full name (`creator_kyc.full_name`)
- Legal name as on PAN (`creator_kyc.legal_name`)
- PAN number (input → stored encrypted as `pan_enc`, last 4 shown as `pan_last4`)
- DOB (`creator_kyc.dob`)

Status: `pan_verified` boolean with `pan_verified_at` timestamp and `pan_verification_provider`.

### Bank Account Verification Section

Fields:
- Account holder name (`creator_kyc.bank_account_name`)
- Account number (stored encrypted as `bank_account_enc`, last 4 shown as `bank_last4`)
- IFSC code (`creator_kyc.ifsc_code`)

Status: `bank_verified` boolean.

### UPI Verification Section

- UPI ID input (stored encrypted as `upi_id_enc`)
- Send ₹1 verification payment → confirm

Status: `upi_verified` boolean with timestamp.

### Address Section

- Address line 1, line 2, city, state, country, PIN code
- From `creator_kyc` address fields

### KYC Level Badge

`kyc_level` values: `none` → `basic` → `full`  
Shown as progress indicator explaining payout limits at each level.

---

## 17. Page: Transaction Ledger

**Route:** `/dashboard/ledger`  
**Schema tables:** `transaction_ledger`

### Integrity Banner

```
🔒 All transactions are cryptographically signed with SHA-256.
   Record chain intact · Last verified: just now
```

Explain that `transaction_ledger.record_hash` is a SHA-256 of each record, and `prev_hash` chains them.

### Summary Cards

```
Total credits  |  Total debits  |  Net balance
₹5,272.15      |  ₹3,500.00     |  ₹1,772.15
```

Summed from `transaction_ledger WHERE creator_id = ?`

### Transactions Table

All `transaction_ledger` rows for this creator:

| # | Date | Type | Direction | Amount | Balance after | Order/Payout ref |
|---|------|------|-----------|--------|--------------|-----------------|

`tx_type` values and display:
- `sale_earning` → green credit "Sale earning"
- `payout` → red debit "Payout disbursement"
- `referral_reward` → green credit "Referral reward"
- `platform_fee` → red debit "Platform fee"
- `refund` → red debit "Refund"
- `cashback` → green credit "Cashback"

`direction`: `credit` (↑ green arrow) · `debit` (↓ red arrow)

Row click → drawer with full record including `record_hash` (hex string), `prev_hash`, and `meta` jsonb.

### Filters

Date range · Transaction type · Direction (credits only / debits only)

### Export

"Export CSV" button → downloads `transaction_ledger` filtered rows as CSV.

---

## 18. Page: Coupons

**Route:** `/dashboard/coupons`  
**Schema tables:** `coupons`

### Stats Row

```
Active coupons: 3  |  Total uses: 54  |  Revenue attributed: ₹18,240
```

### Coupon Table

| Code | Type | Value | Uses / Max | Valid until | Active | Actions |
|------|------|-------|------------|------------|--------|---------|
| ARJUN20 | % off | 20% | 14 / 200 | 30 days | ✅ | Edit · Pause · Delete |
| LAUNCH500 | ₹ off | ₹500 | 4 / 50 | 7 days | ✅ | Edit · Pause · Delete |
| SOLD100 | ₹ off | ₹100 | 10 / 10 | 30 days | ⏸ | — Maxed out |

Usage bar: `current_uses / max_uses` visual progress.

`discount_type` values from enum: `percentage` / `fixed`

### Create / Edit Coupon Modal

Fields:
- Code (`coupons.code` — UNIQUE per creator from `uq_coupons_creator_code`)
- Type (percentage / fixed amount)
- Value (number input)
- Max uses (`max_uses` — optional)
- Valid from / Valid until date pickers
- Active toggle
- Apply to specific products (future: product_id FK)

---

## 19. Page: Referrals

**Route:** `/dashboard/referrals`  
**Schema tables:** `referral_codes`, `user_referrals`, `order_referrals`

### My Referral Code Card

```
┌──────────────────────────────────────────┐
│ Your referral code                       │
│                                          │
│  REF-ARJUN-001                  [Copy]  │
│  digione.ai?ref=REF-ARJUN-001           │
│                                          │
│  Share: [WhatsApp] [Instagram] [Copy link]│
└──────────────────────────────────────────┘
```

Data: `referral_codes WHERE owner_creator_id = ?` — shows first active code.

### Referral Stats Row

```
Total referrals: 3  |  Rewarded: 1  |  Pending: 2  |  Commission earned: ₹199.90
```

### Referred Users Table

`user_referrals` for this creator's code:

| User | Joined | Status | Reward amount | Order |
|------|--------|--------|--------------|-------|

`reward_status`: `pending` · `rewarded`

### Order Referrals (commission earned)

`order_referrals`:

| Order | Buyer | Product | Commission | Status | Date |
|-------|-------|---------|-----------|--------|------|

`status`: `pending` · `settled`

---

## 20. Page: Affiliates

**Route:** `/dashboard/affiliates`  
**Schema tables:** `affiliates`

### Affiliates Table

| Affiliate | Commission % | Status | Total orders | Revenue | Joined |
|-----------|-------------|--------|-------------|---------|--------|

`affiliates.is_active` toggle.

### Add Affiliate Modal

- Search by user email → resolved to `users.id`
- Commission % input (1–100, stored in `affiliates.commission_percent`)
- Confirm → INSERT `affiliates`

### Affiliate Performance

Per affiliate: orders count, revenue attributed, commissions owed.  
(Future: separate `affiliate_conversions` table — currently tracked via `order_referrals`.)

---

## 21. Page: A/B Tests

**Route:** `/dashboard/ab-tests`  
**Schema tables:** `site_ab_tests`

### Tests Table

| Test name | Site | Section | Split | Status | Winner | Started |
|-----------|------|---------|-------|--------|--------|---------|
| Hero CTA Button Text | arjun | hero | 50/50 | Running | — | 5 days ago |
| Product Grid Columns | priya | grid | 50/50 | Concluded | B | 28 days ago |

`status` from enum: `draft` · `running` · `paused` · `concluded`

### Test Detail Page

**Route:** `/dashboard/ab-tests/[testId]`

Shows:
- Test name (`test_name`)
- Section key (`section_key`)
- Traffic split slider (`traffic_split_percent`)
- Variant A config (`variant_a` jsonb — rendered as key-value list)
- Variant B config (`variant_b` jsonb)
- Status controls: Start / Pause / Conclude → update `status`
- Winner select (A / B) — enabled only when concluding → `winner` field

### Create A/B Test

- Select site
- Select section key from site's sections
- Name the test
- Edit variant_a and variant_b settings (JSON editor or visual form)
- Set traffic split
- Save as draft → Start when ready

---

## 22. Page: Guest Leads

**Route:** `/dashboard/leads`  
**Schema tables:** `guest_leads`

### Summary

```
Total leads: 5  |  Converted: 2  |  Pending: 3  |  Conversion rate: 40%
```

### Leads Table

| Name | Email | Phone | Product | Status | Site | Date |
|------|-------|-------|---------|--------|------|------|

`status`: `pending` (amber) · `converted` (green)

Converted = `guest_leads.status = 'converted'` — i.e., this guest later completed a purchase and their `guest_lead_id` is linked to an order.

### Lead Detail Drawer

- Contact info
- Which product they showed interest in (JOIN `products`)
- Which site they came from (JOIN `sites`)
- Whether they placed an order (JOIN `orders WHERE guest_lead_id = ?`)
- Quick action: "Send email" (opens email compose with pre-filled address)

---

## 23. Page: Plan & Billing

**Route:** `/dashboard/billing`  
**Schema tables:** `subscriptions`, `subscription_plans`, `subscription_offers`, `subscription_offer_redemptions`, `creator_subscription_orders`

### Current Plan Card

```
┌────────────────────────────────────────────────────┐
│ Pro Plan                              [Manage plan] │
│                                                     │
│ Platform fee: 5%                                   │
│ Monthly: ₹1,000  ·  Yearly: ₹10,000               │
│ Renewal: 5 days · Auto-renew: ON                   │
│ Billing cycle: Monthly                             │
└────────────────────────────────────────────────────┘
```

Data from `subscriptions JOIN subscription_plans`.

### Active Offers

`subscription_offer_redemptions` for this creator:  
Shows discount_amount, expires_at for each active redemption.

### Plan Comparison Table

`subscription_plans` all three plans side by side:

| Feature | Free | Plus | Pro |
|---------|------|------|-----|
| Platform fee | 10% | 7% | 5% |
| Monthly price | ₹0 | ₹500 | ₹1,000 |
| Products | 10 | 100 | Unlimited |
| Custom domain | ✗ | ✅ | ✅ |
| API access | ✗ | ✗ | ✅ |

Upgrade CTA buttons on lower plan columns.

### Billing History

`creator_subscription_orders`:

| Plan | Amount | Status | Payment ID | Date |
|------|--------|--------|-----------|------|

---

## 24. Page: API & Rate Limits

**Route:** `/dashboard/api`  
**Schema tables:** `api_rate_limits`

### API Overview Card

```
API access: Enabled (Pro plan)
Base URL: https://api.digione.ai/v1
Auth: Bearer token (from profile settings)
```

### Rate Limits Table

`api_rate_limits` current window:

| Endpoint | Method | Requests this hour | Limit | Window |
|----------|--------|-------------------|-------|--------|
| /api/products | GET | 48 | 100 | resets in 12 min |
| /api/orders | GET | 12 | 100 | resets in 12 min |

Progress bars showing `request_count / limit`.

Constraint: `UNIQUE (creator_id, endpoint, method, window_start)` — one row per endpoint per hour.

### API Documentation Links

Quick links to endpoint docs (external or in-app docs page).

---

## 25. Page: Support

**Route:** `/dashboard/support`  
**Schema tables:** `support_tickets`

### Tickets Table

| Ticket ID | Subject | Status | Priority | Site | Created | Actions |
|-----------|---------|--------|----------|------|---------|---------|

`status`: `open` (red) · `in_progress` (amber) · `resolved` (green) · `closed` (gray)  
`priority`: `low` · `medium` · `high`

### Ticket Detail

**Route:** `/dashboard/support/[ticketId]`

- Subject + description (full)
- Status timeline
- Assigned admin: `support_tickets.assigned_admin_id` → admin profile name
- Site reference: `support_tickets.site_id`
- Conversation thread (future: ticket_messages table)

### Create New Ticket

Fields:
- Subject
- Description (textarea)
- Related site (select from `sites`)
- Priority (self-reported: low/medium/high)

INSERT `support_tickets` with `status = 'open'`.

---

## 26. Page: Profile & Settings

**Route:** `/dashboard/settings`  
**Schema tables:** `profiles`, `users`

### Tabs

**Profile tab**
- Avatar upload (`profiles.avatar_url`)
- Full name (`profiles.full_name`)
- Mobile (`profiles.mobile`) + verify button if `mobile_verified = false`
- Email (read-only from `users.email`, verified via auth)
- Bio / description (future `profiles.bio` field)

**Account tab**
- Email (`users.email`) — change email flow via Supabase Auth
- Password change (via Supabase Auth `updateUser`)
- Two-factor authentication (Supabase TOTP)
- Delete account (danger zone)

**Notifications tab**
Settings for which notification types the creator wants:
- Sale notifications: email / in-app / both
- Refund notifications: email / in-app / both
- Payout notifications: email / in-app / both
- Review notifications: in-app only
- KYC updates: email + in-app (always on)

Stored as `profiles.metadata` jsonb with notification preferences object.

---

## 27. Component Library

### StatCard

```typescript
// Props
interface StatCardProps {
  label: string
  value: string | number
  sub?: string          // secondary stat or change indicator
  subColor?: 'green' | 'red' | 'muted'
  onClick?: () => void
}
```

### DataTable

Generic table with: search, column sort, pagination, row click handler, loading skeleton, empty state.

### StatusPill

```typescript
type OrderStatus = 'completed' | 'pending' | 'failed' | 'refunded' | 'cancelled'
type KycStatus   = 'verified' | 'pending' | 'rejected'
type PayoutStatus = 'pending' | 'approved' | 'rejected' | 'processed' | 'initiated' | 'failed'
```

Each maps to: `completed/verified/processed/approved` → green, `pending/initiated` → amber, `failed/rejected/cancelled` → red, `refunded` → slate.

### PageHeader

```typescript
interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode   // buttons in top-right
  breadcrumb?: { label: string, href: string }[]
}
```

### SideDrawer

Right-side drawer (400px wide) for detail views. Closes on Escape or backdrop click.

### ConfirmDialog

Used for destructive actions (delete product, revoke license, delete coupon). Requires typing item name to confirm.

### CurrencyInput

Handles ₹ prefix, decimal places, min/max validation.

### DateRangePicker

Preset options + custom calendar. Returns `{ from: Date, to: Date }`.

---

## 28. Data Fetching Patterns

### Supabase Client Setup

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### Creator Context Hook

```typescript
// hooks/useCreator.ts
// Fetches: profiles, creator_balances, creator_kyc, subscriptions + plan
// Returns: creator profile + financial summary for sidebar
```

### Standard Query Pattern

```typescript
// All queries use auth_profile_id() through RLS — no manual creator_id filter needed
const { data, error } = await supabase
  .from('products')
  .select('id, name, price, is_published, thumbnail_url')
  .order('created_at', { ascending: false })
```

### Optimistic Updates

All toggle actions (is_published, is_active, is_read) use Zustand optimistic state + Supabase background sync. On error, rollback with toast notification.

### Real-time Subscriptions

```typescript
// Used for: notifications, order_items (new orders), page_edit_locks (collaboration)
const channel = supabase
  .channel('creator-notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `recipient_creator_id=eq.${profileId}`
  }, handleNewNotification)
  .subscribe()
```

### Loading States

- First load: full skeleton (table rows as gray bars)
- Refetch: spinner in top-right of card only, content stays visible
- Mutations: button shows loading spinner, input disabled until resolved

### Error Handling

Supabase `error` objects displayed as toast notifications.  
Network errors show a retry banner at top of page.  
RLS violations (shouldn't happen with correct policies) logged to Supabase Edge Functions for monitoring.

---

*DigiOne Dashboard Design Specification v1.0 — March 2026*  
*Based on: digione_schema_v4.sql (72 tables) + digione_seed_final.sql + digione_prd.docx*
