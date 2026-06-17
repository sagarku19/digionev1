# Dashboard Reference Map

> Last synced: 2026-06-14
> Generated from: `app/dashboard/**/page.tsx` + `src/components/dashboard/site-edit/tabs/**`
> Regenerate / audit: `/sync-docs`
> Read this FIRST for any `app/dashboard/**` task instead of globbing pages.

## Pages

| Route | Purpose | Hooks | Key components | API routes | RLS / Notes |
|---|---|---|---|---|---|
| `/dashboard` | Overview — KPIs, recent orders, quick-links, revenue chart | `useAnalytics`, `useProducts`, `useOrders`, `useSites` | `StatCard`, `KpiGrid`, `PageHeader`, `Card`, `EmptyState`, `Skeleton` | — | — |
| `/dashboard/analytics` | Revenue + order analytics with period toggle (7D/30D/90D) and recharts | `useAnalytics` | `PageHeader`, `Card`, `KpiGrid`, `EmptyState`, `Skeleton` | — | — |
| `/dashboard/autodm` | Auto DM / Instagram automation hub — PROTOTYPE, no real data | — | — | — | No hooks, mock data only; not wired |
| `/dashboard/automation` | Automation tools hub — links to email, WhatsApp, Telegram, Sheets | — | — | — | Static nav page |
| `/dashboard/automation/email` | Email provider config + automation sequences (UI only) | — | — | — | No persistence yet; prototype |
| `/dashboard/automation/google-sheets` | Google Sheets sync config (UI only) | — | — | — | No persistence yet; prototype |
| `/dashboard/automation/telegram` | Telegram bot config + event toggles (UI only) | — | — | — | No persistence yet; prototype |
| `/dashboard/automation/whatsapp` | WhatsApp API config + message templates (UI only) | — | — | — | No persistence yet; prototype |
| `/dashboard/customers` | Customer CRM — aggregated buyer list, CSV export, sort | `useCustomers` | `DataTable`, `PageHeader`, `Skeleton` | — | reads `orders` via hook |
| `/dashboard/earnings` | Earnings overview + payout request modal + payout history; links to `/dashboard/settings/billing` for KYC | `useEarnings` | `PageHeader`, `Card`, `KpiGrid`, `EmptyState`, `Skeleton`, `StatusPill` | `POST /api/payouts/request` | reads `creator_balances`, `creator_kyc`, `creator_payouts` |
| `/dashboard/help` | FAQ accordion + quick-links to docs / support | — | `PageHeader`, `Card` | — | — |
| `/dashboard/integration` | Third-party integration cards (AI, Analytics, Bot, API Keys) — static | — | `PageHeader`, `Card` | — | — |
| `/dashboard/marketing` | Marketing hub — stats overview + links to sub-tools | `useMarketingStats` | — | — | — |
| `/dashboard/marketing/affiliates` | Affiliate CRUD — invite partners, set commission, toggle, copy link | `useAffiliates` | `StatusPill` | — | — |
| `/dashboard/marketing/community` | Community posts — compose, like, delete, category filter | `useCreator`, `useCommunity` | — | — | reads `community_posts`, `community_reactions` |
| `/dashboard/marketing/coupons` | Coupon CRUD — create, toggle, delete, bulk code gen, expiry check | `useCoupons` | — | — | direct `createClient` for toggle/delete |
| `/dashboard/marketing/leads` | Captured leads — list, search, site filter, CSV export | `useGuestLeads` | — | — | — |
| `/dashboard/marketing/referrals` | Referral codes — create, toggle, delete, per-code analytics | `useReferrals` | — | — | reads `referral_codes`, `order_referrals` |
| `/dashboard/marketing/services` | Creator services (1:1, retainer, audit) + booking management | `useServices` | — | — | reads `services`, `service_bookings` |
| `/dashboard/media` | Media library — browse/upload Supabase Storage, folder view | — | — | — | direct `createClient` + `getCreatorProfileId`; bucket `uploads` |
| `/dashboard/notifications` | Notification feed — read/unread, mark-all-read | `useNotifications` | `PageHeader`, `Card`, `EmptyState`, `Skeleton` | — | — |
| `/dashboard/orders` | Order list — detail drawer, status filter, CSV export | `useOrders` | `PageHeader`, `EmptyState`, `Skeleton` | — | reads `orders` |
| `/dashboard/payouts` | Redirect → `/dashboard/earnings` | — | — | — | Server-side redirect only |
| `/dashboard/products` | Product grid + upsell panel; create-product and create-upsell modals | `useProducts`, `useUpsellPages` | `PageHeader`, `EmptyState`, `Skeleton`, `CreateProductModal`, `CreateUpsellModal`, `DeleteUpsellConfirm`, `BulkActionConfirm` | — | — |
| `/dashboard/products/[productId]` | Product editor — basic info, pricing, files, marketing, settings tabs | `useProducts` | — | — | — |
| `/dashboard/products/upsells/[upsellId]` | Upsell page editor — config, products, contact, theme, SEO tabs | `useUpsellPage`, `useUpsellPages`, `useProducts` | — | — | — |
| `/dashboard/settings` | Settings hub — links to profile, billing, subscription, library | — | `PageHeader` | — | — |
| `/dashboard/settings/billing` | KYC form — PAN, bank details, status display | `useEarnings` | `PageHeader`, `Card`, `Skeleton` | — | reads `creator_kyc`; direct `createClient` for KYC upsert |
| `/dashboard/settings/library` | Buyer's purchased-product library | `useLibrary` | `PageHeader`, `Card`, `EmptyState`, `Skeleton` | — | reads `user_product_access` |
| `/dashboard/settings/profile` | Creator profile editor — name, bio, avatar, social links, email/mobile verify | `useProfileQuery`, `useProfileMutations` | `PageHeader`, `Card`, `Skeleton` | — | direct `createClient` + `getCreatorProfileId` for avatar upload |
| `/dashboard/settings/subscription` | Plan picker — Free / Pro / Business pricing cards | — | `PageHeader`, `Card` | — | Static UI; no plan change wired |
| `/dashboard/sites` | Sites list — type filter tabs, delete, publish/unpublish, copy link | `useSites` | `PageHeader` | — | — |
| `/dashboard/sites/edit/linkinbio/[id]` | Link-in-bio editor — composes shared `SiteEditorShell` + `EditorPanel` (Content/Design/Settings). Content = registry-driven `SectionList` (drag/hide/duplicate/delete/add) + drill-in `SectionDetail`; Design = templates + `BioAppearanceEditor`; Settings = URL/SEO/publish. Pinned Profile row → `BioProfileEditor`. (Reference build for the shell; main/single/payment migrate in later specs.) | `useLinkInBioSiteQuery` | `SiteEditorShell`, `EditorPanel`, `SectionList`, `SectionDetail`, `BioProfileEditor`, `BioAppearanceEditor`, `BlockBody` (block editors) | `GET /api/sites/check-slug` | direct `createClient` for saves |
| `/dashboard/sites/edit/main/[id]` | Main store editor — 9-tab split-screen (header, main, content, sections, footer, template, appearance, settings, advanced) | `useSiteEditQuery` | `HeaderEditor`, `FooterEditor`, `ThemeEditor`, `SectionManager`, `ProductAssigner`, `ImagePickerModal`, `BioAppearanceEditor` | `GET /api/sites/check-slug` | direct `createClient` for saves |
| `/dashboard/sites/edit/payment/[id]` | Payment link editor — title, description, amount, flexible toggle | `useSiteEditQuery`, `useSiteEditMutations` | `SiteVisualEditor` | — | — |
| `/dashboard/sites/edit/singlepage/[id]` | Single-page site editor — 9-tab split-screen (logo, product, content, template, appearance, social, checkout, settings, advanced) | `useSinglePageSiteQuery`, `useProducts` | `SinglePage*Editor` tabs, `BioAppearanceEditor` | `GET /api/sites/check-slug` | direct `createClient` for saves |
| `/dashboard/sites/new` | Site creation hub — pick site type, routes to sub-wizards | `useSites` | `Card` | — | — |
| `/dashboard/sites/new/linkinbio` | Link-in-bio creation wizard — slug, username, review steps | — | `Card` | `GET /api/sites/check-slug`, `POST /api/sites/create` | — |
| `/dashboard/sites/new/payment` | Payment link creation wizard — title, amount, review steps | — | `Card` | `POST /api/sites/create` | — |
| `/dashboard/sites/new/singlepage` | Single-page site creation wizard — product picker, slug, review | `useProducts` | `Card` | `GET /api/sites/check-slug`, `POST /api/sites/create` | — |
| `/dashboard/sites/new/store` | Main store creation wizard — slug, details, review steps | — | `Card` | `GET /api/sites/check-slug`, `POST /api/sites/create` | — |

## Site-edit editors (`src/components/dashboard/site-edit/tabs/`)

| Site type | Editor entry | Tab files |
|---|---|---|
| main store | `HeaderEditor.tsx`, `FooterEditor.tsx`, `ThemeEditor.tsx`, `SettingsPanel.tsx` (shared) | `HeaderEditor`, `FooterEditor`, `ThemeEditor`, `SettingsPanel`; also uses linkinbio `BioAppearanceEditor` for appearance tab |
| single-page | `singlepage/SinglePage*Editor.tsx` | `SinglePageHeroEditor`, `SinglePageLogoEditor`, `SinglePageProductEditor`, `SinglePageContentEditor`, `SinglePageTrustEditor`, `SinglePageSocialEditor`, `SinglePageCheckoutEditor`, `SinglePageAppearanceEditor`, `SinglePageTemplateEditor`, `SinglePageSettingsEditor`, `SinglePageAdvancedEditor`; types in `singlepage-types.ts` |
| link-in-bio | `linkinbio/sectionRegistry.tsx` (wraps `blockEditors/registry` + `BLOCK_CATEGORIES` + `summarize`) | `BioProfileEditor`, `BioAppearanceEditor`; block editors in `linkinbio/blockEditors/` (`registry.tsx`, `HeaderBlock`, `TextBlock`, `HeadingBlock`, `SpaceBlock`, `VideoBlock`, `HtmlEmbedBlock`, `SpotifyBlock`, `BannerBlock`, `UrlBlock`, `ImageBlock`, `SocialIconsBlock`, `LeadFormBlock`, `ProductBlock`, `_shared.tsx`). `BioLinksEditor.tsx` is superseded by the shell's `SectionList` (kept only for its exported `BLOCK_CATEGORIES`). |
| payment link | `SiteVisualEditor.tsx` (top-level component, not in `tabs/`) | No sub-tab files; configuration rendered inline in `app/dashboard/sites/edit/payment/[id]/page.tsx` |

### Shared editor shell (`src/components/dashboard/site-edit/shell/`)

Introduced 2026-06-17 (Spec 1). Reusable split-screen shell the editors compose: `SiteEditorShell.tsx` (top header + zoom-aware iframe preview, tokenized), `EditorPanel.tsx` (Content/Design/Settings switch), `SectionList.tsx` + `AddSectionPicker.tsx` + `SectionDetail.tsx` (section-list + drill-in engine), `types.ts` (`SectionRegistry`/`SectionDef`/`SectionItem`), `reorder.ts` (`moveItem`). Each editor supplies a section registry. **linkinbio** is migrated; **main/single/payment** still use their own shells pending later specs.
