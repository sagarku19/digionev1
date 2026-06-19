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
| `/dashboard/sites/edit/linkinbio/[id]` | Link-in-bio editor — premium 3-zone shell `LinkInBioShell` (sidebar nav · canvas · live preview). Sidebar sections: Content (`ProfileCard` summary → `SectionList` of inline-expand `BlockCard`s → Add), Profile (`BioProfileEditor`), Template (`BioTemplates` — two tabs: Design themes = colours/style only, Content layouts = prebuilt blocks + design), Design (`BioAppearanceEditor`), Settings (URL/SEO/publish); Insights/Course/Tools render `ComingSoon`. Inline-expand replaces drill-in; mobile = sidebar drawer + Edit/Preview tab. New sites arrive with `?setup=1` and show `BioSetupWizard` (Profile → Picture → Social → Template, Skip/Next). | `useLinkInBioSiteQuery` | `LinkInBioShell`, `EditorTopBar`, `PreviewPane`, `EditorSidebar`, `ProfileCard`, `SectionList`, `BlockCard`, `ComingSoon`, `BioProfileEditor`, `BioTemplates`, `BioSetupWizard`, `BioAppearanceEditor`, `BlockBody` | `GET /api/sites/check-slug` | direct `createClient` for saves |
| `/dashboard/sites/edit/main/[id]` | Main store editor — 9-tab split-screen (header, main, content, sections, footer, template, appearance, settings, advanced) | `useSiteEditQuery` | `HeaderEditor`, `FooterEditor`, `ThemeEditor`, `SectionManager`, `ProductAssigner`, `ImagePickerModal`, `BioAppearanceEditor` | `GET /api/sites/check-slug` | direct `createClient` for saves |
| `/dashboard/sites/edit/payment/[id]` | Payment link editor — title, description, amount, flexible toggle | `useSiteEditQuery`, `useSiteEditMutations` | `SiteVisualEditor` | — | — |
| `/dashboard/sites/edit/singlepage/[id]` | Single-page site editor — premium `EditorShell` (sidebar nav · dotted canvas · live `PreviewPane` iPhone). Sections: logo, product, content, template, appearance, social, a **Checkout** group (subheading) with **Checkout Page** (`SinglePageCheckoutEditor`) + **Checkout Settings** (`SinglePageCheckoutSettingsEditor` — contact-field modes, login toggle, upsell product picker), settings, advanced. Selecting a Checkout section postMessages `sp-scroll` so the preview scrolls to the `#checkout` block. Floating brand Save + dirty state, undo/redo (fixed), unsaved-changes leave guard. Token + brand throughout. | `useSinglePageSiteQuery`, `useProducts` | `EditorShell`, `PreviewPane` (shared iPhone preview + `QRModal`), `SinglePage*Editor` tabs (shared `_shared.tsx` `SectionCard`/`INPUT`), `SinglePageCheckoutSettingsEditor`, `SinglePageAppearanceEditor` | `GET /api/sites/check-slug` | direct `createClient` for saves |
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
| link-in-bio | `linkinbio/sectionRegistry.tsx` (wraps `blockEditors/registry` + `BLOCK_CATEGORIES` from `blockCategories.tsx` + `summarize`) | `BioProfileEditor`, `BioAppearanceEditor`, `BioTemplates`, `BioSetupWizard`; block editors in `linkinbio/blockEditors/` (`registry.tsx`, `HeaderBlock`, `TextBlock`, `HeadingBlock`, `SpaceBlock`, `VideoBlock`, `HtmlEmbedBlock`, `SpotifyBlock`, `BannerBlock`, `UrlBlock`, `ImageBlock`, `SocialIconsBlock`, `LeadFormBlock`, `ProductBlock`, `_shared.tsx` — shared `INPUT`/`Chip`/`AlignPicker`/`SEG`/`ACCENT_BTN`/`HELP`). `blockCategories.tsx` holds the block-type catalogue + re-exports the `BioLink` type (canonical in `blockEditors/types.ts`). All linkinbio editors are token-based with brand-red (`EDITOR_ACCENTS.brand`) accent. The old `BioLinksEditor.tsx` (superseded by `SectionList`) was removed. |
| payment link | `SiteVisualEditor.tsx` (top-level component, not in `tabs/`) | No sub-tab files; configuration rendered inline in `app/dashboard/sites/edit/payment/[id]/page.tsx` |

### Editor packages

**`src/components/dashboard/site-edit/editor/`** (2026-06-18 premium redesign — linkinbio; 2026-06-19 generalized to single-page):
`EditorShell.tsx` (the generic premium chrome: sidebar nav · dotted canvas · preview column; nav/section-meta/`siteType`/preview injected as props; floating brand Save with dirty state). `LinkInBioShell.tsx` is now a thin wrapper over `EditorShell` supplying the link-in-bio nav + iPhone `PreviewPane`; the single-page page composes `EditorShell` directly. Both editors share the same `PreviewPane.tsx` iPhone preview (+ `QRModal.tsx`) as the preview column. `EditorTopBar.tsx` (legacy back/title/undo-redo/theme/save, still used by `SiteEditorShell`), `PreviewPane.tsx` (fixed-width iPhone preview iframe on a dotted backdrop; QR launcher button opens a popup with the link, a scannable `qrcode.react` QR, and copy/open/share actions), `EditorSidebar.tsx` (nav rail; renders items in array order, inserting a subheading at each non-`main` group boundary via `SidebarItem.group`/`groupLabel` — e.g. Tools, Checkout; header page-switcher dropdown lists the creator's pages of the current `siteType` via `useSites()` — link-in-bio or single — to jump between editors; footer has undo/redo above collapse), `BlockCard.tsx` (inline-expand block card hosting `BlockBody`), `ProfileCard.tsx` (profile summary), `ComingSoon.tsx` (placeholder). Premium surface uses `--radius-xl`/`--shadow-card` tokens (dashboard color tokens kept for dark mode).

**`src/components/dashboard/site-edit/shell/`** (2026-06-17 foundation): `SectionList.tsx` (renders `BlockCard`s, drag/expand/add — single-open accordion), `AddSectionPicker.tsx`, `types.ts` (`SectionRegistry`/`SectionDef`/`SectionItem`), `reorder.ts` (`moveItem`). `SiteEditorShell.tsx` (now re-composes `EditorTopBar`+`PreviewPane`) is retained for **main/single/payment** to migrate later. `EditorPanel.tsx` + `SectionDetail.tsx` were **removed** in the redesign (sidebar + inline-expand replaced them).
