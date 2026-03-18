# DigiOne — Public Pages Design Specification

> Complete UI/UX specification for all public-facing pages:
> SaaS marketing homepage · Creator storefront · Authentication · Cart · Checkout · Payment · Buyer account.
> Stack: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Framer Motion, Supabase Auth, Cashfree.

---

## Table of Contents

1. [Design System — Public Layer](#1-design-system--public-layer)
2. [SaaS Homepage (digione.in)](#2-saas-homepage)
3. [Pricing Page](#3-pricing-page)
4. [Creator Storefront — Main Store (:slug)](#4-creator-storefront--main-store-slug)
5. [Creator Storefront — Single Product Page (:slug/:childslug)](#5-creator-storefront--single-product-page)
6. [Creator Storefront — Payment Link Page (:slug/:childslug)](#6-creator-storefront--payment-link-page)
7. [Creator Storefront — Blog (:slug/:childslug)](#7-creator-storefront--blog)
8. [Creator Storefront — Blog Post (:slug/:childslug/:postslug)](#8-creator-storefront--blog-post)
9. [Discover Feed (/discover)](#9-discover-feed)
10. [Authentication — Sign Up](#10-authentication--sign-up)
11. [Authentication — Log In](#11-authentication--log-in)
12. [Authentication — Forgot Password](#12-authentication--forgot-password)
13. [Authentication — Reset Password](#13-authentication--reset-password)
14. [Authentication — Email Verification](#14-authentication--email-verification)
15. [Cart Page (/cart)](#15-cart-page)
16. [Checkout Page (/checkout)](#16-checkout-page)
17. [Payment Page (/checkout/payment)](#17-payment-page)
18. [Order Confirmation (/orders/:orderId/confirmation)](#18-order-confirmation)
19. [Buyer Account — My Library (/account/library)](#19-buyer-account--my-library)
20. [Buyer Account — Order History (/account/orders)](#20-buyer-account--order-history)
21. [Buyer Account — Wallet (/account/wallet)](#21-buyer-account--wallet)
22. [Buyer Account — Wishlist (/account/wishlist)](#22-buyer-account--wishlist)
23. [Buyer Account — Profile (/account/settings)](#23-buyer-account--profile)
24. [Legal Pages](#24-legal-pages)
25. [Shared Components — Public](#25-shared-components--public)
26. [SEO & Meta Strategy](#26-seo--meta-strategy)
27. [Routing Architecture](#27-routing-architecture)

---

## 1. Design System — Public Layer

The public layer uses a separate visual language from the creator dashboard.
The SaaS homepage is dark and premium. Creator storefronts are theme-driven per creator's `site_design_tokens`.
Authentication and checkout pages are light, clean, and minimal.

### Colour Tokens

```css
/* SaaS homepage (dark) */
--saas-bg:           #03040A;
--saas-bg-2:         #0D0F1A;
--saas-bg-3:         #141628;
--saas-border:       rgba(255,255,255,0.08);
--saas-border-glow:  rgba(99,102,241,0.35);
--saas-text:         #F1F5F9;
--saas-text-2:       #94A3B8;
--saas-text-3:       #475569;

/* Brand shared across all pages */
--brand:             #6366F1;
--brand-hover:       #4F46E5;
--brand-glow:        rgba(99,102,241,0.20);
--brand-gradient:    linear-gradient(135deg, #6366F1, #8B5CF6);

/* Checkout & auth (light) */
--auth-bg:           #F8FAFC;
--auth-surface:      #FFFFFF;
--auth-border:       #E2E8F0;
--auth-text:         #0F172A;
--auth-text-2:       #64748B;

/* Creator storefront — injected from site_design_tokens at layout level */
--store-primary:     var(--creator-primary, #6366F1);
--store-bg:          var(--creator-bg, #FFFFFF);
--store-text:        var(--creator-text, #0F172A);
```

### Typography

| Context | Font | Size | Weight |
|---------|------|------|--------|
| SaaS headline | Inter / Clash Display | 48–80px | 600–700 |
| SaaS body | Inter | 16–18px | 400–500 |
| Storefront | Creator's `heading_font` + `body_font` from `site_design_tokens.typography` | — | — |
| Auth / checkout | Inter | 14–16px | 400 |

### Layout Dimensions

- Max content width: 1200px, centered, side padding 24px desktop / 16px mobile
- SaaS section padding: 96px top/bottom desktop, 64px mobile
- Storefront section padding: 64px top/bottom
- Card border-radius: 16px (SaaS), 12px (storefront / auth)
- Button height: 44px default, 52px hero CTA, 40px compact

---

## 2. SaaS Homepage

**Route:** `/`
**Schema tables read for dynamic content:** `subscription_plans` (pricing section)
**Purpose:** Convert Indian creators from Instagram / YouTube / Google into free sign-ups.
**Tone:** Premium dark, confident. "The tool serious Indian creators use."

---

### 2.1 Navigation Bar

Sticky, 64px height, `backdrop-blur` on scroll.

```
DigiOne logo                  Features  Pricing  Creators  Blog      Log in   Start free →
(left, white wordmark)        (14px nav links, slate-400)            (ghost)  (indigo pill)
```

- Logo: DigiOne wordmark + abstract D glyph, white, 28px
- Nav links: 14px, `--saas-text-2`, hover → white, smooth underline slide
- Log in: ghost button, white border at 20% opacity
- Start free: solid indigo pill, 14px bold, 44px height, trailing arrow icon
- Scrolled state: background transitions from transparent to `--saas-bg` at 80% opacity + blur
- Mobile: hamburger → full-screen dark drawer with same links + CTA stacked

---

### 2.2 Hero Section

Full-viewport height. Dark canvas with radial gradient from `#0D0F1A` center to `#03040A` edges. Subtle 40px grid lines at 4% opacity overlaid. Indigo radial glow blob (200px blur) behind the product screenshot.

```
                  [ 🎉  Trusted by 10,000+ Indian creators ]
                  (small pill badge, indigo 10% bg, indigo border)


        Your entire creator
        business. One platform.
        (80px, white, tight tracking; "One platform." in brand gradient)


        Store · Blog · Payment links · Visual builder ·
        UPI payouts · GST invoicing — all in one place.
        (18px, slate-400, max-width 560px, centered)


        [ Start for free → ]     [ ▶ Watch 90-sec demo ]
        (52px CTA, indigo fill)  (44px ghost, play circle icon)


        No credit card required  ·  Instant setup  ·  INR pricing
        (12px, slate-500, checkmark icons, comma-separated)


        ┌──────────────────────────────────────────────┐
        │   [Animated dashboard screenshot]            │
        │   Browser chrome frame, indigo glow border   │
        │   Shows: orders list + product grid          │
        └──────────────────────────────────────────────┘
```

Animation sequence (Framer Motion, staggered):
1. Badge fades up (0ms delay)
2. Headline words slide up one by one (100ms stagger per word)
3. Subheading fades in (400ms)
4. CTA buttons scale from 95% (600ms)
5. Product screenshot slides up + fades in (800ms)

---

### 2.3 Social Proof Strip

Thin strip immediately below hero. Two parts:

**Part A — Logo ticker (auto-scroll marquee):**
```
Trusted by creators on:   [YouTube]  [Instagram]  [Spotify]  [Substack]  [Teachable]  ...
```
White logos at 60% opacity, infinite marquee CSS animation.

**Part B — Animated stat counters (scroll-triggered):**
```
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│ ₹4.2 Cr+       │  │ 12,400+        │  │ 98.2%          │
│ earned by      │  │ products sold  │  │ uptime SLA     │
│ creators       │  │ on platform    │  │                │
└────────────────┘  └────────────────┘  └────────────────┘
```

`useInView` hook triggers count-up animation on enter. Numbers hardcoded for marketing.

---

### 2.4 Problem Statement Section

**Headline:** "Indian creators are duct-taping 5 tools together."

Two-column layout (left / right), separated by a central `→` arrow:

**Left — The old way (red-tinted cards in a row):**
```
[Gumroad]  +  [Notion]  +  [Razorpay]  +  [Webflow]  +  [Mailchimp]
No INR         No store      No product    No payout     No India
payouts        design        delivery      tracking      compliance
```
Red dashed connector lines. Callout below: "₹8,400/month. 6 logins. 6 passwords."

**Right — DigiOne (green glow box):**
```
        ┌──────────────────────┐
        │      DigiOne         │
        │   Everything in      │
        │   one place.         │
        └──────────────────────┘
```
"₹1,000/month. One login. One payout."

Scroll-triggered animation: left-side tool cards cross out one by one as user scrolls in, right-side box glows.

---

### 2.5 Feature Showcase — Four Alternating Sections

Each section: large visual left or right, headline + description + feature pills + "See it live" link opposite. Fade-in on scroll enter.

#### Feature 1 — Creator Store

Visual (left): browser mockup showing Arjun's dark-themed store at `digione.in/arjun`

```
Your store. Your brand.
━━━━━━━━━━━━━━━━━━━━━━━
Build a storefront that actually looks like you.
Choose from 18 section types, apply your brand
colours, add a custom domain, and go live in
under 30 minutes.

[ 18 section types ]  [ Custom domain ]
[ SEO ready ]         [ Mobile first ]

digione.in/arjun  →  (live example link)
```

Schema: `sites`, `site_sections_config`, `site_design_tokens`, `site_navigation`

#### Feature 2 — Instant UPI Payouts

Visual (right): payout card mockup showing "₹3,500 processed to arjun@ybl — 2 hours ago"

```
Sell today. Get paid today.
━━━━━━━━━━━━━━━━━━━━━━━━━━
India-first checkout. UPI, card, net banking.
Payouts hit your UPI or bank account within
24 hours. Only 5% platform fee on Pro.

[ UPI payments ]  [ Bank transfer ]
[ 5% fee on Pro ] [ KYC protected ]
```

Schema: `creator_balances`, `creator_payout_requests`, `creator_payouts`, `orders`

#### Feature 3 — Visual Page Builder

Visual (left): builder canvas screenshot showing block panel + canvas with drag handles

```
Build any page. No code.
━━━━━━━━━━━━━━━━━━━━━━━
A Framer-like drag-and-drop canvas. 40+ blocks,
Google Fonts, saved components, version history,
device preview, and real-time collaboration.

[ 40+ blocks ]       [ Google Fonts ]
[ Version history ]  [ Mobile preview ]
```

Schema: `projects`, `pages`, `page_blocks`, `saved_components`, `builder_fonts`

#### Feature 4 — GST & Compliance (India-specific)

Visual (right): GST invoice preview screenshot, professional layout

```
Built for India's tax reality.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Auto-generate GST invoices on every sale.
Download TDS certificates. PAN + Aadhaar KYC.
Immutable transaction ledger with SHA-256 hashes.

[ GST invoices ] [ TDS documents ]
[ PAN verify ]   [ Audit trail ]
```

Schema: `creator_kyc`, `transaction_ledger`, `creator_revenue_shares`

---

### 2.6 Storefront Showcase Carousel

**Headline:** "See what creators are building"

Horizontal scroll of 4 live storefront preview cards:

```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ [Dark template]  │  │ [Minimal white]  │  │ [Warm amber]     │  │ [Pink blog]      │
│                  │  │                  │  │                  │  │                  │
│ Arjun Sharma     │  │ Priya Mehta      │  │ Rahul Verma      │  │ Neha Kapoor      │
│ Figma Courses    │  │ Design Assets    │  │ Photography      │  │ Podcast Creator  │
│ digione.in/arjun │  │ digione.in/priya │  │ digione.in/rahul │  │ digione.in/neha  │
│ [ Visit → ]      │  │ [ Visit → ]      │  │ [ Visit → ]      │  │ [ Visit → ]      │
└──────────────────┘  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

Card: browser chrome frame, real screenshot thumbnail (SSG at build), creator name, niche, live link.
Hover: scale 1.02 + indigo border glow.

---

### 2.7 Testimonials Section

**Headline:** "Creators earning with DigiOne"

Three large cards in a grid:

```
┌────────────────────────────────────────────────────┐
│ ★★★★★                                              │
│                                                    │
│ "Made ₹1.2L in the first month. The UPI payout    │
│  hit my account the same day. Nothing else         │
│  works this smoothly for Indian creators."         │
│                                                    │
│ [Avatar]  Arjun Sharma                             │
│           UI/UX Educator · 50K+ students           │
│           digione.in/arjun ↗                       │
└────────────────────────────────────────────────────┘
```

Dark card `--saas-bg-2`, subtle indigo top border accent (2px), amber star row.
Two compact secondary quotes below the three main cards (smaller, text-only, centered).

---

### 2.8 Pricing Teaser

Three plan cards inline, linking to full `/pricing` page for complete feature breakdown.

**Monthly/Yearly toggle** (saves ~17% on yearly): "Save 2 months" badge on yearly.

```
┌──────────────┐  ┌──────────────────────┐  ┌──────────────┐
│   Free        │  │   Plus   ★ Popular  │  │   Pro         │
│   ₹0/month    │  │   ₹500/month         │  │   ₹1,000/mo  │
│               │  │   ₹5,500/year        │  │   ₹10,000/yr │
│   10% fee     │  │   7% fee             │  │   5% fee     │
│   10 products │  │   100 products       │  │   Unlimited  │
│               │  │   Custom domain      │  │   API access  │
│ [Get started] │  │ [ Start Plus → ]     │  │ [ Go Pro → ] │
└──────────────┘  └──────────────────────┘  └──────────────┘
```

Data source: `subscription_plans` (plan_type, platform_fee_percent, monthly_price, yearly_price, features jsonb).
"Plus" card: indigo border glow + `★ Popular` badge.
"See full comparison →" link to `/pricing`.

---

### 2.9 FAQ Section

Accordion component, 8 questions covering conversion blockers:

1. Do I need a GST number to sell on DigiOne?
2. How fast are payouts processed?
3. Can I use my own domain name?
4. What payment methods do buyers have?
5. Is there really a free plan?
6. Do you support international buyers?
7. What happens if a buyer requests a refund?
8. Can I migrate from Gumroad or Instamojo?

Each item: bold question + 14px `--saas-text-2` answer. `+` icon rotates to `×` on open. Smooth `max-height` transition.

---

### 2.10 Final CTA Section

Full-width panel, dark gradient, centered:

```
Start selling in 30 minutes.
No credit card. No setup fee. Just your products.

              [ Create your free store → ]

        Already have an account?   Log in →
```

Subtle CSS grain texture or slow-moving particle animation in background.

---

### 2.11 Footer

Four-column grid (desktop), stacked (mobile):

| Column | Content |
|--------|---------|
| Brand | Logo · tagline "Business in a Box for Indian Creators" · social icons · "Made with ❤ in India" |
| Product | Features · Pricing · Creator stories · Changelog · Roadmap |
| Resources | Blog · Documentation · API reference · Affiliate program |
| Legal | Privacy policy · Terms of service · Refund policy · Contact us |

Bottom bar: `© 2026 DigiOne Technologies Pvt. Ltd. · CIN: UXXXXX · GST: XXXXXXXXXXXX`

---

## 3. Pricing Page

**Route:** `/pricing`
**Schema tables:** `subscription_plans`, `subscription_offers`, `subscription_offer_redemptions`

### Header

```
Simple, creator-first pricing.
Pay less as you grow.

        [Monthly]  /  [Yearly  — save 2 months]
```

### Full Plan Cards

Three cards with full feature lists. Same layout as teaser, but each card expands to show all features drawn from `subscription_plans.features` jsonb (expanded to human-readable strings).

### Feature Comparison Matrix

Full table below cards:

| Feature | Free | Plus | Pro |
|---------|------|------|-----|
| Products | 10 | 100 | Unlimited |
| Platform fee | 10% | 7% | 5% |
| Custom domain | — | ✅ | ✅ |
| Analytics | Basic | Advanced | Full |
| Blog | ✅ | ✅ | ✅ |
| Visual builder | ✅ | ✅ | ✅ |
| Email support | — | ✅ | ✅ |
| API access | — | — | ✅ |
| Priority support | — | — | ✅ |
| Advanced marketing | — | — | ✅ |
| "Powered by DigiOne" | Shown | Hidden | Hidden |

### Active Offers Banner

If `subscription_offers` row exists with `is_active = true AND start_date <= NOW() AND end_date >= NOW()`:

```
🎁 Limited time: 3 months free on yearly Plus with code LAUNCH3 — expires in 4 days
```

---

## 4. Creator Storefront — Main Store (:slug)

**Route:** `/:slug`
**Example:** `digione.in/arjun`
**Schema tables:** `sites`, `site_main`, `site_sections_config`, `site_design_tokens`, `site_navigation`, `products`, `site_product_assignments`, `product_ratings`, `user_carts`

Creator's theme is injected as CSS variables at the layout level from `site_design_tokens`:

```typescript
// app/[slug]/layout.tsx
// 1. Fetch site_design_tokens for this site_id
// 2. Inject as <style> tag into <head>:
//    --creator-primary: #6366F1;
//    --creator-bg: #0F172A;
//    --creator-text: #F1F5F9;
//    --creator-heading-font: 'Inter';
//    --creator-body-font: 'Inter';
// 3. Also apply site_main.custom_css if present
```

---

### 4.1 Storefront Navigation

Built from `site_navigation` row for this `site_id`.

```
[Logo]   Home   Courses   Blog   Mentorship   Contact      [🛒 2]   [Login / Avatar]
```

- Logo: `site_navigation.header_logo_url` (falls back to `site_main.logo_url`)
- Nav items: `site_navigation.nav_items` jsonb array — each item has `label` + `url`
- Cart icon + count badge: shown when `show_cart_icon = true`, badge = `user_carts` COUNT for logged-in user
- Search icon: shown when `show_search = true` → opens search modal over site
- Sticky: `site_navigation.sticky_header = true`
- Logged-in buyer: shows avatar → dropdown (My Library, Orders, Wishlist, Log out)
- Not logged in: "Log in" link → `/auth/login?returnUrl=/:slug`
- Mobile: hamburger → bottom sheet drawer with all nav items

---

### 4.2 Section Rendering Engine

`site_sections_config.sections` is a jsonb array. Sections render in `sort_order` order, only when `is_visible = true`.

Each section type renders a React component. Passed props: `settings` object from the jsonb item.

#### announcement_bar

```
[ 🎉 Use ARJUN20 for 20% off all products!                                          × ]
```

Full-width strip. `settings.bg_color` background, `settings.text_color` text. Dismissible via `localStorage[siteId+'_bar_dismissed']`.

#### hero_banner

```
┌────────────────────────────────────────┬─────────────────────────────────────────┐
│   [bg: gradient / image / video]       │                                         │
│                                        │   Learn Figma. Land Design Jobs.        │
│   overlay at settings.overlay_opacity  │                                         │
│                                        │   India's most trusted design            │
│                                        │   education platform.                   │
│                                        │                                         │
│                                        │   [Browse Courses →]  [Watch Preview]   │
│                                        │                                         │
└────────────────────────────────────────┴─────────────────────────────────────────┘
```

`settings.bg_type` = `color` / `gradient` / `image` / `video`
`settings.bg_value` = CSS value string or URL
Video bg: `<video autoPlay muted loop playsInline>`. Image bg: `object-cover`.
Layout variants: `centered` / `left-aligned` / `split` (as shown above).
CTA: `settings.cta_text` + `settings.cta_url` + `settings.cta_style` (primary / secondary / outline).

#### featured_products

```
  Top Picks
  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
  │  [Thumbnail]   │  │  [Thumbnail]   │  │  [Thumbnail]   │
  │  Figma MC 2024 │  │  UX Roadmap    │  │  Component Lib │
  │  ★ 4.9 (124)   │  │  ★ 4.7 (38)   │  │  ★ 4.8 (52)   │
  │  ₹1,999        │  │  ₹499          │  │  ₹799          │
  │  [Add to cart] │  │  [Add to cart] │  │  [Add to cart] │
  └────────────────┘  └────────────────┘  └────────────────┘
```

Products from `site_product_assignments WHERE placement = 'featured'` ordered by `sort_order`, then JOIN `products`.
Rating: aggregate from `product_ratings WHERE is_approved = true` for each product.

**Product card states:**
- Default: thumbnail, name, star rating, price, cart CTA
- Hover: scale 1.02, button fills brand colour
- Already purchased (check `user_product_access`): CTA → "Download" link
- In wishlist: filled heart icon top-right corner

#### product_grid

All `site_product_assignments` products for this site, presented in grid.
Filter bar: All · Course · Ebook · Design Asset · Template · Photography
Sort: Popular · Newest · Price low-high · Price high-low

Same card design as featured_products.

#### testimonials

```
  What students say
  ┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
  │ ★★★★★               │  │ ★★★★★               │  │ ★★★★★               │
  │ "Got my first UX    │  │ "Best ₹2000 I ever  │  │ "From zero to hired │
  │  job 3 weeks after  │  │  spent. Clients pay │  │  in 45 days."       │
  │  finishing."        │  │  ₹50k/month."       │  │                     │
  │ Sneha Patel         │  │ Karan Singh         │  │ Dev Sharma          │
  │ UX Designer, Swiggy │  │ Freelance Designer  │  │ Product Designer    │
  └─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

Data from `settings.items` array in the section jsonb.
Layout variants: `grid` / `carousel` (auto-scroll) / `masonry`.

#### faq_accordion

Accordion using `settings.items` array of `{q, a}` objects.
`settings.default_open_index` controls which item is open by default.

#### countdown_timer

```
  Limited time offer ends in:
  [ 02 ] : [ 14 ] : [ 37 ] : [ 22 ]
   Days      Hours   Minutes  Seconds
```

`settings.end_time` ISO string. Real-time countdown with `setInterval`.
`settings.post_countdown_behavior`: `hide` / `show_message` / `redirect`.

#### social_proof

Floating bottom-left pop-up cycling through recent purchases:

```
┌──────────────────────────────────┐
│ 👤 Ravi just purchased           │
│    Figma Masterclass 2024        │
│    2 minutes ago  ×              │
└──────────────────────────────────┘
```

Data from `settings.recent_sales` array (manually curated) or live from `orders` (last 24h, anonymised).
Cycles every 8 seconds. Framer Motion slide-up entrance, fade-out exit.

#### about_creator

```
┌──────────────────────────────────────────────────────────┐
│ [Avatar]   Arjun Sharma                                  │
│ About me                                                 │
│ I've been teaching Figma & UX Design since 2019.        │
│ 50,000+ students. Working with Razorpay, Zepto, Urban   │
│ Company.                                                 │
│                                                          │
│ [Instagram ↗]   [YouTube ↗]   [Twitter ↗]              │
└──────────────────────────────────────────────────────────┘
```

`settings.text` + social links from `site_main.social_links` jsonb.

#### trust_badges

```
[ 🔒 Secure Payment ]   [ ⚡ Instant Download ]   [ 💬 24/7 Support ]
```

`settings.badges` text array. Icons auto-assigned by keyword matching.

#### email_capture

```
  Get free design resources weekly
  [ Enter your email         ]  [ Subscribe → ]
```

On submit: INSERT `guest_leads` with `status = 'pending'`, `product_id = null`.
Success state: "Thanks! Check your inbox."

#### announcement_bar, sticky_cta, video_showcase, image_gallery, rich_text, custom_html, pricing_table, product_comparison

Standard implementations per their `settings` schemas from `site_section_type` enum.

---

### 4.3 Storefront Footer

Built from `site_navigation` row:

```
┌──────────────────────────────────────────────────────────────────────┐
│  [Logo]                                 [Instagram] [YouTube] [Twitter]│
│  Arjun Sharma — Design Courses                                        │
│                                                                        │
│  Products          Legal               Contact                         │
│  Courses           About us            arjun@digione.in               │
│  Ebooks            Terms of service    +91 90000 00002                 │
│  Design Assets     Privacy policy                                      │
│                    Refund policy                                        │
│                                                                        │
│ ──────────────────────────────────────────────────────────────────── │
│  © 2024 Arjun Sharma. All rights reserved.   Powered by DigiOne ↗    │
└──────────────────────────────────────────────────────────────────────┘
```

Legal pages shown based on `site_main.legal_pages` jsonb flags.
"Powered by DigiOne" shown on Free plan. Hidden on Plus/Pro (`subscriptions.plan_type`).

---

## 5. Creator Storefront — Single Product Page

**Route:** `/:slug/:childslug`
**Example:** `digione.in/arjun/figma-course`
**Schema tables:** `sites (type='single')`, `site_singlepage`, `products`, `product_files`, `product_ratings`, `coupons`, `product_related`

High-conversion landing page for one product. Layout driven by `site_singlepage` row.

---

### 5.1 Product Hero

Two-column layout: visual left, purchase panel right.

```
┌─────────────────────────────────┬──────────────────────────────────────┐
│                                 │                                      │
│  [Hero image or video]          │  Figma Masterclass 2024 —            │
│  site_singlepage.hero_image_url │  Become Job-Ready in 30 Days         │
│  full-bleed, object-cover       │                                      │
│                                 │  ★★★★★  4.9  (124 reviews)           │
│  [▶ Watch preview]              │  Course · Lifetime access            │
│                                 │                                      │
│                                 │  ₹1,999                              │
│                                 │  ~~₹3,999~~  (compare_at if set)     │
│                                 │                                      │
│                                 │  [Buy Now — ₹1,999 →]               │
│                                 │  (shown when show_buy_now = true)    │
│                                 │                                      │
│                                 │  [Add to cart]                       │
│                                 │  (shown when show_add_to_cart = true)│
│                                 │                                      │
│                                 │  ┌────────────────────────────────┐  │
│                                 │  │ Have a coupon?  [ARJUN20] Apply│  │
│                                 │  │ ✅ 20% off applied → ₹1,599   │  │
│                                 │  └────────────────────────────────┘  │
│                                 │                                      │
│                                 │  🛡 30-Day Money Back                │
│                                 │  ∞  Lifetime Access                  │
│                                 │  🏆  Certificate of Completion       │
│                                 │  👥  Community Support               │
│                                 │  (from site_singlepage.guarantee_    │
│                                 │   badges jsonb array)                │
│                                 │                                      │
│                                 │  Countdown timer if set:             │
│                                 │  Offer ends in: 02:14:37:22         │
└─────────────────────────────────┴──────────────────────────────────────┘
```

**Coupon validation logic:**
Query `coupons WHERE code = :input AND creator_id = :creatorId AND is_active = true AND (valid_until IS NULL OR valid_until > NOW()) AND (max_uses IS NULL OR current_uses < max_uses)`.
Success: show discount amount. Error: "Invalid or expired coupon."

**Guarantee badges:** from `site_singlepage.guarantee_badges` jsonb array of `{text, icon}` objects.

---

### 5.2 Product Description

Full-width below hero. `products.description` rendered as HTML.

---

### 5.3 What's Included

```
  What you get
  ────────────────────────────────────────────────
  📹  40 hrs HD video (Course Access Key)
  📁  Project files & resources (ZIP, 156 MB)
  📐  Figma component library (.fig, 2.1 GB)
  📜  Certificate of completion
```

Data from `product_files` — `file_label`, `file_type`, `file_size_bytes` (human-formatted).
`is_primary` file listed first. Actual download URLs are hidden until purchase.

---

### 5.4 Testimonials and Reviews

Shown when `site_singlepage.enable_reviews = true`.

**Part A — Curated testimonials:** from `site_singlepage.testimonials` jsonb. Avatar, name, role, quote text, star rating.

**Part B — Verified buyer reviews:**

```
  Customer reviews
  ★ 4.9 overall  ·  124 reviews

  ┌────────────────────────────────────────────────────────────────┐
  │  Rating breakdown                                              │
  │  ★★★★★  ████████████████████████  112  (90%)                  │
  │  ★★★★☆  ████                       9  (7%)                    │
  │  ★★★☆☆  █                          2  (2%)                    │
  │  ★★☆☆☆  —                          1  (1%)                    │
  │  ★☆☆☆☆  —                          0  (0%)                    │
  └────────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────────┐
  │  ★★★★★   Life changing course!                                │
  │  Sneha Patel  ·  Junior UX at Swiggy  ·  ✅ Verified purchase │
  │  "Got my first UX job 3 weeks after completing this..."        │
  │  [👍 Helpful  24]   Mar 2026                                   │
  └────────────────────────────────────────────────────────────────┘
```

Query: `product_ratings WHERE product_id = ? AND is_approved = true ORDER BY helpful_count DESC`
Pagination: 5 reviews per page. "Load more" button.

Logged-in buyer who has purchased → "Write a review" button → modal:
- Star picker (1–5)
- Review title
- Review text
- Submit → INSERT `product_ratings` with `is_verified_purchase = true`, `is_approved = false` (awaits creator approval in dashboard).

---

### 5.5 FAQ

From `site_singlepage.faq_items` jsonb array of `{q, a}` objects. Accordion component.

---

### 5.6 Sticky Purchase Bar

Appears when user scrolls past hero on desktop. Always shown at bottom on mobile.

```
┌──────────────────────────────────────────────────────────────────────┐
│  Figma Masterclass 2024              ₹1,999          [Buy Now →]     │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 5.7 Upsell Modal (Post Add-to-Cart)

Fires if product has `product_related WHERE relation_type = 'upsell'` rows:

```
┌───────────────────────────────────────────────────────────┐
│  Added to cart! ✅                                         │
│                                                           │
│  Complete your learning bundle:                           │
│  ┌──────────────┐                                         │
│  │ [Thumbnail]  │  Figma Component Library               │
│  │              │  Usually ₹799 · Add for ₹499           │
│  └──────────────┘                                         │
│                                                           │
│  [Add to order]          [No thanks, continue]           │
└───────────────────────────────────────────────────────────┘
```

---

## 6. Creator Storefront — Payment Link Page

**Route:** `/:slug/:childslug` (child `site_type = 'payment'`)
**Example:** `digione.in/arjun/mentorship`
**Schema tables:** `sites (type='payment')`, `payment_requests`, `payment_submissions`

Clean centered card layout (max-width 560px) on a subtle tinted background:

```
               ┌──────────────────────────────────────────┐
               │  [Creator logo]  Arjun Sharma             │
               │  ──────────────────────────────────────── │
               │                                           │
               │  1-on-1 Mentorship Session                │
               │  60-minute Figma or UX career session.   │
               │                                           │
               │  ── Fixed amount ──                       │
               │  ₹2,500                                   │
               │  ── or flexible ──                        │
               │  Enter amount:  [ ₹ ____________ ]       │
               │                                           │
               │  Your name     [ _________________ ]     │
               │  Email         [ _________________ ]     │
               │  Phone         [ _________________ ]     │
               │  Message       [ _________________ ]     │
               │                (optional)                 │
               │                                           │
               │  [ Pay ₹2,500 → ]                        │
               │                                           │
               │  🔒 Secured by Cashfree                   │
               └──────────────────────────────────────────┘
```

If site has multiple `payment_requests`, show them as a card selection list above the form.
`is_fixed_amount = false` → shows amount input field. `is_fixed_amount = true` → amount displayed read-only.

**On submit flow:**
1. Validate fields
2. POST `/api/payment-links/create-order` → creates Cashfree order, returns `order_token`
3. Launch Cashfree JS SDK payment modal
4. On payment success: INSERT `payment_submissions` with `payment_status = 'paid'`
5. Show success state: "Payment received! Arjun will reach out within 24 hours."

---

## 7. Creator Storefront — Blog

**Route:** `/:slug/:childslug` (child `site_type = 'blog'`)
**Example:** `digione.in/priya/blog`
**Schema tables:** `site_blog`, `blog_posts`, `products`

### Blog Header

```
[Logo]   Priya Mehta — Design Blog
Weekly articles on UI/UX, Figma tips, and design career advice.
[Instagram ↗]  [Twitter ↗]
```

From `site_blog.title`, `description`, `social_links`.

### Post Grid

```
  [Filter: All ▾]   [Search posts...]
  ────────────────────────────────────────────────────────────────

  ┌──────────────────────────┐  ┌──────────────────────────┐
  │  [Thumbnail]             │  │  [Thumbnail]   [🔒 PAID] │
  │                          │  │                          │
  │  figma  shortcuts        │  │  ui-kit  design-system   │
  │                          │  │                          │
  │  10 Figma Shortcuts      │  │  Pro UI Kit v3.0 —       │
  │  That Will 10x Your Speed│  │  Full Walkthrough        │
  │                          │  │                          │
  │  Mar 8 · 5 min · FREE    │  │  Mar 16 · 12 min         │
  │  1,240 views             │  │  Requires: Pro UI Kit    │
  └──────────────────────────┘  └──────────────────────────┘
```

`blog_posts.is_free = true` → FREE badge (green).
`blog_posts.is_free = false` AND `product_id` set → 🔒 badge + product name shown below.

Query: `blog_posts WHERE site_id = ? AND is_published = true ORDER BY sort_order ASC, published_at DESC`
Tags from `blog_posts.tags` text[] rendered as small pill chips.

---

## 8. Creator Storefront — Blog Post

**Route:** `/:slug/:childslug/:postslug`
**Schema tables:** `blog_posts`, `products`, `user_product_access`, `sites`

### Post Layout

```
  ← Back to blog

  10 Figma Shortcuts That Will 10x Your Speed
  ─────────────────────────────────────────────────────────────

  [figma]  [shortcuts]  [productivity]

  Priya Mehta  ·  Mar 8, 2026  ·  5 min read  ·  1,240 views

  [Hero thumbnail — full width, 480px max height, object-cover]

  [blog_posts.content rendered as HTML — sanitised via DOMPurify]

  ...article body...

  ─────────────────────────────────────────────────────────────
  Was this helpful?   [👍 Yes  48]   [👎 No  3]

  ─────────────────────────────────────────────────────────────
  You might also like:
  [Related post 1 card]   [Related post 2 card]
```

**Gated content paywall** (if `is_free = false` AND buyer not in `user_product_access`):

Content is visible up to ~30% (first screen), then:

```
  ┌──────────────────────────────────────────────────────────┐
  │  🔒 This is a premium post                              │
  │                                                          │
  │  Purchase Pro UI Kit — Web & Mobile to unlock this.      │
  │  [Thumbnail]  ₹1,299 · Lifetime access                  │
  │                                                          │
  │  [Buy Pro UI Kit →]                                      │
  │                                                          │
  │  Already purchased?  [Log in to access →]               │
  └──────────────────────────────────────────────────────────┘
```

**Video posts:** if `blog_posts.video_url` is set, render video player above the text content.
`video_source` values: `youtube` (embed), `vimeo` (embed), `upload` (HTML5 `<video>`).

---

## 9. Discover Feed

**Route:** `/discover`
**Schema tables:** `products`, `sites`, `product_ratings`, `profiles`

Query: `products WHERE is_on_discover_page = true AND is_published = true`

### Layout

```
  Discover products
  ─────────────────────────────────────────────────────────────

  [ All ]  [ Course ]  [ Ebook ]  [ Design Asset ]  [ Template ]  [ Photography ]

  Sort: [ Popular ▾ ]                          [ Search all products... ]

  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
  │  [Thumbnail]   │  │  [Thumbnail]   │  │  [Thumbnail]   │
  │ [Avatar] Arjun │  │ [Avatar] Priya │  │ [Avatar] Rahul │
  │  Course        │  │  Design Asset  │  │  Photography   │
  │                │  │                │  │                │
  │  Figma MC 2024 │  │  Pro UI Kit    │  │  Golden Hour   │
  │  ★4.9 · 124    │  │  ★4.8 · 52    │  │  ★5.0 · 17    │
  │  ₹1,999        │  │  ₹1,299        │  │  ₹299          │
  └────────────────┘  └────────────────┘  └────────────────┘
```

Creator avatar + name from `profiles` via `products.creator_id`.
Fulltext search uses `products.search_vector` tsvector (PostgreSQL `@@` operator).
Infinite scroll with `LIMIT 24 OFFSET n`.

---

## 10. Authentication — Sign Up

**Route:** `/auth/signup`
**Supabase trigger:** `handle_new_user` auto-creates `public.users` + `public.profiles` on every INSERT into `auth.users`.

### Layout

Split screen on desktop (left brand panel + right form). Full-width form on mobile.

**Left panel (indigo gradient background):**

```
  DigiOne

  Build your creator business.
  Start free in 30 seconds.

  ✅  UPI payouts in 24 hours
  ✅  5% platform fee on Pro
  ✅  Your store live instantly
  ✅  GST invoices automated
```

**Right panel (white / `--auth-surface`):**

```
  Create your account
  ─────────────────────────────

  Full name    [ _________________ ]
  Email        [ _________________ ]
  Password     [ _________________ ]  [👁]
               Strength: [██████░░░░]  Medium

  I want to:
  ◉  Sell products (Creator account)
  ○  Buy products  (Buyer account)

  [          Create account →          ]

  ─────────────────────────────
  Already have an account?  Log in →

  ─────────────────────────────
  By signing up you agree to our Terms of Service
  and Privacy Policy.
```

**On submit:**
1. `supabase.auth.signUp({ email, password, options: { data: { full_name, role } } })`
2. Supabase sends verification email via configured SMTP
3. `handle_new_user` trigger fires → INSERT into `public.users` (role from meta) + `public.profiles` (full_name from meta)
4. Redirect to `/auth/verify-email`

**Validation (inline, real-time):**
- Email: valid format + unique check on blur via `/api/auth/check-email` (debounced 400ms)
- Password: strength meter below input (`weak` red / `medium` amber / `strong` green)
- Name: required, min 2 chars
- Real-time error messages below each field on blur

---

## 11. Authentication — Log In

**Route:** `/auth/login`

Same split-screen shell as signup. Form:

```
  Welcome back
  ─────────────────────────────

  Email        [ _________________ ]
  Password     [ _________________ ]  [👁]

  [            Log in →            ]

  Forgot password? →

  ─────────────────────────────
  Don't have an account?  Sign up free →
```

**On submit:**
1. `supabase.auth.signInWithPassword({ email, password })`
2. On success: read `public.users.role` from Supabase session
   - `role = 'creator'` → redirect to `/dashboard` (or `returnUrl` query param)
   - `role = 'user'` → redirect to `/account/library` (or `returnUrl`)
3. On error: inline error below button: "Invalid email or password. Forgot password?"

**Return URL handling:** if user was on a protected page (cart, checkout, account), redirect back after login using `?returnUrl=` query parameter.
**Product purchase redirect:** if `?productId=` in URL, after login → pre-fill checkout with that product.

---

## 12. Authentication — Forgot Password

**Route:** `/auth/forgot-password`

```
  Reset your password
  ─────────────────────────────

  Email        [ _________________ ]

  [       Send reset link →       ]

  ─────────────────────────────
  Remember it?  Log in →
```

**On submit:**
`supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://digione.in/auth/reset-password' })`

**Success state:**
```
  ✅ Check your inbox

  We've sent a reset link to sneha@example.com.
  The link expires in 1 hour.

  [Resend email]     [Back to login →]
```

---

## 13. Authentication — Reset Password

**Route:** `/auth/reset-password`
**Access:** via Supabase magic link email containing `access_token` + `refresh_token` in URL hash.

```
  Set a new password
  ─────────────────────────────

  New password    [ _________________ ]  [👁]
  Confirm         [ _________________ ]  [👁]

  [       Update password →       ]
```

On submit: `supabase.auth.updateUser({ password: newPassword })`
On success: redirect to `/dashboard` (creator) or `/account` (buyer).
On token expiry: show "This link has expired. Request a new reset link." + link to `/auth/forgot-password`.

---

## 14. Authentication — Email Verification

**Route:** `/auth/verify-email`

```
  ✉️  Verify your email
  ─────────────────────────────

  We sent a verification link to
  arjun@digione.in

  Click the link in your email to activate
  your account.

  ─────────────────────────────
  [Resend email]     [Change email →]

  ─────────────────────────────
  Didn't get it? Check spam, or contact support.
```

`handle_user_email_confirmed` Supabase trigger fires on email confirmation → sets `public.users.is_verified = true` and `public.profiles.email_verified = true`.

After clicking the email link, Supabase redirects to either `/dashboard` (creator) or `/account/library` (buyer) based on `public.users.role`.

---

## 15. Cart Page

**Route:** `/cart`
**Schema tables:** `user_carts`, `products`, `user_wallets`, `coupons`, `user_wishlist`, `product_related`

Accessible to logged-in users. Guests see a sign-in prompt or "Continue as guest" option.

### Layout — Two Column (desktop) / Stacked (mobile)

```
  Your cart  (2 items)
  ─────────────────────────────────────────────────────────────

  ┌──────────────────────────────────────────────┐  ┌─────────────────────────┐
  │                                              │  │  Order summary          │
  │ [Thumb] Figma Masterclass 2024               │  │  ─────────────────────  │
  │ Arjun Sharma · Course · Lifetime access      │  │  Subtotal      ₹2,498  │
  │ ★4.9                                         │  │  Coupon            —   │
  │ ₹1,999        [♡ Save for later] [🗑 Remove] │  │  Wallet applied    —   │
  │                                              │  │  Total         ₹2,498  │
  │ ─────────────────────────────────────────    │  │  ─────────────────────  │
  │                                              │  │  Have a coupon?         │
  │ [Thumb] UI/UX Career Roadmap Ebook           │  │  [ ARJUN20    ] [Apply] │
  │ Arjun Sharma · Ebook · PDF + Notion          │  │  ✅ 20% off → ₹1,998   │
  │ ₹499          [♡ Save for later] [🗑 Remove] │  │  ─────────────────────  │
  │                                              │  │  Wallet: ₹200 available │
  │                                              │  │  [✅ Apply ₹200]        │
  │                                              │  │  ─────────────────────  │
  │                                              │  │  [Proceed to checkout →]│
  │                                              │  │                         │
  │                                              │  │  🔒 Secured by Cashfree │
  └──────────────────────────────────────────────┘  └─────────────────────────┘

  ─────────────────────────────────────────────────────────────
  You might also like:
  [ Figma Component Library  ₹799 ]   [ 500 Icons Pack  ₹349 ]
```

**Cart item actions:**
- Remove: `DELETE user_carts WHERE user_id = ? AND product_id = ?`
- Save for later: move to `user_wishlist` (DELETE from cart, INSERT into wishlist)

**Coupon validation:** POST `/api/coupons/validate` → checks `coupons` table. Applies to cart total.
**Wallet usage:** toggle to apply `user_wallets.balance` (up to cart total). Remainder charged via Cashfree.
**Cross-sell row:** `product_related WHERE relation_type = 'cross_sell'` for cart items, de-duplicated.
**Empty cart state:** illustration + "Your cart is empty" + "Discover products" CTA → `/discover`.

---

## 16. Checkout Page

**Route:** `/checkout`
**Schema tables:** `orders`, `order_items`, `guest_leads`, `user_carts`

Three-step progress bar:

```
  ① Customer details  ──────→  ② Payment  ──────→  ③ Done
```

### Step 1 — Customer Details

```
  ┌──────────────────────────────────────┐  ┌──────────────────────────┐
  │  Contact information                 │  │  Order summary           │
  │  ─────────────────────────────────── │  │  ────────────────────── │
  │  Email    [ sneha@example.com ]      │  │  Figma MC 2024   ₹1,999 │
  │  Name     [ Sneha Patel ]            │  │  UX Roadmap       ₹499  │
  │  Phone    [ +91 90000 00005 ]        │  │  ────────────────────── │
  │                                      │  │  Subtotal        ₹2,498 │
  │  ─────────────────────────────────── │  │  Coupon ARJUN20  -₹499  │
  │  ☐ Create an account to access your │  │  Wallet          -₹200  │
  │    purchases from any device         │  │  Total          ₹1,799  │
  │                                      │  │                         │
  │                [Continue to payment →]  │  🔒 Secured             │
  └──────────────────────────────────────┘  └──────────────────────────┘
```

**Logged-in buyer:** fields pre-filled from `profiles`. Account checkbox hidden.
**Guest:** collects name/email/phone. On "Continue" → INSERT `guest_leads` with `status = 'pending'`.

---

## 17. Payment Page

**Route:** `/checkout/payment`
**Schema tables:** `orders`, `order_items`, `payment_submissions`
**Provider:** Cashfree Payments (JS SDK)

```
  ┌──────────────────────────────────────┐  ┌──────────────────────────┐
  │  Payment method                      │  │  Order summary           │
  │  ─────────────────────────────────── │  │  (same as checkout)      │
  │                                      │  │                          │
  │  ◉ UPI                               │  │  Total to pay: ₹1,799   │
  │    [ UPI ID or app: GPay, PhonePe ]  │  │                          │
  │    [ or QR code ]                    │  │  🔒 Secured by Cashfree  │
  │                                      │  │  ⚡ Instant delivery     │
  │  ○ Credit / Debit Card               │  │     after payment        │
  │    [ 4242  4242  4242  4242 ]        │  └──────────────────────────┘
  │    [ MM/YY ]  [ CVV ]               │
  │    [ Cardholder name ]               │
  │                                      │
  │  ○ Net Banking                       │
  │    [ Select your bank ▾ ]            │
  │                                      │
  │  ○ Wallet (Paytm, PhonePe, etc.)    │
  │                                      │
  │  ─────────────────────────────────── │
  │  Wallet balance ₹200 applied         │
  │  Remaining to pay: ₹1,599            │
  │                                      │
  │  [      Pay ₹1,599 →      ]          │
  └──────────────────────────────────────┘
```

**Payment flow (exact sequence):**

1. Frontend calls `POST /api/checkout/create-order` with cart + buyer info
2. API creates Cashfree payment order → returns `order_token` + DigiOne `order_id`
3. Frontend launches `cashfree.checkout({ paymentSessionId: order_token })`
4. Cashfree handles payment modal (UPI / card / netbanking / wallet)
5. Cashfree sends webhook to `POST /api/webhooks/cashfree`
6. Webhook verifies HMAC signature (`orders.gateway_signature`)
7. On `PAYMENT_SUCCESS`:
   - UPDATE `orders SET status = 'completed', gateway_payment_id = ?, updated_at = NOW()`
   - INSERT `order_items` for each product
   - INSERT `creator_revenue_shares` per item (gross, fee %, fee amount, creator net)
   - UPDATE `creator_balances.pending_payout += creator_earnings_amount`
   - INSERT `user_product_access` per item with `product_link`
   - If `is_licensable = true`: INSERT `product_licenses` with generated `license_key`
   - INSERT `notifications` for creator (`type = 'sale'`)
   - INSERT `email_events` + queue background job `send_order_email`
   - UPDATE `coupons.current_uses += 1` if coupon was applied
   - INSERT `conversion_events (event_type = 'purchase', revenue = total_amount)`
8. Frontend polls `/api/orders/:orderId/status` or listens to Supabase realtime
9. Redirect to `/orders/:orderId/confirmation`

**Loading state during payment:** spinner overlay, "Processing your payment..."
**Payment failure:** red error banner at top, retry button, support link.

---

## 18. Order Confirmation

**Route:** `/orders/:orderId/confirmation`
**Schema tables:** `orders`, `order_items`, `products`, `user_product_access`, `product_licenses`

```
  ✅  You're in! Your order is confirmed.
  ────────────────────────────────────────────────────────────────

  Order #CF_ORD_001  ·  Paid ₹1,999  ·  Mar 18, 2026

  ┌──────────────────────────────────────────────────────────────┐
  │  Figma Masterclass 2024                                     │
  │  Course · Lifetime access                                   │
  │                                                              │
  │  📧 Access link sent to sneha@example.com                   │
  │  🔑 License key: FIGMA-2024-SNEHA-A1B2C3                    │
  │     (products.is_licensable = true)                         │
  │                                                              │
  │  Post-purchase instructions:                                 │
  │  "Check your email for your access link."                   │
  │  (products.post_purchase_instructions)                      │
  │                                                              │
  │  [Access your course →]     [Download files ↓]              │
  └──────────────────────────────────────────────────────────────┘

  ────────────────────────────────────────────────────────────────
  [View my library →]        [Continue shopping →]

  ────────────────────────────────────────────────────────────────
  You might also like:
  [ Figma Component Library ₹799 ]   [ 500 Icons Pack ₹349 ]
```

**Access link:** `user_product_access.product_link`
**License key:** `product_licenses.license_key` (shown only if `products.is_licensable = true`)
**Post-purchase instructions:** `products.post_purchase_instructions`

**Social share row:**

```
  Share your purchase:
  [Share on X/Twitter ↗]   [Share on WhatsApp ↗]
```

Pre-filled caption: "Just enrolled in Figma Masterclass 2024 by @arjunsharma — can't wait to start! 🎨 digione.in/arjun/figma-course"

---

## 19. Buyer Account — My Library

**Route:** `/account/library`
**Schema tables:** `user_product_access`, `products`, `product_licenses`

```
  My Library  (8 products)
  ────────────────────────────────────────

  [ All ▾ ]   [ Search my library... ]

  ┌──────────────────────────────────────────────────────────────┐
  │  [Thumb]  Figma Masterclass 2024                            │
  │  Arjun Sharma · Course · Purchased Mar 18, 2026 · ₹1,999   │
  │  🔑 FIGMA-2024-SNEHA-A1B2C3                                 │
  │  [Access course →]                                          │
  └──────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────┐
  │  [Thumb]  UI/UX Career Roadmap Ebook                        │
  │  Arjun Sharma · Ebook · PDF + Notion                        │
  │  Purchased Feb 15, 2026 · ₹499                             │
  │  [Download PDF ↓]   [Open Notion →]                         │
  └──────────────────────────────────────────────────────────────┘
```

CTA driven by `user_product_access.product_link`.
License key from `product_licenses.license_key`.
`product_licenses.expires_at` shown as "Expires Mar 2027" if set.

---

## 20. Buyer Account — Order History

**Route:** `/account/orders`
**Schema tables:** `orders`, `order_items`, `products`

```
  My Orders

  ┌──────────────────────────────────────────────────────────────────────┐
  │  Order #CF_ORD_001           Mar 18, 2026             ₹1,999        │
  │  Figma Masterclass 2024      ✅ Completed                            │
  │  Paid via UPI                                      [View order →]   │
  └──────────────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────────────┐
  │  Order #CF_ORD_003           Feb 22, 2026             ₹1,299        │
  │  Pro UI Kit — Web & Mobile   🔄 Refunded                            │
  │  Paid via Netbanking                               [View order →]   │
  └──────────────────────────────────────────────────────────────────────┘
```

Status pills: `completed` (green) · `pending` (amber) · `refunded` (slate) · `failed` (red) · `cancelled` (gray).

**Order detail page** (`/account/orders/:orderId`):
- Full breakdown with items, amounts, gateway ID
- Products with their access links
- Refund request button if `status = 'completed'` (opens support ticket pre-filled)
- Download invoice (PDF of order summary)

---

## 21. Buyer Account — Wallet

**Route:** `/account/wallet`
**Schema tables:** `user_wallets`, `user_wallet_transactions`

```
  My Wallet
  ─────────────────────────────────────────────

  ┌──────────────────────────────────────────────────────────────┐
  │  Current balance                                            │
  │  ₹200.00                                                    │
  │                                                              │
  │  💡 Use at checkout to reduce your payment amount           │
  └──────────────────────────────────────────────────────────────┘

  Transaction history

  ┌──────────────────────────────────────────────────────────────┐
  │  ↑ Referral reward           Mar 18, 2026      +₹200.00     │
  │  Code REF-ARJUN-001 used at signup             Bal: ₹200    │
  └──────────────────────────────────────────────────────────────┘
```

`user_wallet_transactions.direction` = `credit` (↑ green) / `debit` (↓ red).
`tx_type` values: `referral_reward`, `cashback`, `refund_credit`, `purchase_deduction`.

---

## 22. Buyer Account — Wishlist

**Route:** `/account/wishlist`
**Schema tables:** `user_wishlist`, `products`

```
  My Wishlist  (3 items)

  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
  │  [Thumbnail]   │  │  [Thumbnail]   │  │  [Thumbnail]   │
  │  Pro UI Kit    │  │  UX Roadmap    │  │  Golden Hour   │
  │  ₹1,299        │  │  ₹499          │  │  ₹299          │
  │  [Add to cart] │  │  [Add to cart] │  │  [Add to cart] │
  │  [♡ Remove]    │  │  [♡ Remove]    │  │  [♡ Remove]    │
  └────────────────┘  └────────────────┘  └────────────────┘
```

"Add to cart" → INSERT `user_carts`, DELETE `user_wishlist`.
"Remove" → DELETE `user_wishlist WHERE user_id = ? AND product_id = ?`.

---

## 23. Buyer Account — Profile

**Route:** `/account/settings`
**Schema tables:** `profiles`, `users`

Tabbed layout: Profile · Security · Notifications

**Profile tab:**
```
  Profile photo    [ Upload new photo ]
  Full name        [ Sneha Patel ]
  Email            sneha@example.com  ✅ Verified
  Mobile           +91 90000 00005   [Verify →]
                   (mobile_verified = false → OTP verify flow)

  [ Save changes ]
```

**Security tab:**
```
  Change password
  Current password    [ ____________ ]
  New password        [ ____________ ]
  Confirm new         [ ____________ ]
  [ Update password ]

  ─────────────────────────────────────────
  Danger zone
  [ Delete account ]  (requires email confirmation)
```

**Notifications tab:**
Preferences stored in `profiles.metadata` jsonb as `{ notifications: { sale: 'both', refund: 'email', review: 'in_app' } }`.

| Notification type | Email | In-app |
|------------------|-------|--------|
| Order confirmed | ✅ | ✅ |
| Refund initiated | ✅ | ✅ |
| Wallet credit | ✅ | ✅ |

---

## 24. Legal Pages

### Creator Store Legal Pages

**Routes:** `/:slug/about`, `/:slug/terms`, `/:slug/privacy`, `/:slug/refund`
**Schema:** `site_main.legal_pages` jsonb flags determine which pages are accessible.

```typescript
// legal_pages.about_us = true → /arjun/about renders
// legal_pages.terms    = true → /arjun/terms renders
// legal_pages.privacy  = true → /arjun/privacy renders
// legal_pages.refund   = true → /arjun/refund renders
// Any flag = false → 404
```

Each legal page: minimal layout, creator logo at top, content body with creator name / email / site title pre-filled from `site_main`. Simple typography, no sidebar.

### DigiOne Platform Legal Pages

**Routes:** `/legal/privacy`, `/legal/terms`, `/legal/refund`
Static MDX pages, versioned, date-stamped.

---

## 25. Shared Components — Public

### ProductCard

```typescript
interface ProductCardProps {
  product: {
    id: string
    name: string
    price: number
    thumbnail_url: string
    category: string
    is_licensable: boolean
  }
  avgRating?: number        // aggregate from product_ratings WHERE is_approved = true
  reviewCount?: number
  isPurchased?: boolean     // check user_product_access
  isWishlisted?: boolean    // check user_wishlist
  onAddToCart: () => void
  onWishlist: () => void
}
```

### StorefrontNav

Renders `site_navigation` row for a given `site_id`.
Handles: cart badge (from `user_carts` count), auth state (avatar vs login link), mobile hamburger menu.

### PriceDisplay

```typescript
interface PriceDisplayProps {
  price: number
  compareAtPrice?: number   // renders as strikethrough if higher than price
  couponDiscount?: number   // subtracted, shows green "discount applied"
  walletApplied?: number    // shown as separate deduction line
  currency?: string         // default 'INR', prefix ₹
}
```

### RatingStars

1–5 star display. Supports half-stars. Interactive mode (for review form) or static (for display). Shows numeric average + count.

### GatedContentPaywall

Shown on blog posts where `is_free = false` and buyer not in `user_product_access`.
Renders product card + buy CTA + "already purchased? log in" link.

### AnnouncementBanner

Thin strip from `sections` where `section_type = 'announcement_bar'`.
Dismisses to `localStorage[siteId + '_bar_dismissed']`. Re-appears if content changes.

### CouponInput

Calls `/api/coupons/validate` POST on "Apply" click.
Debounced 500ms. Inline success (green) / error (red) state. Shows calculated discount amount.

### CashfreePayment

Wraps Cashfree JS SDK `cashfree.checkout()`.
Props: `orderToken`, `orderAmount`.
Callbacks: `onSuccess(paymentId: string)`, `onFailure(error: Error)`, `onClose()`.
Loading state: `isPending` prop shows spinner overlay on parent button.

### CountdownTimer

Props: `endTime: Date`, `onExpire: () => void`.
Real-time display with `setInterval(1000)`. Pauses on tab visibility change. Cleans up on unmount.

---

## 26. SEO & Meta Strategy

### SaaS Homepage

```html
<title>DigiOne — Business in a Box for Indian Creators</title>
<meta name="description"
  content="Sell courses, ebooks, and digital products. UPI payouts, custom store,
           visual builder — all in one platform built for India.">
<meta property="og:image" content="https://digione.in/og/homepage.jpg">
<link rel="canonical" href="https://digione.in/">
```

### Creator Main Store

Dynamic, pulled from `site_main`:

```html
<title>{site_main.title}</title>
<meta name="description" content="{site_main.meta_description}">
<meta name="keywords" content="{site_main.meta_keywords}">
<meta property="og:image" content="{site_main.banner_url}">
<link rel="canonical" href="https://digione.in/{sites.slug}">
```

When `sites.domain_verified = true`, canonical points to `sites.custom_domain`.

### Single Product Page

```html
<title>{site_singlepage.title} | {site_main.title}</title>
<meta name="description" content="{site_singlepage.meta_description}">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "{products.name}",
  "description": "{products.description}",
  "image": "{products.thumbnail_url}",
  "offers": {
    "@type": "Offer",
    "price": "{products.price}",
    "priceCurrency": "INR",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "{avg_rating}",
    "reviewCount": "{review_count}"
  }
}
</script>
```

### Blog Post

```html
<title>{blog_posts.title} | {site_blog.title}</title>
<meta name="description" content="{blog_posts.description}">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "{blog_posts.title}",
  "datePublished": "{blog_posts.published_at}",
  "author": { "@type": "Person", "name": "{creator_name}" }
}
</script>
```

### Robots & Sitemap

- `sitemap.xml` dynamically generated: all `sites WHERE is_active = true`, all `blog_posts WHERE is_published = true`, all `products WHERE is_on_discover_page = true`.
- `robots.txt`: allow all public pages, disallow `/dashboard/*`, `/account/*`, `/checkout/*`, `/auth/*`.

---

## 27. Routing Architecture

### Next.js App Router Structure

```
app/
├── (marketing)/                    ← SaaS pages group (no storefront layout)
│   ├── page.tsx                    ← / (Homepage)
│   ├── pricing/page.tsx            ← /pricing
│   ├── discover/page.tsx           ← /discover
│   └── legal/[slug]/page.tsx       ← /legal/privacy  /legal/terms  /legal/refund
│
├── auth/                           ← Authentication pages (no nav/footer)
│   ├── signup/page.tsx
│   ├── login/page.tsx
│   ├── forgot-password/page.tsx
│   ├── reset-password/page.tsx
│   └── verify-email/page.tsx
│
├── cart/page.tsx                   ← /cart
│
├── checkout/
│   ├── page.tsx                    ← /checkout (details step)
│   └── payment/page.tsx            ← /checkout/payment
│
├── orders/
│   └── [orderId]/
│       └── confirmation/page.tsx   ← /orders/:orderId/confirmation
│
├── account/                        ← Buyer account (requires auth, role='user')
│   ├── library/page.tsx
│   ├── orders/
│   │   ├── page.tsx
│   │   └── [orderId]/page.tsx
│   ├── wallet/page.tsx
│   ├── wishlist/page.tsx
│   └── settings/page.tsx
│
├── dashboard/                      ← Creator dashboard (see dashboard spec)
│   └── ...
│
└── [slug]/                         ← Creator storefront (dynamic — catches all slugs)
    ├── layout.tsx                  ← Injects site_design_tokens as CSS vars + custom_css
    ├── page.tsx                    ← /:slug → resolves site_type → renders store/404
    ├── [childslug]/
    │   ├── page.tsx                ← /:slug/:childslug → resolves child site_type
    │   └── [postslug]/
    │       └── page.tsx            ← /:slug/:childslug/:postslug → blog post
    ├── about/page.tsx              ← /:slug/about (if legal_pages.about_us)
    ├── terms/page.tsx              ← /:slug/terms (if legal_pages.terms)
    ├── privacy/page.tsx            ← /:slug/privacy (if legal_pages.privacy)
    └── refund/page.tsx             ← /:slug/refund (if legal_pages.refund)
```

### Route Resolution Logic

```typescript
// app/[slug]/page.tsx
// Resolves which site type to render based on sites.site_type
export default async function StorefrontPage({ params }) {
  const site = await supabase
    .from('sites')
    .select('*, site_main(*), site_singlepage(*), site_blog(*)')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (!site) return notFound()

  switch (site.site_type) {
    case 'main':    return <MainStore site={site} />
    default:        return notFound()
  }
}

// app/[slug]/[childslug]/page.tsx
// Resolves child site by joining parent slug → child_slug
export default async function ChildPage({ params }) {
  const parent = await supabase
    .from('sites').select('id').eq('slug', params.slug).single()

  const child = await supabase
    .from('sites')
    .select('*, site_singlepage(*), site_blog(*), payment_requests(*)')
    .eq('child_slug', params.childslug)
    .eq('parent_site_id', parent.id)
    .single()

  if (!child) return notFound()

  switch (child.site_type) {
    case 'single':  return <SingleProductPage site={child} />
    case 'payment': return <PaymentLinkPage site={child} />
    case 'blog':    return <BlogPage site={child} />
    default:        return notFound()
  }
}
```

### URL Examples — Seed Data

| URL | Site type | Site ID (seed) |
|-----|-----------|----------------|
| `digione.in/arjun` | main store | fb0...001 |
| `digione.in/arjun/figma-course` | single product | fb0...002 |
| `digione.in/arjun/mentorship` | payment link | fb0...003 |
| `digione.in/priya` | main store | fb0...004 |
| `digione.in/priya/blog` | blog index | fb0...005 |
| `digione.in/priya/blog/10-figma-shortcuts` | blog post | — |
| `digione.in/rahul` | main store | fb0...006 |
| `digione.in/rahul/golden-hour` | single product | fb0...007 |
| `digione.in/neha` | main store | fb0...008 |
| `store.arjunsharma.in` | custom domain → arjun | fb0...001 |
| `priyamehta.design` | custom domain → priya | fb0...004 |

### Middleware — Auth Guards

```typescript
// middleware.ts
// Protected paths: /dashboard/*, /account/*, /checkout/*, /cart
// If no session → redirect to /auth/login?returnUrl=<current_path>
// Creator-only paths (/dashboard/*): check public.users.role = 'creator'
// Buyer-only paths (/account/*): check public.users.role = 'user'
```

---

*DigiOne Public Pages Design Specification v1.0 — March 2026*
*Based on: digione_schema_v4.sql (72 tables) · digione_seed_final.sql · digione_prd.docx*
*Companion document to: digione_dashboard_design.md*
