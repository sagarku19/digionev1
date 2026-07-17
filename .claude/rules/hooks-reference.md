---
noteId: "c2eafa315a5711f183978dfe119e58b2"
tags: []

---

# Key Hooks Reference

Always use TanStack Query via custom hooks — never raw Supabase in client components.

## Folder structure (2026-06-20)

Hooks live in domain subfolders under `src/hooks/` — import with the full path:

| Subfolder | Hooks |
|---|---|
| `admin/` | `usePayoutQueue` (super-admin payout queue) |
| `auth/` | `useAuthSession`, `useLoginMutation` |
| `creator/` | `useCreator`, `useProfile` (`useProfileQuery`/`useProfileMutations`), `useSubscription` + `useSubscriptionPlans` (`useSubscription.ts`), `useKycDocuments` |
| `products/` | `useProducts`, `useProductPage`, `useStoreProducts`, `useProductFiles` |
| `commerce/` | `useOrders` (+ `useRefundOrder`, `useOrderRefundInfo`), `useOrderEarnings` (`['orders','earnings']` — per-order gross+fee map from `transaction_ledger` sale rows), `useCustomers`, `useEarnings`, `useCart` (+ `useCartTotal`), `useLibrary`, `useTax` (`usePayoutTaxPreview`, `useTaxSummary`, `useAddGstin`), `useInvoices` (`useDownloadSaleInvoice`, `useDownloadCommissionInvoice`, `useCommissionMonths`), `useStatements` (`useDownloadAnnualStatement`, `useStatementYears`) |
| `storage/` | `useMyMedia`, `useOwnAssets` + `useDigioneStock` (both in `useMediaLibrary`) |
| `marketing/` | `useCoupons`, `useAffiliates`, `useReferrals`, `useMarketingStats`, `useGuestLeads`, `useAbTests`, `useCommunity`, `useServices`, `useShortLinks` |
| `analytics/` | `useAnalytics` |
| `notifications/` | `useNotifications` |
| `instaauto/` | `useInstaAccount`, `useInstaAutomations`, `useInstaLeads`, `useInstaMessages`, `useInstaAnalytics` (Instagram Auto DM — see `/dashboard/autodm`) |
| `sites/` | `useSites`, `useSiteEdit`, `useLinkInBioSite`, `useSinglePageSite` |
| `site-editor/` | `useEditorHistory`, `useUnsavedChanges`, `useSlugCheck`, `saveDesignTokens` (editor-internal logic) |
| `storefront/` | `useStorefront` |

Example: `import { useProducts } from '@/hooks/products/useProducts'`.

> Root-level exception: `useConfirm` lives at `src/hooks/useConfirm.tsx` (a UI confirm-dialog hook, not a data hook) — the only hook outside a domain subfolder.

## Query key convention

All hooks use hierarchical keys: `[domain, kind, ...identifiers]`. Examples:
`['creator','profile']`, `['products','list']`, `['products','detail', id]`,
`['sites','list']`, `['sites','edit-state', siteId, { include }]`, `['auth','session']`.
This lets `queryClient.invalidateQueries({ queryKey: ['products'] })` clear a whole domain.

| Hook | Returns |
|---|---|
| `useCreator()` | `{ profile }` — authenticated creator's profile |
| `useProducts()` | `{ products }` — creator's product list |
| `useNotifications()` | `{ unreadCount, notifications }` |
| `useOrders()` | `{ orders }` |
| `useEarnings()` | `{ creatorBalances, payouts, kyc, isLoading, refreshEarnings, updateKyc, isUpdatingKyc }` |
| `useCustomers()` | `{ customers }` |
| `useSites()` | `{ sites }` — creator's storefront sites |
| `useStorefront(slug)` | `{ profile }` — public creator profile for the given slug |
| `useCart()` | Cart state for buyer checkout — `items` + `addItem`/`removeItem`/`replaceCartWith`/`clearCart`. `addItem` returns `'added' \| 'exists' \| 'conflict'` (single-creator rule); `replaceCartWith` for the replace-cart confirm. No drawer state — the mini-cart drawer was removed 2026-07-17; adds + cart icons navigate to `/cart`. Also exports `useCartTotal`, `useHydratedCartCount` |
| `useAnalytics(dateRange)` | Analytics data for a `{ start, end }` date range |
| `useCoupons()` | Coupon management |
| `useAffiliates()` | Affiliate program data |
| `useProductPage(creatorId, slug)` | Single published product by slug — used on product pages |
| `useStoreProducts(creatorId)` | All published products for a creator's storefront |
| `useAbTests()` | `{ tests }` — A/B tests for the logged-in creator; resolves `profiles.id` and selects `products(name)` |
| `useLibrary()` | Logged-in buyer's purchased products — reads user_product_access (RLS SELECT-own) joined to products; snapshot columns + `snapshot_metadata` keep deleted products accessible; returns `links[]` — the live product's links **merged** with the purchased `snapshot_metadata` (`mergeAccessLinks`: live wins per label, removed links retained, edits update in place) so a purchased link never disappears. Files minted on demand via `GET /api/deliverables/[productId]` (archive-aware: keeps files removed after purchase). See `src/lib/shared/access-links.ts` + `src/components/store/DeliveryLinks.tsx` |
| `useGuestLeads(filterSiteId?)` | `{ leads }` — captured email leads, optionally filtered by site |
| `useProfileQuery(creatorId?)` | `{ data: profile, isLoading, error }` — read-only profile |
| `useProfileMutations()` | `{ updateProfile, setEmailVerified, setMobileVerified, isUpdating }` |
| `useProfile(creatorId?)` | composes both — for consumers that need read + write |
| `useServices()` | `{ services, bookings, createService, updateService, deleteService, toggleActive, updateBookingStatus }` |
| `useReferrals()` | `{ codes, redemptions, createCode, toggleActive, deleteCode }` |
| `useCommunity()` | `{ posts, creatorId, createPost, deletePost, toggleReaction }` |
| `useMarketingStats()` | `{ stats, isLoading }` — aggregated marketing dashboard counts |
| `useSiteEditQuery(siteId, { include })` | site + selected related tables (`'main' \| 'nav' \| 'tokens' \| 'sections' \| 'assignments'`) |
| `useSiteEditMutations(siteId)` | `{ savePaymentConfig, isSavingPayment }` |
| `useLinkInBioSiteQuery(siteId)` | `{ site, tokens, page, blocks, items, products }` |
| `useSinglePageSiteQuery(siteId)` | `{ site, tokens, page }` |
| `useAuthSession()` | `{ isLoggedIn, userEmail, profile, userRole, authStatus, isLoading }` — invalidate via `['auth','session']`. `authStatus: 'authenticated' \| 'unauthenticated' \| 'degraded'` — `degraded` = auth temporarily unreachable (network stall), never treated as logout; only `unauthenticated` is definitive (dashboard `AuthGuard` redirects on it). The file also exports `signInWithRetry` (one auto-retry on a stalled sign-in), used by `useLoginMutation` |
| `useInstaAccount()` | `{ account, connectConfigured, isLoading, addDemoAccount, disconnect, isMutating }` — linked IG account (token-free) via `GET /api/instaauto/account` |
| `useInstaAutomations(accountId?)` | `{ automations, isLoading, createAutomation, updateAutomation, deleteAutomation, isMutating }` — owner-CRUD on `instaauto_automations` (+ keywords); update guards on `version` (optimistic concurrency), delete is a soft-delete |
| `useInstaLeads(accountId?)` | `{ leads, isLoading }` — latest 500 `instaauto_leads` rows |
| `useInstaMessages(accountId?)` | `{ messages, isLoading }` — latest 200 `instaauto_messages` (+ automation name) |
| `useInstaAnalytics(accountId?)` | query with `{ totalLeads, totalSent, totalFailed }` counts |

## Normalized query keys (2026-06-13)

All keys follow `[domain, kind, ...ids]`. Use these exact keys when invalidating:

| Hook | Query key |
|---|---|
| `useAbTests()` | `['ab-tests','list']` |
| `useAffiliates()` | `['affiliates','list']` |
| `useAnalytics(dateRange)` | `['analytics','range', startDate, endDate]` |
| `useCoupons()` | `['coupons','list']` |
| `useCreator()` | `['creator','profile']` |
| `useCustomers()` | `['customers','list']` |
| `useEarnings()` | `['earnings','summary']` |
| `useGuestLeads(filterSiteId?)` | `['leads','list', filterSiteId]` |
| `useLibrary()` | `['library','list']` |
| `useNotifications()` | `['notifications','list']` (polls every 120 s) |
| `useOrders()` | `['orders','list']` |
| `useOrderRefundInfo(orderId)` | `['orders','refund-info', orderId]` (sale-ledger fee + prior refunds for the refund preview) |
| `useProductPage(creatorId, slug)` | `['products','page', creatorId, slug]` |
| `useProducts()` | `['products','list']` / `['products','detail', id]` / `['products','trash']` (also `trashedProducts`, `restoreProduct`, `permanentlyDeleteProduct`) |
| `useSites()` | `['sites','list']` / `['sites','trash']` (also `trashedSites`, `restoreSite`, `permanentlyDeleteSite`) |
| `useStorefront(slug)` | `['storefront','detail', slug]` |
| `useStoreProducts(creatorId)` | `['products','store', creatorId]` |
| `usePayoutTaxPreview()` | `['earnings','tax-preview']` |
| `useTaxSummary()` | `['tax','summary']` |
| `useCommissionMonths()` | `['invoices','commission-months']` |
| `useStatementYears()` | `['statements','years']` |
| `useShortLinks()` | `['short-links','list']` |
| `useShortLinkAnalytics(id)` | `['short-links','analytics', id]` |
| `useInstaAccount()` | `['instaauto','account']` |
| `useInstaAutomations(accountId?)` | `['instaauto','automations', accountId]` |
| `useInstaLeads(accountId?)` | `['instaauto','leads', accountId]` |
| `useInstaMessages(accountId?)` | `['instaauto','messages', accountId]` |
| `useInstaAnalytics(accountId?)` | `['instaauto','analytics', accountId]` (instaauto mutations invalidate the whole `['instaauto']` domain) |
