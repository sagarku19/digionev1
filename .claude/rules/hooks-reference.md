---
noteId: "c2eafa315a5711f183978dfe119e58b2"
tags: []

---

# Key Hooks Reference

Always use TanStack Query via custom hooks — never raw Supabase in client components.

| Hook | Returns |
|---|---|
| `useCreator()` | `{ profile }` — authenticated creator's profile |
| `useProducts()` | `{ products }` — creator's product list |
| `useNotifications()` | `{ unreadCount, notifications }` |
| `useOrders()` | `{ orders }` |
| `useEarnings()` | `{ earnings, stats }` |
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
