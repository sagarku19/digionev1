---
noteId: "825c34b05b9d11f183978dfe119e58b2"
tags: []

---

# useEffect → TanStack Query Refactor — Design

**Date:** 2026-05-30
**Author:** Claude (sagarkushwaha5599@gmail.com)
**Status:** Approved — ready for implementation plan

---

## 1. Goal

Eliminate every `useEffect`-for-data-fetching violation in the DigiOne codebase. Convert reads to TanStack Query hooks in `src/hooks/`, convert simple mutations to `useMutation`, and register every new hook in `.claude/rules/hooks-reference.md`. Leave the multi-table procedural `save()` orchestrations in the site editor pages as inline async functions (documented exception).

The rule being enforced: **"No `useEffect` for data fetching — use TanStack Query hooks."** (`CLAUDE.md` → Code Quality)

---

## 2. Canonical file list

The original audit named 11 files and stated "11 in app/ + 5 in src/components/ = 16". After re-running the offender pattern (`useEffect\([\s\S]{0,500}?(supabase|\.from\()` over `**/*.tsx`), the true list is **16 files** with one false positive and six new ones not in the original audit. Documented here so future audits do not re-flag the false positives.

### 2.1 App pages (12)

| # | File | Pattern | Refactor scope |
|---|---|---|---|
| 1 | `app/dashboard/marketing/services/page.tsx` | services + service_bookings reads; CRUD writes via `(supabase as any).from(...)` | Full — reads → `useServices()` query, writes → `useServices()` mutations, removes `as any` casts |
| 2 | `app/dashboard/settings/profile/page.tsx` | profiles read; profile update; `email_verified`/`mobile_verified` flag writes; auth OTP | Full — reads → `useProfileQuery()`, writes → `useProfileMutations()`. OTP send/verify stays inline (it is `supabase.auth.*`, not data fetching). |
| 3 | `app/dashboard/sites/edit/linkinbio/[id]/page.tsx` | parallel read of sites + site_design_tokens + linkinbio_pages + linkinbio_blocks + linkinbio_items + products | **Reads only** — load() → `useLinkInBioSiteQuery(siteId)`. save() (~200 LOC, multi-table conditional inserts) stays inline. |
| 4 | `app/dashboard/sites/edit/singlepage/[id]/page.tsx` | parallel read of sites + tokens + site_singlepage | **Reads only** — load() → `useSinglePageSiteQuery(siteId)`. save() stays inline. |
| 5 | `app/dashboard/sites/edit/main/[id]/page.tsx` (new) | parallel read of sites + site_main + site_navigation + tokens + site_sections_config + site_product_assignments | **Reads only** — load() → `useSiteEditQuery(siteId, { include: ['sections','assignments'] })`. save() stays inline. |
| 6 | `app/dashboard/sites/edit/payment/[id]/page.tsx` (new) | site_main read + upsert | Full — read → `useSiteEditQuery(siteId, { include: ['main'] })`, write → `useSiteEditMutations().savePaymentConfig` (small enough for useMutation) |
| 7 | `app/account/profile/page.tsx` | users→profiles join read; profile update | Full — reads → `useProfileQuery()`, writes → `useProfileMutations()` |
| 8 | `app/(marketing)/discover/[productId]/page.tsx` | `fetch('/api/discover/[id]')` in useEffect | Full — useEffect → `useDiscoverProduct(productId)` |
| 9 | `app/dashboard/marketing/page.tsx` (new) | aggregated stats from coupons, lead_form, affiliates, referral_codes, order_referrals | Full — reads → `useMarketingStats()` |
| 10 | `app/dashboard/marketing/referrals/page.tsx` (new) | referral_codes + order_referrals reads; CRUD writes | Full — reads + writes → `useReferrals()` |
| 11 | `app/dashboard/marketing/community/page.tsx` (new) | community_posts + community_reactions reads; CRUD writes via `(supabase as any).from(...)` | Full — reads + writes → `useCommunity()`. Removes `as any` casts. |
| 12 | `app/dashboard/settings/library/page.tsx` (new) | orders + order_items + products read for buyer library | **Use existing `useLibrary()`** — no new hook needed. Delete in-component fetch. |

### 2.2 Components (4)

| # | File | Pattern | Refactor scope |
|---|---|---|---|
| 13 | `src/components/marketing/MarketingNav.tsx` | session read + users→profiles join + `supabase.auth.onAuthStateChange` subscription | Read goes to `useAuthSession()`. The `onAuthStateChange` subscription stays in a `useEffect` (legitimate side effect, not a fetch) but its callback calls `queryClient.invalidateQueries({ queryKey: ['auth', 'session'] })` so TanStack Query is the source of truth. |
| 14 | `src/components/dashboard/site-edit/SiteVisualEditor.tsx` | parallel read of sites + site_main + site_navigation + tokens | Reads only — `useSiteEditQuery(siteId)`. save() stays inline. |
| 15 | `src/components/dashboard/site-edit/SiteEditShell.tsx` | same parallel read | Reads only — `useSiteEditQuery(siteId)`. save() stays inline. |
| 16 | `src/components/dashboard/site-edit/ProductAssigner.tsx` | resolves profile id then lists products | Full — uses `useProfileQuery()` (read-only) + existing `useProducts()`. Imports **only** the query hook from `useProfile`, no mutations. |

### 2.3 Investigated, not violations

These were flagged by less-precise patterns but are not useEffect-for-data violations. Documented here so they do not get re-flagged.

| File | Verdict | Why |
|---|---|---|
| `app/dashboard/settings/billing/page.tsx` | Not a violation, but has a side fix | The `useEffect` at line 158 syncs form state from `useEarnings()` hook data — not a fetch. **However**, the submit handler calls `supabase.from('creator_kyc').upsert(...)` directly. **Side fix:** add an `updateKyc` mutation to `useEarnings` and use it in the submit handler. |
| `src/components/storefront/LinkInBioPage.tsx` | Not a violation | Two `useEffect`s: a `postMessage` listener for editor live preview, and an analytics ping (`trackClick`). Neither fetches data. |

---

## 3. Hook map

### 3.1 New hooks (10)

All new hooks live in `src/hooks/` and follow the conventions in §4.

| Hook file | Public exports | Query keys | Replaces in |
|---|---|---|---|
| `useProfile.ts` | `useProfileQuery(creatorId?)`, `useProfileMutations()`, `useProfile()` (composes both) | `['profiles', 'detail', creatorId]` | settings/profile (both), account/profile (both), ProductAssigner (query only) |
| `useServices.ts` | `useServices()` → `{ services, bookings, createService, updateService, deleteService, toggleActive, updateBookingStatus }` | `['services', 'list', { creatorId }]`, `['service-bookings', 'list', { creatorId }]` | marketing/services |
| `useReferrals.ts` | `useReferrals()` → `{ codes, redemptions, createCode, toggleActive, deleteCode }` | `['referrals', 'codes', { creatorId }]`, `['referrals', 'redemptions', { creatorId }]` | marketing/referrals |
| `useCommunity.ts` | `useCommunity()` → `{ posts, reactions, createPost, deletePost, toggleReaction }` | `['community', 'posts']`, `['community', 'reactions', { creatorId }]` | marketing/community |
| `useMarketingStats.ts` | `useMarketingStats()` → `{ couponCount, leadCount, affiliateCount, referralCount, orderReferralCount }` | `['marketing', 'stats', creatorId]` | marketing index |
| `useSiteEdit.ts` | `useSiteEditQuery(siteId, { include?: ('main'\|'nav'\|'tokens'\|'sections'\|'assignments')[] })`, `useSiteEditMutations()` → `{ savePaymentConfig }` (only the small payment-page upsert; the larger editor saves stay inline per §5) | `['sites', 'edit-state', siteId, { include }]` | SiteVisualEditor, SiteEditShell, sites/edit/main, sites/edit/payment |
| `useLinkInBioSite.ts` | `useLinkInBioSiteQuery(siteId)` → `{ site, tokens, page, blocks, items, products }` | `['sites', 'linkinbio', siteId]` | sites/edit/linkinbio |
| `useSinglePageSite.ts` | `useSinglePageSiteQuery(siteId)` → `{ site, tokens, page }` | `['sites', 'singlepage', siteId]` | sites/edit/singlepage |
| `useDiscoverProduct.ts` | `useDiscoverProduct(productId)` → `{ product, related, creatorProducts }` (fetch wrapper over `/api/discover/[id]`) | `['discover', 'product', productId]` | discover/[productId] |
| `useAuthSession.ts` | `useAuthSession()` → `{ session, isLoggedIn, profile, isLoading }` | `['auth', 'session']` | MarketingNav |

### 3.2 Extended existing hooks (2)

| Hook | Addition |
|---|---|
| `useEarnings` | Add `updateKyc(payload)` mutation that wraps the existing `supabase.from('creator_kyc').upsert(...)` from `settings/billing`. Invalidates `['earnings']` keys on success. |
| `useLibrary` | No code change — `settings/library` simply consumes it. The in-component fetch is deleted. |

### 3.3 Read/write split (refinement 1)

`useProfile.ts` exports three things:

```typescript
// Query only — components that only read import this.
export function useProfileQuery(creatorId?: string) { /* useQuery */ }

// Mutations only — components that only write import this.
export function useProfileMutations() {
  return { updateProfile, setEmailVerified, setMobileVerified };
}

// Convenience barrel — components that read AND write import this.
export function useProfile(creatorId?: string) {
  return { ...useProfileQuery(creatorId), ...useProfileMutations() };
}
```

`ProductAssigner` imports `useProfileQuery` only — no mutation dispatchers in its render closure, no unnecessary re-renders when mutations fire elsewhere.

The same pattern applies to any hook where reads and writes have clearly different consumers. For hooks where every consumer needs both (e.g. `useServices`), keep the single barrel.

### 3.4 Auth session invalidation (refinement 2)

`useAuthSession()` reads the session + profile via `useQuery` with key `['auth', 'session']`.

The `supabase.auth.onAuthStateChange` listener stays in `MarketingNav`'s `useEffect` — it is a legitimate subscription side effect, not a fetch. Its callback does one thing: invalidate the auth query.

```typescript
// MarketingNav.tsx (excerpt)
useEffect(() => {
  const supabase = createClient();
  const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
    queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
  });
  return () => subscription.unsubscribe();
}, [queryClient]);
```

TanStack Query is the source of truth. The listener is the trigger.

### 3.5 Query key hierarchy (refinement 3)

Every key follows `[domain, kind, ...identifiers]`. Examples:

- `['profiles', 'detail', creatorId]`
- `['services', 'list', { creatorId }]`
- `['sites', 'edit-state', siteId, { include }]`
- `['sites', 'linkinbio', siteId]`
- `['auth', 'session']`
- `['marketing', 'stats', creatorId]`

This lets future invalidation target a whole domain at once (e.g. on account switch: `queryClient.invalidateQueries({ queryKey: ['sites'] })`).

The convention is documented at the top of each hook file (one-line comment) and in `.claude/rules/hooks-reference.md`.

---

## 4. Hook implementation conventions

All new hooks adhere to:

1. **Client construction.** One `createClient()` per hook module, memoized at module scope or via `useMemo` in the hook. Never inline `createClient()` in render bodies.
2. **Typed Supabase client.** Use the `Database` generic from `types/database.types.ts`. No `as any` casts unless the table is genuinely missing from the generated types (e.g. `linkinbio_pages`); when used, leave a one-line comment naming the missing table.
3. **Query keys.** Hierarchical (§3.5), declared at the top of the hook file.
4. **Mutations.** Use `useMutation` with `onSuccess: () => queryClient.invalidateQueries({ queryKey: [...] })`. No optimistic updates in this refactor (out of scope).
5. **Error handling.** Errors propagate via React Query's `error` field. Components display them; hooks do not swallow.
6. **No `console.log`.** Per `CLAUDE.md`.
7. **File header.** Each hook file starts with: `// Hook: <name> — <one-line purpose>` and the query key list.

---

## 5. Out of scope (YAGNI)

These are intentionally NOT in this refactor:

| Item | Why excluded |
|---|---|
| `save()` orchestrations in linkinbio/singlepage/main editor pages (100–200 LOC each, multi-table conditional writes) | Converting procedural multi-table flows to declarative mutations adds regression risk for zero architectural gain. The rule says "no useEffect for data fetching" — writes are allowed inline. |
| `(supabase as any)` casts in editor save flows | Tables (`linkinbio_pages`, `linkinbio_blocks`, `linkinbio_items`) are missing from `database.types.ts`. Fix is to regenerate types (`npm run update-types`) — separate concern. |
| `LinkInBioPage.tsx` postMessage + analytics `useEffect`s | Not fetches. |
| Optimistic mutation updates | Not required by the rule; can be added later per-hook if needed. |
| Refactor of preview-iframe `postMessage` debouncing in editor pages | Not fetches. |
| Adding tests for new hooks | The project has no existing hook test harness; introducing one is out of scope. Manual verification per §7. |

---

## 6. Documentation updates

- **`.claude/rules/hooks-reference.md`:** Add one row per new hook with the same `Hook | Returns` table format. Add a short section at the top documenting the query key convention.
- **No changes** to `CLAUDE.md`, `anti-patterns.md`, or `feature-checklists.md` — the rules already cover this.

---

## 7. Verification

Per `CLAUDE.local.md` ("run the app" workflow):

1. `npx tsc --noEmit` — must pass with zero errors.
2. `npm run lint` — must pass.
3. `npm run dev` — start dev server.
4. Manually exercise each refactored route in Chrome:
   - Dashboard pages: services, settings/profile, settings/billing, settings/library, marketing index, marketing/referrals, marketing/community, sites/edit/{linkinbio,singlepage,main,payment}/<id>.
   - Public pages: discover/<productId>, MarketingNav (logged-out → login → dropdown → logout flow).
5. Confirm React DevTools shows the expected query keys and that `onAuthStateChange` triggers an `['auth','session']` invalidation.

---

## 8. Risk register

| Risk | Mitigation |
|---|---|
| Site editor pages regress on first paint (load order) | Editors keep their existing local state; the hook only replaces the fetch. State derivation logic is unchanged. |
| `useAuthSession` causes hydration mismatch in MarketingNav | Initial query data returns `{ isLoggedIn: false }` until the session resolves — matches the current behavior of the in-component fetch. |
| `useProfileQuery` overfetches when called from multiple components | TanStack Query dedupes by key; multiple consumers share one in-flight request. |
| Mutation invalidation cascades cause UI flicker | Use scoped invalidation keys (e.g. `['profiles','detail', creatorId]`), not domain-wide. Domain-wide invalidation is reserved for account-switch cases. |
| `useSiteEdit` `include` param creates cache fragmentation | The include set is small (5 options) and stable per page; cache fragmentation cost is acceptable. |

---

## 9. Acceptance criteria

The refactor is complete when:

1. Grep for `useEffect\([\s\S]{0,500}?(supabase|\.from\()` over `**/*.tsx` returns **only** `MarketingNav.tsx` (the `onAuthStateChange` subscription, documented in §3.4).
2. All 10 new hooks exist in `src/hooks/` and are registered in `.claude/rules/hooks-reference.md`.
3. `useEarnings.updateKyc` mutation exists and is used by `settings/billing`.
4. `settings/library` consumes `useLibrary()` instead of fetching directly.
5. `npx tsc --noEmit` passes.
6. `npm run lint` passes.
7. Manual verification per §7 confirms no UX regressions on any of the 16 affected pages.
