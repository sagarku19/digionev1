---
noteId: "c2eafa315a5711f183978dfe119e58b2"
tags: []

---

# Key Hooks Reference

Always use TanStack Query via custom hooks — never raw Supabase in client components.

## Query key convention

All hooks use hierarchical keys: `[domain, kind, ...identifiers]`. Examples:
`['profiles','detail', creatorId]`, `['services','list']`,
`['sites','edit-state', siteId, { include }]`, `['auth','session']`.
This lets `queryClient.invalidateQueries({ queryKey: ['sites'] })` clear a whole domain.

| Hook | Returns |
|---|---|
| `useCreator()` | `{ profile }` — authenticated creator's profile |
| `useProducts()` | `{ products }` — creator's product list |
| `useNotifications()` | `{ unreadCount, notifications }` |
| `useOrders()` | `{ orders }` |
| `useEarnings()` | `{ creatorBalances, payouts, kyc, isLoading, refreshEarnings, updateKyc, isUpdatingKyc }` |
| `useCustomers()` | `{ customers }` |
| `useSites()` | `{ sites }` — creator's storefront sites |
| `useStorefront(slug)` | Storefront data for a given slug |
| `useCart()` | Cart state for buyer checkout |
| `useAnalytics()` | Analytics data |
| `useCoupons()` | Coupon management |
| `useAffiliates()` | Affiliate program data |
| `useProductPage(creatorId, slug)` | Single published product by slug — used on product pages |
| `useStoreProducts(creatorId)` | All published products for a creator's storefront |
| `useUpsellPages()` | `{ upsellPages, createUpsellPage, updateUpsellPage, deleteUpsellPage }` |
| `useAbTests()` | `{ tests }` — A/B tests for the logged-in creator |
| `useLibrary()` | Logged-in buyer's purchased products |
| `useGuestLeads(filterSiteId?)` | `{ leads }` — captured email leads, optionally filtered by site |
| `usePayoutRequests()` | `{ payouts, requestPayout }` |
| `useSiteConfig()` | `{ config, updateConfig }` — global site config |
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
| `useDiscoverProduct(productId)` | `{ product, related, creatorProducts }` (calls `/api/discover/[id]`) |
| `useAuthSession()` | `{ isLoggedIn, userEmail, profile, isLoading }` — invalidate via `['auth','session']` |
