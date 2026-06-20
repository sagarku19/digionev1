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
| `auth/` | `useAuthSession` |
| `creator/` | `useCreator`, `useProfile` (`useProfileQuery`/`useProfileMutations`) |
| `products/` | `useProducts`, `useProductPage`, `useStoreProducts` |
| `commerce/` | `useOrders`, `useCustomers`, `useEarnings`, `useCart`, `useLibrary` |
| `marketing/` | `useCoupons`, `useAffiliates`, `useReferrals`, `useMarketingStats`, `useGuestLeads`, `useAbTests`, `useCommunity`, `useServices` |
| `analytics/` | `useAnalytics` |
| `notifications/` | `useNotifications` |
| `sites/` | `useSites`, `useSiteEdit`, `useLinkInBioSite`, `useSinglePageSite` |
| `site-editor/` | `useEditorHistory`, `useUnsavedChanges`, `useSlugCheck`, `saveDesignTokens` (editor-internal logic) |
| `storefront/` | `useStorefront` |

Example: `import { useProducts } from '@/hooks/products/useProducts'`.

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
| `useCart()` | Cart state for buyer checkout |
| `useAnalytics()` | Analytics data |
| `useCoupons()` | Coupon management |
| `useAffiliates()` | Affiliate program data |
| `useProductPage(creatorId, slug)` | Single published product by slug — used on product pages |
| `useStoreProducts(creatorId)` | All published products for a creator's storefront |
| `useAbTests()` | `{ tests }` — A/B tests for the logged-in creator; resolves `profiles.id` and selects `products(name)` |
| `useLibrary()` | Logged-in buyer's purchased products |
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
| `useAuthSession()` | `{ isLoggedIn, userEmail, profile, isLoading }` — invalidate via `['auth','session']` |

## Normalized query keys (2026-06-13)

All keys follow `[domain, kind, ...ids]`. Use these exact keys when invalidating:

| Hook | Query key |
|---|---|
| `useAbTests()` | `['ab-tests','list']` |
| `useAffiliates()` | `['affiliates','list']` |
| `useAnalytics()` | `['analytics','range', startDate, endDate]` |
| `useCoupons()` | `['coupons','list']` |
| `useCreator()` | `['creator','profile']` |
| `useCustomers()` | `['customers','list']` |
| `useEarnings()` | `['earnings','summary']` |
| `useGuestLeads(filterSiteId?)` | `['leads','list', filterSiteId]` |
| `useLibrary()` | `['library','list']` |
| `useNotifications()` | `['notifications','list']` (polls every 120 s) |
| `useOrders()` | `['orders','list']` |
| `useProductPage(creatorId, slug)` | `['products','page', creatorId, slug]` |
| `useProducts()` | `['products','list']` / `['products','detail', id]` |
| `useSites()` | `['sites','list']` |
| `useStorefront(slug)` | `['storefront','detail', slug]` |
| `useStoreProducts(creatorId)` | `['products','store', creatorId]` |
