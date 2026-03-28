digionev1
Current State: 70% Complete MVP
What works: Products, checkout, Cashfree payments, basic analytics, coupons, sites builder, KYC/payouts
What's stub/missing: File uploads, blog editor, affiliates, referrals, email system, A/B testing, store settings, onboarding

Full SaaS Upgrade Plan
PHASE 1 — Foundation Completions (Everything broken/missing)
Make the MVP actually shippable

1.1 File Upload System

Complete /api/upload with Supabase Storage signed URLs
Wire product content file uploads (PDFs, ZIPs, videos)
Wire thumbnail/banner image uploads everywhere
Add file size limits, type validation, progress indicators
1.2 Product Delivery

Secure download links (time-limited signed URLs)
Buyer library with download access
Email with download link on purchase
1.3 Blog Dashboard

Rich text editor (TipTap or similar) in /dashboard/sites/[siteId]/blog/
Create/edit/publish/schedule blog posts
Tag management, SEO fields, featured image
Members-only vs free post toggle
1.4 Email Transactional System

Integration with Resend or Nodemailer
Order confirmation email
Product delivery email with download links
Payout processed email
Lead capture welcome email
1.5 Store Settings (Fix placeholder)

Store name, logo, favicon upload
Primary color, font
Social links
Contact email configuration
PHASE 2 — Creator Control Center (Full control over everything)
Every piece of the business in one dashboard

2.1 Advanced Product Management

Product variants (e.g., Starter / Pro bundle)
Upsells & order bumps
Product bundles (multiple products at once)
Free vs paid with locked preview
Product access control (one-time, subscription, lifetime)
2.2 Customer Management (CRM)

Full customer list with purchase history
Customer profiles (total spent, products owned, last seen)
Segment by: product purchased, spend tier, source
Manual access grant/revoke
Notes/tags on customers
Export customer CSV
2.3 Complete Affiliate System

Creator sets commission % per product
Invite affiliates by email (assigned unique link)
Affiliate dashboard (their earnings, clicks, conversions)
Affiliate payout management for creator
UTM tracking & attribution
2.4 Referral Program

Creator enables buyer-refer-buyer
Configurable: discount for referrer + referred
Track referral chain
Reward credit to wallet or discount
2.5 Discount & Promotions Engine

Advanced coupon rules: per-product, min order, first purchase only
Flash sale: timed price override on product
Bundle discounts
Auto-apply discount for returning buyers
2.6 Lead Management & Email Marketing

Full lead list with source, capture date, email
Segment leads: converted vs not
Broadcast email to leads (newsletter send)
Simple drip sequences (3-step automation)
CSV export
2.7 Notifications & Activity Feed

Real-time notification bell (order, payout, lead)
Activity feed in dashboard (timeline of events)
Push/browser notification support
PHASE 3 — Storefront Builder v2 (Creator builds pro pages)
No-code page builder with full design control

3.1 Visual Section Editor

Click section → edit settings in right sidebar (live preview)
Real-time preview of changes before saving
Section-level design overrides (colors, spacing, fonts)
Mobile preview toggle
3.2 Design System Control

Per-site color palette picker (primary, accent, background, text)
Font selector (Google Fonts integration)
Button style (rounded, sharp, pill)
Spacing density (compact/comfortable/spacious)
Dark/light mode toggle per site
3.3 New Section Types

Sticky header with cart count
Product feature highlights (icon + text grid)
Social media embed (Instagram feed, tweet)
Multi-product bundle builder section
Calendar/booking embed
Countdown with auto-redirect on end
Exit intent popup
Floating WhatsApp/Telegram CTA
3.4 Navigation Builder

Visual nav menu editor
Multi-level dropdowns
Link to: product, blog, external URL, page anchor
3.5 SEO & Meta Control

Per-page title, description, OG image
Custom slug
Sitemap auto-generation
robots.txt control
3.6 Custom Domain + SSL

Add CNAME instructions with auto-verify
SSL auto-provisioned (Vercel or Caddy)
Subdomain option on digione.ai
PHASE 4 — Monetization Modes (Multiple ways to earn)
Creator gets more ways to make money

4.1 Subscription Products

Monthly/yearly recurring pricing
Gated content for subscribers only
Subscriber-only blog posts
Cancel/pause subscription handling
Dunning (retry failed payments)
4.2 Payment Plans

Split ₹3000 into 3 × ₹1000 installments
Automatic recurring charge via Cashfree
Plan completion handling (unlock full access)
4.3 Free + Paid Tiers (Freemium)

Part of product free (preview), rest locked
Upgrade prompt inline
4.4 Tip/PWYW (Pay What You Want)

Buyer sets amount (min enforced)
Great for templates, resources
4.5 Early Bird Pricing

Price auto-increases after N sales or date
"X seats left at this price" display
4.6 Upsell Funnel

Post-checkout one-click upsell page
"Add ₹499 for the template pack" before payment completes
Order bump checkbox in checkout
PHASE 5 — Analytics & Insights (Data-driven creator)
Real business intelligence

5.1 Conversion Analytics

Funnel: View → Add to cart → Checkout → Purchase
Per-product conversion rate
Drop-off identification
Heatmap integration (Hotjar embed)
5.2 Revenue Analytics

Daily/weekly/monthly revenue
MRR (for subscription products)
Revenue by product, by source, by site
Revenue forecasting
5.3 Traffic & Source Attribution

UTM parameter tracking
Traffic sources (direct, social, affiliate, referral)
Per-page view counts
5.4 A/B Testing (Real)

Create variant A/B for headlines, prices, CTAs
Traffic split (50/50 or weighted)
Auto-declare winner by conversion rate
Statistical significance badge
5.5 Customer Insights

Average order value
Repeat purchase rate
Top customers by LTV
Churn rate (for subscriptions)
PHASE 6 — Platform SaaS Layer (Creator subscription to DigiOne)
The business model of DigiOne itself

6.1 Creator Subscription Plans

Feature	Free	Plus (₹999/mo)	Pro (₹2499/mo)
Products	3	20	Unlimited
Sites	1	5	Unlimited
Platform fee	10%	7%	5%
File storage	1 GB	10 GB	100 GB
Analytics	30 days	90 days	1 year
Affiliates	✗	✓	✓
Custom domain	✗	✓	✓
A/B Testing	✗	✗	✓
Email sends	✗	5k/mo	50k/mo
6.2 Billing Dashboard

Current plan display
Upgrade/downgrade flow
Cashfree subscription billing for creator
Invoice history
Usage metrics (products used, storage used)
6.3 Onboarding Flow

Step-by-step wizard on first login
Create profile → Set up store → Add first product → Publish
Progress tracker (% complete)
Contextual tooltips (Intercom-style)
6.4 Super Admin Panel

All creators, all sites, all revenue
Creator KYC approval/rejection
Payout approval queue
Platform revenue dashboard
Feature flags per creator
PHASE 7 — Integrations & Extensions (Connect to creator's tools)
7.1 Email Marketing Integrations

Mailchimp, ConvertKit, Brevo sync
Auto-add buyer to email list on purchase
Tag-based segmentation
7.2 Webhook Outgoing

Creator can set webhook URL
Events: order.created, order.paid, lead.captured
Payload includes order & customer data
7.3 Zapier / Make Integration

Pre-built Zaps: new order → Notion row, Google Sheet, Slack
7.4 WhatsApp Notifications

Creator receives WhatsApp on every sale
Buyer receives download link via WhatsApp
7.5 Telegram Integration

Creator bot: sales alerts in Telegram
PHASE 8 — Mobile & PWA (Creator manages on phone)
8.1 Dashboard PWA

Installable on Android/iOS
Offline analytics view (cached data)
Push notification for sales
8.2 Responsive Dashboard Overhaul

Full mobile-optimized dashboard (currently desktop-first)
Mobile-friendly product creation
Quick stats on home screen
Prioritized Build Order
Priority	Phase	Effort	Impact
1	Phase 1 — Fix broken things	1 week	Launch-blocker
2	Phase 2.1-2.3 — CRM + Affiliates	2 weeks	Revenue unlock
3	Phase 3 — Builder v2	2 weeks	Creator retention
4	Phase 4 — Monetization modes	2 weeks	More revenue models
5	Phase 5 — Real analytics	1 week	Engagement
6	Phase 6 — SaaS billing layer	2 weeks	Platform revenue
7	Phase 7 — Integrations	2 weeks	Ecosystem
8	Phase 8 — Mobile	1 week	Accessibility