---
noteId: "59877d705ba111f183978dfe119e58b2"
tags: []

---

# useEffect → TanStack Query Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate every `useEffect`-for-data-fetching violation across 16 files by extracting reads into TanStack Query hooks in `src/hooks/`, converting simple writes to `useMutation`, and registering each new hook in `.claude/rules/hooks-reference.md`.

**Architecture:** Vertical-slice tasks — each task lands one new (or extended) hook plus refactors of every consumer that uses it, then verifies the routes in browser. The 3 site editor `save()` orchestrations (linkinbio, singlepage, main) stay as inline async functions per the spec's documented exception. Query keys follow `[domain, kind, ...identifiers]` hierarchy. `useProfile` is split into `useProfileQuery` + `useProfileMutations` for read/write isolation. `MarketingNav` keeps its `onAuthStateChange` listener but the callback only invalidates the `['auth','session']` query.

**Tech Stack:** Next.js 16 (App Router) · TypeScript 5 strict · TanStack Query v5 · Supabase JS · `@/lib/supabase/client` (single shared browser client) · `@/lib/getCreatorProfileId` (resolves current creator id) · lucide-react · Tailwind v4

**Convention sync with existing hooks** (`src/hooks/useProducts.ts`, `useEarnings.ts`, etc.):
- Import `supabase` directly: `import { supabase } from '@/lib/supabase/client'` (NOT `createClient()` per hook — that contradicts the existing codebase pattern).
- `console.error` inside `catch` is accepted (every existing hook does this; spec §4.6 "No console.log" applies to debug logs only).
- File header: `// <one-line purpose>\n// DB tables: <list>\n"use client";`
- Always `try`/`catch` inside `queryFn` and `mutationFn`, re-throw after `console.error`.

**Reference: spec** — `docs/superpowers/specs/2026-05-30-tanstack-query-refactor-design.md`

---

## File Structure

### New hook files (10)
- `src/hooks/useProfile.ts` — creator profile read (split) + mutations
- `src/hooks/useServices.ts` — services + service_bookings CRUD
- `src/hooks/useReferrals.ts` — referral_codes + order_referrals CRUD
- `src/hooks/useCommunity.ts` — community_posts + community_reactions CRUD
- `src/hooks/useMarketingStats.ts` — aggregated marketing index counts
- `src/hooks/useSiteEdit.ts` — multi-table site editor read + payment-config write
- `src/hooks/useLinkInBioSite.ts` — linkinbio editor read (sites + tokens + pages + blocks + items + products)
- `src/hooks/useSinglePageSite.ts` — singlepage editor read (sites + tokens + site_singlepage)
- `src/hooks/useDiscoverProduct.ts` — `/api/discover/[id]` wrapper
- `src/hooks/useAuthSession.ts` — supabase session + profile join

### Extended hook files (1)
- `src/hooks/useEarnings.ts` — add `updateKyc` mutation

### Modified consumer files (16)
- `app/dashboard/marketing/services/page.tsx`
- `app/dashboard/settings/profile/page.tsx`
- `app/dashboard/sites/edit/linkinbio/[id]/page.tsx`
- `app/dashboard/sites/edit/singlepage/[id]/page.tsx`
- `app/dashboard/sites/edit/main/[id]/page.tsx`
- `app/dashboard/sites/edit/payment/[id]/page.tsx`
- `app/account/profile/page.tsx`
- `app/(marketing)/discover/[productId]/page.tsx`
- `app/dashboard/marketing/page.tsx`
- `app/dashboard/marketing/referrals/page.tsx`
- `app/dashboard/marketing/community/page.tsx`
- `app/dashboard/settings/library/page.tsx`
- `app/dashboard/settings/billing/page.tsx` (only the submit handler)
- `src/components/marketing/MarketingNav.tsx`
- `src/components/dashboard/site-edit/SiteVisualEditor.tsx`
- `src/components/dashboard/site-edit/SiteEditShell.tsx`
- `src/components/dashboard/site-edit/ProductAssigner.tsx`

### Docs
- `.claude/rules/hooks-reference.md` — new hook rows + query key convention section

---

## Task 1: Preflight — branch + baseline

**Files:**
- No new files. Verification only.

- [ ] **Step 1: Verify clean tree on `main`**

Run:
```powershell
git status
git rev-parse --abbrev-ref HEAD
```
Expected: clean working tree, branch `main` (or current).

- [ ] **Step 2: Create feature branch**

Run:
```powershell
git checkout -b refactor/useeffect-to-tanstack-query
```

- [ ] **Step 3: Snapshot the offender count (baseline)**

Use Grep tool:
- pattern: `useEffect\([\s\S]{0,500}?(supabase|\.from\()`
- glob: `**/*.tsx`
- output_mode: `files_with_matches`
- multiline: `true`

Expected output: 16 file paths. Record the list — Task 14 acceptance check compares against this baseline (must drop to 1: `MarketingNav.tsx`, retaining only the `onAuthStateChange` subscription).

- [ ] **Step 4: Confirm tsc + lint pass before any changes**

Run:
```powershell
npx tsc --noEmit; if ($?) { npm run lint }
```
Expected: both pass. If lint already fails, fix unrelated issues first or note them — the plan's acceptance criteria require both to pass at the end, so we need a clean baseline.

- [ ] **Step 5: Commit baseline (empty)**

```powershell
git commit --allow-empty -m "chore: start useEffect -> TanStack Query refactor"
```

---

## Task 2: Hook — `useProfile` (split into Query + Mutations)

**Why first:** 3 consumer files (`settings/profile`, `account/profile`, `ProductAssigner`) plus `MarketingNav`'s session needs the profile join. Landing this first unblocks the most downstream refactors.

**Files:**
- Create: `src/hooks/useProfile.ts`
- Modify: `app/dashboard/settings/profile/page.tsx`
- Modify: `app/account/profile/page.tsx`
- Modify: `src/components/dashboard/site-edit/ProductAssigner.tsx`

- [ ] **Step 1: Create `src/hooks/useProfile.ts`**

```typescript
// Creator profile reads + updates. Split exports so read-only consumers don't pull mutations into their render closure.
// DB tables: profiles (read/write), users (read join)
// Query keys: ['profiles','detail', creatorId]
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
import type { Database } from '@/types/database.types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

async function fetchProfile(creatorId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', creatorId)
    .single();
  if (error) throw error;
  return data;
}

export function useProfileQuery(creatorId?: string) {
  const enabled = !!creatorId;
  return useQuery({
    queryKey: ['profiles', 'detail', creatorId ?? null] as const,
    enabled,
    queryFn: async () => {
      try {
        const id = creatorId ?? (await getCreatorProfileId());
        return await fetchProfile(id);
      } catch (err) {
        console.error('useProfileQuery error:', err);
        throw err;
      }
    },
  });
}

export function useProfileMutations() {
  const queryClient = useQueryClient();

  const invalidate = (creatorId: string) => {
    queryClient.invalidateQueries({ queryKey: ['profiles', 'detail', creatorId] });
    queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
  };

  const updateProfile = useMutation({
    mutationFn: async ({ creatorId, updates }: { creatorId: string; updates: ProfileUpdate }) => {
      const { error } = await supabase.from('profiles').update(updates).eq('id', creatorId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => invalidate(vars.creatorId),
  });

  const setEmailVerified = useMutation({
    mutationFn: async (creatorId: string) => {
      const { error } = await supabase.from('profiles').update({ email_verified: true } as ProfileUpdate).eq('id', creatorId);
      if (error) throw error;
    },
    onSuccess: (_d, creatorId) => invalidate(creatorId),
  });

  const setMobileVerified = useMutation({
    mutationFn: async (creatorId: string) => {
      const { error } = await supabase.from('profiles').update({ mobile_verified: true } as ProfileUpdate).eq('id', creatorId);
      if (error) throw error;
    },
    onSuccess: (_d, creatorId) => invalidate(creatorId),
  });

  return {
    updateProfile: updateProfile.mutateAsync,
    setEmailVerified: setEmailVerified.mutateAsync,
    setMobileVerified: setMobileVerified.mutateAsync,
    isUpdating: updateProfile.isPending,
  };
}

export function useProfile(creatorId?: string) {
  const query = useProfileQuery(creatorId);
  const mutations = useProfileMutations();
  return { ...query, ...mutations };
}
```

- [ ] **Step 2: Type-check the new hook in isolation**

Run:
```powershell
npx tsc --noEmit
```
Expected: zero errors. If `profiles` row doesn't include `email_verified`/`mobile_verified`, leave the `as ProfileUpdate` casts (already in the snippet) — they handle the type gap until `npm run update-types`.

- [ ] **Step 3: Refactor `app/dashboard/settings/profile/page.tsx`**

Replace the existing data loading and mutation calls.

In the imports, remove `createClient` from `@/lib/supabase/client` (keep it only for the OtpModal, which uses `supabase.auth.*`), and add:
```typescript
import { useProfile } from '@/hooks/useProfile';
```

In `ProfileSettingsPage`, **delete** the local `supabase`, `loading`, `profileId`, `profile`, and the `loadProfile` function. Replace the loading bootstrap (the `useEffect(() => { loadProfile(); }, []);` at line 225) and `handleSave` with:

```typescript
const [profileId, setProfileId] = useState('');
const { data: profile, isLoading: loading } = useProfileQuery(profileId);
const { updateProfile, setEmailVerified, setMobileVerified } = useProfileMutations();

useEffect(() => {
  getCreatorProfileId().then(setProfileId).catch((e) => setError(e.message));
}, []);

useEffect(() => {
  if (!profile) return;
  const meta = (profile as any).metadata ?? {};
  setForm({
    full_name: profile.full_name ?? '',
    email: profile.email ?? '',
    mobile: profile.mobile ?? '',
    avatar_url: profile.avatar_url ?? '',
    tagline: meta.tagline ?? '',
    location: meta.location ?? '',
    category: meta.category ?? '',
    website: meta.website ?? '',
    twitter: meta.twitter ?? '',
    instagram: meta.instagram ?? '',
    youtube: meta.youtube ?? '',
    linkedin: meta.linkedin ?? '',
    telegram: meta.telegram ?? '',
  });
}, [profile]);

const handleSave = async () => {
  setSaving(true);
  setError('');
  try {
    await updateProfile({
      creatorId: profileId,
      updates: {
        full_name: form.full_name.trim() || null,
        email: form.email.trim() || null,
        mobile: form.mobile.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
        metadata: {
          tagline: form.tagline.trim() || null,
          location: form.location.trim() || null,
          category: form.category.trim() || null,
          website: form.website.trim() || null,
          twitter: form.twitter.trim() || null,
          instagram: form.instagram.trim() || null,
          youtube: form.youtube.trim() || null,
          linkedin: form.linkedin.trim() || null,
          telegram: form.telegram.trim() || null,
        },
      } as any,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  } catch (e: any) {
    setError(e.message);
  } finally {
    setSaving(false);
  }
};

const handleVerifySuccess = async () => {
  if (!verifyModal) return;
  if (verifyModal.type === 'email') await setEmailVerified(profileId);
  else await setMobileVerified(profileId);
  setVerifyModal(null);
};
```

Imports needed: add `import { useProfileQuery, useProfileMutations } from '@/hooks/useProfile';` and keep the `getCreatorProfileId` import that already exists. Replace the prior `useProfile` import line with the split-exports import.

- [ ] **Step 4: Refactor `app/account/profile/page.tsx`**

This page uses a different join (`users → profiles` by `auth_provider_id`). The cleanest move is: resolve the creator id via `getCreatorProfileId` (which already does this join server-side), then drop into `useProfileQuery`.

Replace the entire `useEffect(() => { async function loadUser() {...} loadUser(); }, []);` block AND the `handleUpdate` function with:

```typescript
import { useProfileQuery, useProfileMutations } from '@/hooks/useProfile';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';
// ...

const [profileId, setProfileId] = useState('');
const { data: profileRow, isLoading: loading } = useProfileQuery(profileId);
const { updateProfile } = useProfileMutations();

useEffect(() => {
  const supabase = createClient();
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (!session?.user) { window.location.href = '/login'; return; }
    setEmail(session.user.email || '');
    getCreatorProfileId().then(setProfileId).catch(() => {});
  });
}, []);

useEffect(() => {
  if (!profileRow) return;
  setProfile({ full_name: profileRow.full_name, avatar_url: profileRow.avatar_url });
}, [profileRow]);

const handleUpdate = async (e: React.FormEvent) => {
  e.preventDefault();
  setSaving(true);
  setMessage({ text: '', type: '' });
  try {
    await updateProfile({
      creatorId: profileId,
      updates: { full_name: profile.full_name, avatar_url: profile.avatar_url },
    });
    setMessage({ text: 'Profile updated successfully!', type: 'success' });
  } catch (err: any) {
    setMessage({ text: err.message || 'Failed to update profile', type: 'error' });
  } finally {
    setSaving(false);
  }
};
```

- [ ] **Step 5: Refactor `src/components/dashboard/site-edit/ProductAssigner.tsx`**

This component just needs the current creator's products. The existing `useProducts()` hook already returns those, so we use it directly — no need to re-resolve profile id locally.

Replace lines 1–42 with:

```typescript
'use client';
// ProductAssigner — controlled product picker.
// Parent manages assigned set; changes propagate immediately. DB save happens on parent Save.

import React from 'react';
import { useProducts } from '@/hooks/useProducts';
import { Package } from 'lucide-react';

export default function ProductAssigner({
  siteId: _siteId,
  assigned,
  onChange,
}: {
  siteId: string;
  assigned: Set<string>;
  onChange: (assigned: Set<string>) => void;
}) {
  const { products, isLoading: loading } = useProducts();
```

Keep the rest of the file from line 44 (`const toggle = ...`) onward unchanged.

- [ ] **Step 6: Type-check + lint**

```powershell
npx tsc --noEmit; if ($?) { npm run lint }
```
Expected: both pass.

- [ ] **Step 7: Manual verification — dashboard/settings/profile**

```powershell
npm run dev
```
Open http://localhost:3000/dashboard/settings/profile (logged in). Confirm:
- Page loads existing profile data into form
- Edit any field → click Save → success banner appears
- Refresh — saved value persists
- Click "Verify now" on email/mobile → modal opens → entering OTP triggers verified badge

- [ ] **Step 8: Manual verification — account/profile**

Open http://localhost:3000/account/profile. Confirm:
- Avatar, name, email populate
- Save changes → success message → refresh → persists

- [ ] **Step 9: Manual verification — ProductAssigner**

Open any site edit page (e.g. `/dashboard/sites/edit/main/<id>`) and navigate to the section that renders `ProductAssigner` (the "Products" tab). Confirm:
- Product list renders
- Clicking a product toggles the selected ring
- Selected count updates at the bottom

- [ ] **Step 10: Commit**

```powershell
git add src/hooks/useProfile.ts app/dashboard/settings/profile/page.tsx app/account/profile/page.tsx src/components/dashboard/site-edit/ProductAssigner.tsx
git commit -m "refactor: replace useEffect profile fetches with useProfile hook (split query/mutations)"
```

---

## Task 3: Hook — `useAuthSession` + MarketingNav

**Why next:** MarketingNav is a high-traffic component. Lands before the dashboard pages so any auth regressions surface early.

**Files:**
- Create: `src/hooks/useAuthSession.ts`
- Modify: `src/components/marketing/MarketingNav.tsx`

- [ ] **Step 1: Create `src/hooks/useAuthSession.ts`**

```typescript
// Wraps supabase.auth.getSession() + profile join. Subscription/invalidation lives in MarketingNav.
// DB tables: profiles (read via users join), auth.users
// Query keys: ['auth','session']
"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export interface AuthSessionData {
  isLoggedIn: boolean;
  userEmail: string | null;
  profile: { full_name: string | null; avatar_url: string | null } | null;
}

export function useAuthSession() {
  const query = useQuery({
    queryKey: ['auth', 'session'] as const,
    queryFn: async (): Promise<AuthSessionData> => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return { isLoggedIn: false, userEmail: null, profile: null };

        const { data } = await supabase
          .from('users')
          .select('id, profiles(full_name, avatar_url)')
          .eq('auth_provider_id', session.user.id)
          .maybeSingle();

        const raw = Array.isArray(data?.profiles) ? data?.profiles[0] : (data?.profiles as any);
        return {
          isLoggedIn: true,
          userEmail: session.user.email ?? null,
          profile: raw ? { full_name: raw.full_name ?? null, avatar_url: raw.avatar_url ?? null } : null,
        };
      } catch (err) {
        console.error('useAuthSession error:', err);
        throw err;
      }
    },
    staleTime: 30_000,
  });

  return {
    isLoggedIn: query.data?.isLoggedIn ?? false,
    userEmail: query.data?.userEmail ?? null,
    profile: query.data?.profile ?? null,
    isLoading: query.isLoading,
  };
}
```

- [ ] **Step 2: Refactor `src/components/marketing/MarketingNav.tsx`**

Replace the four useEffect-driven state hooks (`isLoggedIn`, `userProfile`) and the entire profile-loading useEffect with the hook + a thin subscription effect that only invalidates.

Find and replace the relevant block (lines ~26–104):

```typescript
import { useQueryClient } from '@tanstack/react-query';
import { useAuthSession } from '@/hooks/useAuthSession';
// ...

export default function MarketingNav() {
  const queryClient = useQueryClient();
  const { isLoggedIn, userEmail, profile } = useAuthSession();
  const userProfile = profile ? { ...profile, email: userEmail } : null;
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const supabaseRef = useRef(createClient());
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsScrolled(window.scrollY > 20);
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    if (profileDropdownOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileDropdownOpen]);

  // Source of truth: TanStack Query. This subscription only triggers invalidation.
  useEffect(() => {
    const supabase = supabaseRef.current;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  const handleSignOut = async () => {
    await supabaseRef.current.auth.signOut();
    setProfileDropdownOpen(false);
    setMobileMenuOpen(false);
    setShowSignOutConfirm(false);
    // onAuthStateChange will invalidate the session query automatically.
  };
```

Delete the entire block from old line 55 (`useEffect(() => { const supabase = supabaseRef.current; const loadProfile = ...`) through the end of the old auth useEffect (around line 104).

Remove the now-unused state imports if any (`setIsLoggedIn`, `setUserProfile`).

- [ ] **Step 3: Type-check + lint**

```powershell
npx tsc --noEmit; if ($?) { npm run lint }
```
Expected: both pass.

- [ ] **Step 4: Manual verification**

Restart dev server. Open http://localhost:3000 in an **incognito** window (so we start logged out):
- Header shows "Log in" + "Start free"
- Click Log in → log in → return to home → header shows your avatar + name within ~1s of navigation
- Open dropdown → click Sign out → confirm → header returns to logged-out state
- Open React DevTools → Query tab → confirm key `["auth","session"]` is present and re-fires on login/logout

- [ ] **Step 5: Commit**

```powershell
git add src/hooks/useAuthSession.ts src/components/marketing/MarketingNav.tsx
git commit -m "refactor: replace MarketingNav auth useEffect with useAuthSession + invalidation listener"
```

---

## Task 4: Hook — `useDiscoverProduct`

**Files:**
- Create: `src/hooks/useDiscoverProduct.ts`
- Modify: `app/(marketing)/discover/[productId]/page.tsx`

- [ ] **Step 1: Create `src/hooks/useDiscoverProduct.ts`**

```typescript
// Wraps the /api/discover/[id] route. Buyers and visitors only — read-only.
// Query keys: ['discover','product', productId]
"use client";

import { useQuery } from '@tanstack/react-query';

interface DiscoverResponse {
  product: any;
  related: any[];
  creatorProducts: any[];
  error?: string;
}

export function useDiscoverProduct(productId: string | undefined) {
  return useQuery({
    queryKey: ['discover', 'product', productId ?? null] as const,
    enabled: !!productId,
    queryFn: async (): Promise<{ product: any; related: any[]; creatorProducts: any[] }> => {
      const res = await fetch(`/api/discover/${productId}`);
      const json: DiscoverResponse = await res.json();
      if (json.error) throw new Error(json.error);
      return {
        product: json.product,
        related: json.related ?? [],
        creatorProducts: json.creatorProducts ?? [],
      };
    },
  });
}
```

- [ ] **Step 2: Refactor `app/(marketing)/discover/[productId]/page.tsx`**

Replace the `useState` triplet (`product`, `related`, `creatorProducts`, `loading`) and the `useEffect` at line 73 with:

```typescript
import { useDiscoverProduct } from '@/hooks/useDiscoverProduct';
// ...

const { productId } = useParams<{ productId: string }>();
const router = useRouter();
const { data, isLoading: loading, isError } = useDiscoverProduct(productId);
const product = data?.product ?? null;
const related = data?.related ?? [];
const creatorProducts = data?.creatorProducts ?? [];
const [activeImage, setActiveImage] = useState(0);
const [liked, setLiked] = useState(false);
```

Update the not-found check at line ~114 to also trigger on `isError`:

```typescript
if (!loading && (isError || !product)) {
  return (
    // existing not-found JSX
  );
}
```

Delete the old `useEffect` (lines 73–89) and the four `useState` declarations it drove.

- [ ] **Step 3: Type-check + lint**

```powershell
npx tsc --noEmit; if ($?) { npm run lint }
```

- [ ] **Step 4: Manual verification**

Open http://localhost:3000/discover, click any product card → discover/[id] page loads with image gallery, price, "More from creator", "You might also like". Hit a bad URL (`/discover/00000000-0000-0000-0000-000000000000`) → "Product Not Found" state renders.

- [ ] **Step 5: Commit**

```powershell
git add src/hooks/useDiscoverProduct.ts "app/(marketing)/discover/[productId]/page.tsx"
git commit -m "refactor: replace discover product useEffect with useDiscoverProduct hook"
```

---

## Task 5: Hook — `useServices`

**Files:**
- Create: `src/hooks/useServices.ts`
- Modify: `app/dashboard/marketing/services/page.tsx`

- [ ] **Step 1: Create `src/hooks/useServices.ts`**

```typescript
// Services and service_bookings for a creator: list reads + CRUD.
// DB tables: services, service_bookings
// Query keys: ['services','list',{creatorId}], ['service-bookings','list',{creatorId}]
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

type Service = {
  id: string; title: string; description: string | null; service_type: string;
  price: number; duration_minutes: number | null; is_active: boolean; metadata: any;
  created_at: string;
};
type Booking = {
  id: string; service_id: string; customer_name: string | null; customer_email: string | null;
  status: string; booked_at: string | null; amount_paid: number | null; created_at: string;
};

export function useServices() {
  const queryClient = useQueryClient();

  const servicesQuery = useQuery({
    queryKey: ['services', 'list'] as const,
    queryFn: async (): Promise<{ creatorId: string; services: Service[] }> => {
      try {
        const creatorId = await getCreatorProfileId();
        const { data, error } = await (supabase as any)
          .from('services')
          .select('*')
          .eq('creator_id', creatorId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return { creatorId, services: (data ?? []) as Service[] };
      } catch (err) {
        console.error('useServices services error:', err);
        throw err;
      }
    },
  });

  const services = servicesQuery.data?.services ?? [];
  const creatorId = servicesQuery.data?.creatorId;

  const bookingsQuery = useQuery({
    queryKey: ['service-bookings', 'list', { serviceIds: services.map((s) => s.id) }] as const,
    enabled: services.length > 0,
    queryFn: async (): Promise<Booking[]> => {
      try {
        const ids = services.map((s) => s.id);
        const { data, error } = await (supabase as any)
          .from('service_bookings')
          .select('*')
          .in('service_id', ids)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []) as Booking[];
      } catch (err) {
        console.error('useServices bookings error:', err);
        throw err;
      }
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['services'] });
    queryClient.invalidateQueries({ queryKey: ['service-bookings'] });
  };

  const createService = useMutation({
    mutationFn: async (payload: Omit<Service, 'id' | 'created_at'>) => {
      if (!creatorId) throw new Error('creator not loaded');
      const { error } = await (supabase as any).from('services').insert({ ...payload, creator_id: creatorId });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateService = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Service> }) => {
      const { error } = await (supabase as any).from('services').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleActive = useMutation({
    mutationFn: async (svc: Service) => {
      const { error } = await (supabase as any).from('services').update({ is_active: !svc.is_active }).eq('id', svc.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateBookingStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from('service_bookings').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['service-bookings'] }),
  });

  return {
    services,
    bookings: bookingsQuery.data ?? [],
    isLoading: servicesQuery.isLoading || bookingsQuery.isLoading,
    createService: createService.mutateAsync,
    updateService: updateService.mutateAsync,
    deleteService: deleteService.mutateAsync,
    toggleActive: toggleActive.mutateAsync,
    updateBookingStatus: updateBookingStatus.mutateAsync,
  };
}
```

Note: `(supabase as any).from('services')` retained because `services`/`service_bookings` are missing from `types/database.types.ts`. Documented in the file header above.

- [ ] **Step 2: Refactor `app/dashboard/marketing/services/page.tsx`**

Remove `supabase`, `services`, `bookings`, `loading`, `profileId`, `load`, and the two useEffects at lines 62 and 83. Replace the top of `ServicesPage` with:

```typescript
import { useServices } from '@/hooks/useServices';
// ...

export default function ServicesPage() {
  const { services, bookings, isLoading: loading, createService, updateService, deleteService: deleteSvc, toggleActive: toggleSvcActive, updateBookingStatus: updateBkgStatus } = useServices();
  const [showModal, setShowModal] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [activeTab, setActiveTab] = useState<'services' | 'bookings'>('services');
  const [origin, setOrigin] = useState('');
  // (form state stays unchanged)
  useEffect(() => { setOrigin(window.location.origin); }, []);
```

Replace `handleSave`:
```typescript
const handleSave = async (e: React.FormEvent) => {
  e.preventDefault();
  setFormError('');
  if (!form.title.trim()) { setFormError('Title is required.'); return; }
  if (form.price < 0) { setFormError('Price cannot be negative.'); return; }
  setSaving(true);
  try {
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      service_type: form.service_type,
      price: Number(form.price),
      duration_minutes: (form.service_type === '1on1' || form.service_type === 'consulting') ? Number(form.duration_minutes) : null,
      is_active: true,
      metadata: form.calendly_url ? { calendly_url: form.calendly_url } : null,
    };
    if (editService) await updateService({ id: editService.id, updates: payload });
    else await createService(payload as any);
    setShowModal(false);
  } catch (err: any) {
    setFormError(err.message ?? 'Failed to save service.');
  } finally {
    setSaving(false);
  }
};
```

Replace the three small mutation handlers:
```typescript
const toggleActive = (svc: Service) => { toggleSvcActive(svc); };
const deleteService = (id: string) => { deleteSvc(id); setDeleteConfirm(null); };
const updateBookingStatus = (id: string, status: string) => { updateBkgStatus({ id, status }); };
```

- [ ] **Step 3: Type-check + lint**

```powershell
npx tsc --noEmit; if ($?) { npm run lint }
```

- [ ] **Step 4: Manual verification**

Open http://localhost:3000/dashboard/marketing/services. Confirm:
- Existing services + bookings render
- "New Service" → create form → submit → new card appears
- Edit → update → card reflects new title
- Toggle active → pause/active state flips
- Delete confirm → service removed
- Switch to Bookings tab → change a booking status → reflects immediately

- [ ] **Step 5: Commit**

```powershell
git add src/hooks/useServices.ts app/dashboard/marketing/services/page.tsx
git commit -m "refactor: replace services CRUD useEffect with useServices hook"
```

---

## Task 6: Hook — `useReferrals`

**Files:**
- Create: `src/hooks/useReferrals.ts`
- Modify: `app/dashboard/marketing/referrals/page.tsx`

- [ ] **Step 1: Create `src/hooks/useReferrals.ts`**

```typescript
// Referral codes + redemption (order_referrals) for a creator: list reads + CRUD.
// DB tables: referral_codes, order_referrals
// Query keys: ['referrals','codes',{creatorId}], ['referrals','redemptions',{creatorId}]
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

export function useReferrals() {
  const queryClient = useQueryClient();

  const codesQuery = useQuery({
    queryKey: ['referrals', 'codes'] as const,
    queryFn: async () => {
      try {
        const creatorId = await getCreatorProfileId();
        const { data: codes, error: codesErr } = await supabase
          .from('referral_codes').select('*')
          .eq('owner_creator_id', creatorId)
          .order('created_at', { ascending: false });
        if (codesErr) throw codesErr;

        const codeIds = (codes ?? []).map((c: any) => c.id);
        let redemptions: any[] = [];
        if (codeIds.length > 0) {
          const { data: reds, error: redsErr } = await supabase
            .from('order_referrals').select('*').in('referral_code_id', codeIds);
          if (redsErr) throw redsErr;
          redemptions = reds ?? [];
        }
        return { creatorId, codes: codes ?? [], redemptions };
      } catch (err) {
        console.error('useReferrals error:', err);
        throw err;
      }
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['referrals'] });
  const creatorId = codesQuery.data?.creatorId;

  const createCode = useMutation({
    mutationFn: async (payload: { code: string; description?: string | null; reward_amount?: number | null }) => {
      if (!creatorId) throw new Error('creator not loaded');
      const { error } = await supabase.from('referral_codes').insert({
        owner_creator_id: creatorId,
        code: payload.code,
        description: payload.description ?? null,
        reward_amount: payload.reward_amount ?? 0,
        is_active: true,
      } as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleActive = useMutation({
    mutationFn: async (code: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('referral_codes').update({ is_active: !code.is_active }).eq('id', code.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteCode = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('referral_codes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    codes: codesQuery.data?.codes ?? [],
    redemptions: codesQuery.data?.redemptions ?? [],
    isLoading: codesQuery.isLoading,
    createCode: createCode.mutateAsync,
    toggleActive: toggleActive.mutateAsync,
    deleteCode: deleteCode.mutateAsync,
  };
}
```

- [ ] **Step 2: Refactor `app/dashboard/marketing/referrals/page.tsx`**

Replace the existing data-loading `useEffect(() => { load(); }, [load]);` (around line 77) and the four supabase calls in the create/toggle/delete handlers. At the top of the page component:

```typescript
import { useReferrals } from '@/hooks/useReferrals';
// ...

const { codes, redemptions, isLoading: loading, createCode, toggleActive, deleteCode } = useReferrals();
```

Delete the local `useState` triplet for codes/redemptions, the `load` `useCallback`, and the `useEffect` that called it.

Replace each handler that used `supabase.from('referral_codes').insert(...)`, `.update(...)`, `.delete(...)` with the mutation calls (`createCode({...})`, `toggleActive({ id, is_active })`, `deleteCode(id)`). The exact lines were 86, 104, 109 — confirm with Read before editing.

- [ ] **Step 3: Type-check + lint + manual verification**

```powershell
npx tsc --noEmit; if ($?) { npm run lint }
```
Then open http://localhost:3000/dashboard/marketing/referrals. Create a code, toggle it, delete it. Confirm list updates after each action.

- [ ] **Step 4: Commit**

```powershell
git add src/hooks/useReferrals.ts app/dashboard/marketing/referrals/page.tsx
git commit -m "refactor: replace referrals CRUD useEffect with useReferrals hook"
```

---

## Task 7: Hook — `useCommunity`

**Files:**
- Create: `src/hooks/useCommunity.ts`
- Modify: `app/dashboard/marketing/community/page.tsx`

- [ ] **Step 1: Read the current file first**

Use the Read tool on `app/dashboard/marketing/community/page.tsx` to capture the exact insert/delete payload shape. The plan's hook signature depends on it.

- [ ] **Step 2: Create `src/hooks/useCommunity.ts`**

```typescript
// Community posts + reactions for the dashboard. Removes (supabase as any) casts where types permit.
// DB tables: community_posts, community_reactions
// Query keys: ['community','posts'], ['community','reactions',{creatorId}]
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

export function useCommunity() {
  const queryClient = useQueryClient();

  const postsQuery = useQuery({
    queryKey: ['community', 'posts'] as const,
    queryFn: async () => {
      try {
        const creatorId = await getCreatorProfileId();
        const { data: posts, error: pErr } = await (supabase as any)
          .from('community_posts').select('*').order('created_at', { ascending: false });
        if (pErr) throw pErr;

        const { data: reactions, error: rErr } = await (supabase as any)
          .from('community_reactions').select('*').eq('creator_id', creatorId);
        if (rErr) throw rErr;

        return { creatorId, posts: posts ?? [], reactions: reactions ?? [] };
      } catch (err) {
        console.error('useCommunity error:', err);
        throw err;
      }
    },
  });

  const creatorId = postsQuery.data?.creatorId;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['community'] });

  const createPost = useMutation({
    mutationFn: async (payload: { content: string; image_url?: string | null }) => {
      if (!creatorId) throw new Error('creator not loaded');
      const { error } = await (supabase as any).from('community_posts').insert({
        author_id: creatorId,
        content: payload.content,
        image_url: payload.image_url ?? null,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('community_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggleReaction = useMutation({
    mutationFn: async ({ postId, hasReacted }: { postId: string; hasReacted: boolean }) => {
      if (!creatorId) throw new Error('creator not loaded');
      if (hasReacted) {
        const { error } = await (supabase as any).from('community_reactions')
          .delete().eq('post_id', postId).eq('creator_id', creatorId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('community_reactions')
          .insert({ post_id: postId, creator_id: creatorId });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  return {
    posts: postsQuery.data?.posts ?? [],
    reactions: postsQuery.data?.reactions ?? [],
    isLoading: postsQuery.isLoading,
    createPost: createPost.mutateAsync,
    deletePost: deletePost.mutateAsync,
    toggleReaction: toggleReaction.mutateAsync,
  };
}
```

(Casts remain because `community_*` tables aren't in `database.types.ts`.)

- [ ] **Step 3: Refactor `app/dashboard/marketing/community/page.tsx`**

Replace local state for posts/reactions + `loadPosts` callback + the `useEffect` at line 114 with the hook destructure. Map each existing inline `supabase.from(...).insert/delete/etc.` call to the corresponding mutation function. The insert at line 121 becomes `await createPost({...})`. The delete-then-insert at lines 141/144 becomes `await toggleReaction({ postId, hasReacted })`. The delete at line 157 becomes `await deletePost(id)`.

- [ ] **Step 4: Type-check + lint + manual verification**

```powershell
npx tsc --noEmit; if ($?) { npm run lint }
```
Then open http://localhost:3000/dashboard/marketing/community. Create a post, react to one, delete a post. Confirm list updates.

- [ ] **Step 5: Commit**

```powershell
git add src/hooks/useCommunity.ts app/dashboard/marketing/community/page.tsx
git commit -m "refactor: replace community CRUD useEffect with useCommunity hook"
```

---

## Task 8: Hook — `useMarketingStats`

**Files:**
- Create: `src/hooks/useMarketingStats.ts`
- Modify: `app/dashboard/marketing/page.tsx`

- [ ] **Step 1: Read `app/dashboard/marketing/page.tsx` to capture the exact stats query shape**

Use Read on that file, focusing on the `useEffect` at line 27 and the stats it computes.

- [ ] **Step 2: Create `src/hooks/useMarketingStats.ts`**

```typescript
// Aggregated marketing dashboard counts.
// DB tables: coupons, lead_form, sites, affiliates, referral_codes, order_referrals
// Query keys: ['marketing','stats', creatorId]
"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getCreatorProfileId } from '@/lib/getCreatorProfileId';

export function useMarketingStats() {
  return useQuery({
    queryKey: ['marketing', 'stats'] as const,
    queryFn: async () => {
      try {
        const creatorId = await getCreatorProfileId();
        const { data: userRes } = await supabase.auth.getUser();
        const uid = userRes?.user?.id ?? '';

        const siteIdsRes = await supabase.from('sites').select('id').eq('creator_id', creatorId);
        const siteIds = (siteIdsRes.data ?? []).map((s: any) => s.id);

        const [coupons, leads, affiliates, refCodes] = await Promise.all([
          supabase.from('coupons').select('id, is_active').eq('creator_id', uid),
          siteIds.length > 0
            ? supabase.from('lead_form').select('id', { count: 'exact', head: true }).in('site_id', siteIds)
            : Promise.resolve({ count: 0 } as any),
          supabase.from('affiliates').select('id').eq('creator_id', creatorId),
          supabase.from('referral_codes').select('id').eq('owner_creator_id', creatorId),
        ]);

        const codeIds = (refCodes.data ?? []).map((c: any) => c.id);
        const orderRefCount = codeIds.length > 0
          ? (await supabase.from('order_referrals').select('id', { count: 'exact', head: true }).in('referral_code_id', codeIds)).count ?? 0
          : 0;

        return {
          couponCount: coupons.data?.length ?? 0,
          activeCouponCount: (coupons.data ?? []).filter((c: any) => c.is_active).length,
          leadCount: (leads as any).count ?? 0,
          affiliateCount: affiliates.data?.length ?? 0,
          referralCount: refCodes.data?.length ?? 0,
          orderReferralCount: orderRefCount,
        };
      } catch (err) {
        console.error('useMarketingStats error:', err);
        throw err;
      }
    },
  });
}
```

- [ ] **Step 3: Refactor `app/dashboard/marketing/page.tsx`**

Replace the local stats state + `useEffect` at line 27 with:

```typescript
import { useMarketingStats } from '@/hooks/useMarketingStats';
// ...

const { data: stats, isLoading: loading } = useMarketingStats();
```

Update any reference to the old state shape to read from `stats?.couponCount`, etc. (Read the file first to map each field correctly.)

- [ ] **Step 4: Type-check + lint + manual verification**

```powershell
npx tsc --noEmit; if ($?) { npm run lint }
```
Then open http://localhost:3000/dashboard/marketing. Confirm each stat card shows a number (not skeleton stuck).

- [ ] **Step 5: Commit**

```powershell
git add src/hooks/useMarketingStats.ts app/dashboard/marketing/page.tsx
git commit -m "refactor: replace marketing stats useEffect with useMarketingStats hook"
```

---

## Task 9: Hook — `useSiteEdit` (multi-table site read + payment-config write)

**Why grouped:** Shared by 4 consumers — `SiteVisualEditor`, `SiteEditShell`, `sites/edit/main/<id>`, `sites/edit/payment/<id>`. The hook accepts an `include` array so each caller pulls only the tables it needs.

**Files:**
- Create: `src/hooks/useSiteEdit.ts`
- Modify: `src/components/dashboard/site-edit/SiteVisualEditor.tsx`
- Modify: `src/components/dashboard/site-edit/SiteEditShell.tsx`
- Modify: `app/dashboard/sites/edit/main/[id]/page.tsx`
- Modify: `app/dashboard/sites/edit/payment/[id]/page.tsx`

- [ ] **Step 1: Create `src/hooks/useSiteEdit.ts`**

```typescript
// Multi-table read for the site edit screens + the small payment-config upsert.
// DB tables: sites, site_main, site_navigation, site_design_tokens, site_sections_config, site_product_assignments
// Query keys: ['sites','edit-state', siteId, { include }]
"use client";

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export type SiteEditInclude = 'main' | 'nav' | 'tokens' | 'sections' | 'assignments';

const DEFAULT_INCLUDE: SiteEditInclude[] = ['main', 'nav', 'tokens'];

export function useSiteEditQuery(siteId: string | undefined, opts?: { include?: SiteEditInclude[] }) {
  const include = (opts?.include ?? DEFAULT_INCLUDE).slice().sort();

  return useQuery({
    queryKey: ['sites', 'edit-state', siteId, { include }] as const,
    enabled: !!siteId,
    queryFn: async () => {
      try {
        const id = siteId!;
        const tasks: Record<string, Promise<any>> = {
          site: supabase.from('sites').select('*').eq('id', id).single(),
        };
        if (include.includes('main')) tasks.main = supabase.from('site_main').select('*').eq('site_id', id).maybeSingle();
        if (include.includes('nav')) tasks.nav = supabase.from('site_navigation').select('*').eq('site_id', id).maybeSingle();
        if (include.includes('tokens')) tasks.tokens = supabase.from('site_design_tokens').select('color_palette').eq('site_id', id).maybeSingle();
        if (include.includes('sections')) tasks.sections = supabase.from('site_sections_config').select('sections').eq('site_id', id).maybeSingle();
        if (include.includes('assignments')) tasks.assignments = supabase.from('site_product_assignments').select('product_id').eq('site_id', id);

        const entries = await Promise.all(Object.entries(tasks).map(async ([k, p]) => [k, await p] as const));
        const out: Record<string, any> = {};
        for (const [k, res] of entries) {
          if (res.error && res.error.code !== 'PGRST116') throw res.error; // PGRST116 = no rows
          out[k] = (res as any).data;
        }
        return out as {
          site: any;
          main?: any; nav?: any; tokens?: any; sections?: any; assignments?: { product_id: string }[];
        };
      } catch (err) {
        console.error('useSiteEditQuery error:', err);
        throw err;
      }
    },
  });
}

export function useSiteEditMutations(siteId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['sites', 'edit-state', siteId] });

  // The payment edit screen does a tiny upsert into site_main only. Larger editor saves stay inline per spec §5.
  const savePaymentConfig = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      if (!siteId) throw new Error('siteId required');
      const { data: existing } = await supabase.from('site_main').select('site_id').eq('site_id', siteId).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('site_main').update(payload).eq('site_id', siteId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('site_main').insert({ site_id: siteId, ...payload } as any);
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  return {
    savePaymentConfig: savePaymentConfig.mutateAsync,
    isSavingPayment: savePaymentConfig.isPending,
  };
}
```

- [ ] **Step 2: Refactor `src/components/dashboard/site-edit/SiteVisualEditor.tsx`**

Replace the data-load `useEffect` at line 107 (and the `Promise.all` that follows) with the hook. Imports:
```typescript
import { useSiteEditQuery } from '@/hooks/useSiteEdit';
```
At the top of the component:
```typescript
const { data: editData, isLoading: loading } = useSiteEditQuery(siteId, { include: ['main', 'nav', 'tokens'] });

useEffect(() => {
  if (!editData) return;
  setSite(editData.site);
  setSiteMain(editData.main ?? null);
  // ... existing setSites for nav and palette from editData
}, [editData]);
```
Delete the original loading `useEffect` (lines 107–~178 — the load() function and its invocation).

- [ ] **Step 3: Refactor `src/components/dashboard/site-edit/SiteEditShell.tsx`**

Same pattern: replace the `useEffect` at line 144 with `useSiteEditQuery(siteId)` + a state-sync useEffect.

- [ ] **Step 4: Refactor `app/dashboard/sites/edit/main/[id]/page.tsx`**

Replace the data-load `useEffect` at line 338 with:
```typescript
const { data: editData, isLoading: loading } = useSiteEditQuery(siteId, { include: ['main','nav','tokens','sections','assignments'] });

useEffect(() => {
  if (!editData) return;
  // Mechanical move: open the original useEffect's load() function body, find every
  // setState call (setSite, setSiteMain, setNavItems, setPalette, setSections,
  // setAssigned, etc.), and paste them here. Read values come from editData.site,
  // editData.main, editData.nav, editData.tokens, editData.sections, editData.assignments
  // instead of the destructured `data` from the old Promise.all.
  setLoading(false);
}, [editData]);
```
Then delete the original load() useEffect entirely.

- [ ] **Step 5: Refactor `app/dashboard/sites/edit/payment/[id]/page.tsx`**

Read the file first to confirm the payload shape. Replace its load `useEffect` with:
```typescript
const { data: editData, isLoading: loading } = useSiteEditQuery(siteId, { include: ['main'] });
const { savePaymentConfig } = useSiteEditMutations(siteId);

useEffect(() => {
  if (editData?.main) setPayment(editData.main);
}, [editData]);
```
Replace the existing `handleSave`/upsert block (lines 37–43) with `await savePaymentConfig(payload);`.

- [ ] **Step 6: Type-check + lint**

```powershell
npx tsc --noEmit; if ($?) { npm run lint }
```

- [ ] **Step 7: Manual verification — each of the 4 routes**

Restart dev server. Visit:
- A `/dashboard/sites/edit/main/<siteId>` page — site loads, sections + product assignments render
- A `/dashboard/sites/edit/payment/<siteId>` page — fields load, save updates DB (refresh persists)
- Anywhere that mounts `SiteVisualEditor` or `SiteEditShell` — confirm preview iframe and editor panels still render correctly

- [ ] **Step 8: Commit**

```powershell
git add src/hooks/useSiteEdit.ts src/components/dashboard/site-edit/SiteVisualEditor.tsx src/components/dashboard/site-edit/SiteEditShell.tsx "app/dashboard/sites/edit/main/[id]/page.tsx" "app/dashboard/sites/edit/payment/[id]/page.tsx"
git commit -m "refactor: replace site edit screen useEffects with useSiteEdit hook"
```

---

## Task 10: Hook — `useLinkInBioSite`

**Files:**
- Create: `src/hooks/useLinkInBioSite.ts`
- Modify: `app/dashboard/sites/edit/linkinbio/[id]/page.tsx` (reads only — save() stays inline per spec §5)

- [ ] **Step 1: Create `src/hooks/useLinkInBioSite.ts`**

```typescript
// Linkinbio editor read-only fetch: sites + tokens + linkinbio_pages + linkinbio_blocks + linkinbio_items + products.
// save() orchestration stays inline in the editor page per spec §5.
// DB tables: sites, site_design_tokens, linkinbio_pages*, linkinbio_blocks*, linkinbio_items*, products
//   (* missing from database.types.ts; (supabase as any) used for those)
// Query keys: ['sites','linkinbio', siteId]
"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export function useLinkInBioSiteQuery(siteId: string | undefined) {
  return useQuery({
    queryKey: ['sites', 'linkinbio', siteId] as const,
    enabled: !!siteId,
    queryFn: async () => {
      try {
        const id = siteId!;
        const [siteRes, tokensRes] = await Promise.all([
          supabase.from('sites').select('*').eq('id', id).single(),
          supabase.from('site_design_tokens').select('color_palette').eq('site_id', id).maybeSingle(),
        ]);
        if (siteRes.error) throw siteRes.error;

        const { data: page } = await (supabase.from('linkinbio_pages' as any) as any)
          .select('*').eq('site_id', id).maybeSingle();

        let blocks: any[] = [];
        let items: any[] = [];
        if (page?.id) {
          const { data: blockRows } = await (supabase.from('linkinbio_blocks' as any) as any)
            .select('*').eq('page_id', page.id).order('sort_order', { ascending: true });
          blocks = blockRows ?? [];
          if (blocks.length > 0) {
            const blockIds = blocks.map((b) => b.id);
            const { data: itemRows } = await (supabase.from('linkinbio_items' as any) as any)
              .select('*').in('block_id', blockIds).order('sort_order', { ascending: true });
            items = itemRows ?? [];
          }
        }

        let products: any[] = [];
        if (siteRes.data?.creator_id) {
          const { data: prods } = await supabase
            .from('products')
            .select('id, name, price, thumbnail_url, is_published')
            .eq('creator_id', siteRes.data.creator_id)
            .order('created_at', { ascending: false });
          products = prods ?? [];
        }

        return {
          site: siteRes.data,
          tokens: tokensRes.data,
          page,
          blocks,
          items,
          products,
        };
      } catch (err) {
        console.error('useLinkInBioSiteQuery error:', err);
        throw err;
      }
    },
  });
}
```

- [ ] **Step 2: Refactor `app/dashboard/sites/edit/linkinbio/[id]/page.tsx`**

Replace only the data-load `useEffect` (around line 429) — leave the rest of the file (save logic, slug check effect, preview-iframe debounce effects, undo/redo) untouched.

Add import: `import { useLinkInBioSiteQuery } from '@/hooks/useLinkInBioSite';`

At the top of `EditLinkInBioPage`:
```typescript
const { data: loaded, isLoading: loadingQuery } = useLinkInBioSiteQuery(siteId);

useEffect(() => {
  if (!loaded) return;
  const s = loaded.site;
  const tokens = loaded.tokens;
  const page = loaded.page;
  const rawBlocks = loaded.blocks;
  const rawItems = loaded.items;

  setSite(s);
  if (tokens?.color_palette) setPalette(tokens.color_palette as Record<string, string>);
  setSlug(s?.slug ?? '');
  setOriginalSlug(s?.slug ?? null);
  setIsPublished(s?.is_active ?? true);

  if (page) {
    // Mechanical move: the old load() function (in the same file, lines ~450-484)
    // reads `page.theme`, `page.layout`, `page.settings`, `page.seo`, and sets seo/profile/
    // appearance state. Lift exactly those setState calls into here, reading from the
    // `page` const above instead of the `page` variable from the deleted Promise.all.
  }
  if (rawBlocks && rawBlocks.length > 0) {
    // Mechanical move: the old load() (lines ~492-526) maps rawBlocks/rawItems into
    // the BioLink[] shape and calls setLinks(...). Lift that block mapping verbatim
    // into here, reading from `rawBlocks`/`rawItems` above.
  }
  setProducts(loaded.products);

  setLoading(false);
}, [loaded]);
```

Then **delete** the original `useEffect(() => { const load = async () => { ... }; load(); }, [siteId]);` block (around lines 429–543). Keep the `const [loading, setLoading] = useState(true);` declaration.

- [ ] **Step 3: Type-check + lint**

```powershell
npx tsc --noEmit; if ($?) { npm run lint }
```

- [ ] **Step 4: Manual verification**

Open http://localhost:3000/dashboard/sites/edit/linkinbio/<siteId>. Confirm:
- Profile, links, palette, products all load
- Preview iframe shows the bio with current data
- Editing a link, profile field, or applying a template → preview updates within ~1 frame (postMessage path)
- Click Save → success indicator → reload → changes persisted

- [ ] **Step 5: Commit**

```powershell
git add src/hooks/useLinkInBioSite.ts "app/dashboard/sites/edit/linkinbio/[id]/page.tsx"
git commit -m "refactor: replace linkinbio editor read useEffect with useLinkInBioSite hook"
```

---

## Task 11: Hook — `useSinglePageSite`

**Files:**
- Create: `src/hooks/useSinglePageSite.ts`
- Modify: `app/dashboard/sites/edit/singlepage/[id]/page.tsx` (reads only — save() stays inline)

- [ ] **Step 1: Create `src/hooks/useSinglePageSite.ts`**

```typescript
// Singlepage editor read: sites + tokens + site_singlepage.
// save() stays inline per spec §5.
// DB tables: sites, site_design_tokens, site_singlepage
// Query keys: ['sites','singlepage', siteId]
"use client";

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

export function useSinglePageSiteQuery(siteId: string | undefined) {
  return useQuery({
    queryKey: ['sites', 'singlepage', siteId] as const,
    enabled: !!siteId,
    queryFn: async () => {
      try {
        const id = siteId!;
        const [siteRes, tokensRes, pageRes] = await Promise.all([
          supabase.from('sites').select('*').eq('id', id).single(),
          supabase.from('site_design_tokens').select('color_palette').eq('site_id', id).maybeSingle(),
          supabase.from('site_singlepage').select('*').eq('site_id', id).maybeSingle(),
        ]);
        if (siteRes.error) throw siteRes.error;
        return { site: siteRes.data, tokens: tokensRes.data, page: pageRes.data };
      } catch (err) {
        console.error('useSinglePageSiteQuery error:', err);
        throw err;
      }
    },
  });
}
```

- [ ] **Step 2: Refactor `app/dashboard/sites/edit/singlepage/[id]/page.tsx`**

Replace the data-load `useEffect` at line 246 with `useSinglePageSiteQuery(siteId)` plus a state-sync `useEffect`. Mechanical move: the original load() function reads `page.metadata`, `page.theme`, etc., and calls setContent/setSiteSettings/setSeo/setAppearance (lines ~263-350 of the original file). Lift exactly those setState calls into the new sync effect, reading from `loaded.page`/`loaded.site`/`loaded.tokens` instead of the destructured `data` from the old Promise.all. Do not touch the slug-check effect, the preview-iframe debounce effect, or save logic.

- [ ] **Step 3: Type-check + lint + manual verification**

```powershell
npx tsc --noEmit; if ($?) { npm run lint }
```
Open http://localhost:3000/dashboard/sites/edit/singlepage/<siteId>. Confirm the page editor loads and Save still works.

- [ ] **Step 4: Commit**

```powershell
git add src/hooks/useSinglePageSite.ts "app/dashboard/sites/edit/singlepage/[id]/page.tsx"
git commit -m "refactor: replace singlepage editor read useEffect with useSinglePageSite hook"
```

---

## Task 12: Settings/library uses existing `useLibrary`

**Files:**
- Modify: `app/dashboard/settings/library/page.tsx`

- [ ] **Step 1: Read the current file**

Read `app/dashboard/settings/library/page.tsx` to capture the existing `PurchasedProduct` shape and how it's flattened from orders → order_items → products.

- [ ] **Step 2: Confirm `useLibrary` exports the same shape**

Read `src/hooks/useLibrary.ts`. If it returns a flattened purchased-product list (matching the existing `PurchasedProduct` interface), proceed. If not, this task expands: update `useLibrary` to expose the flat shape OR map locally.

- [ ] **Step 3: Refactor `app/dashboard/settings/library/page.tsx`**

Replace the local `products` state + `useEffect` at line 34 with:

```typescript
import { useLibrary } from '@/hooks/useLibrary';
// ...

const { products, isLoading } = useLibrary();
```

Remove the `createClient` import if not used elsewhere in the file.

- [ ] **Step 4: Type-check + lint + manual verification**

```powershell
npx tsc --noEmit; if ($?) { npm run lint }
```
Open http://localhost:3000/dashboard/settings/library while signed in as a buyer who has purchased products. List renders.

- [ ] **Step 5: Commit**

```powershell
git add app/dashboard/settings/library/page.tsx
git commit -m "refactor: settings/library consume useLibrary hook instead of inline fetch"
```

---

## Task 13: Extend `useEarnings` with `updateKyc`

**Files:**
- Modify: `src/hooks/useEarnings.ts`
- Modify: `app/dashboard/settings/billing/page.tsx`

- [ ] **Step 1: Extend `src/hooks/useEarnings.ts`**

Append after the existing `useQuery` block (within the same `useEarnings` function, before the `return`):

```typescript
const queryClient = useQueryClient();

const updateKycMutation = useMutation({
  mutationFn: async (payload: Record<string, any>) => {
    try {
      const creatorId = await getCreatorProfileId();
      const { error } = await supabase.from('creator_kyc').upsert({ creator_id: creatorId, ...payload });
      if (error) throw error;
    } catch (err) {
      console.error('useEarnings updateKyc error:', err);
      throw err;
    }
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['creator-earnings'] }),
});
```

Add `useMutation, useQueryClient` to the imports at the top:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
```

Update the return:
```typescript
return {
  creatorBalances: data?.balances,
  payouts: data?.payouts || [],
  kyc: data?.kyc,
  isLoading,
  error,
  refreshEarnings: refetch,
  updateKyc: updateKycMutation.mutateAsync,
  isUpdatingKyc: updateKycMutation.isPending,
};
```

- [ ] **Step 2: Refactor `app/dashboard/settings/billing/page.tsx`**

Add `updateKyc` to the destructure of `useEarnings()`:
```typescript
const { kyc, isLoading, refreshEarnings, updateKyc } = useEarnings();
```

Replace the existing `supabase.from('creator_kyc').upsert(...)` block (around line 172) with:
```typescript
await updateKyc({
  legal_name: form.legal_name,
  pan_enc: form.pan_enc,
  bank_account_enc: form.bank_account_enc,
  bank_account_name: form.bank_account_name,
  ifsc_code: form.ifsc_code,
  upi_id_enc: form.upi_id_enc || null,
  aadhaar_last4: form.aadhaar_last4 || null,
  dob: form.dob || null,
  gender: form.gender || null,
  address_line1: form.address_line1 || null,
  address_line2: form.address_line2 || null,
  city: form.city || null,
  state: form.state || null,
  postal_code: form.postal_code || null,
  country: form.country || 'India',
  status: 'pending',
});
await refreshEarnings();
```

Remove the now-unused `supabase = createClient();` and `import { createClient } ...` lines if they're not referenced elsewhere in the file.

- [ ] **Step 3: Type-check + lint + manual verification**

```powershell
npx tsc --noEmit; if ($?) { npm run lint }
```
Open http://localhost:3000/dashboard/settings/billing. Fill out the KYC form → submit → status banner moves to "Under Review" → refresh persists.

- [ ] **Step 4: Commit**

```powershell
git add src/hooks/useEarnings.ts app/dashboard/settings/billing/page.tsx
git commit -m "feat(useEarnings): add updateKyc mutation; route billing submit through it"
```

---

## Task 14: Docs + final verification

**Files:**
- Modify: `.claude/rules/hooks-reference.md`

- [ ] **Step 1: Update `.claude/rules/hooks-reference.md`**

Read the current file. After the intro line, insert a short subsection:

```markdown
## Query key convention

All hooks use hierarchical keys: `[domain, kind, ...identifiers]`. Examples:
`['profiles','detail', creatorId]`, `['services','list',{creatorId}]`,
`['sites','edit-state', siteId, { include }]`, `['auth','session']`.
This lets `queryClient.invalidateQueries({ queryKey: ['sites'] })` clear a whole domain.
```

Then add these rows to the main hook table (alphabetical or in module order — match the existing file's pattern):

| Hook | Returns |
|---|---|
| `useProfileQuery(creatorId?)` | `{ data: profile, isLoading, error }` |
| `useProfileMutations()` | `{ updateProfile, setEmailVerified, setMobileVerified }` |
| `useProfile(creatorId?)` | composes both — for consumers that need read + write |
| `useServices()` | `{ services, bookings, createService, updateService, deleteService, toggleActive, updateBookingStatus }` |
| `useReferrals()` | `{ codes, redemptions, createCode, toggleActive, deleteCode }` |
| `useCommunity()` | `{ posts, reactions, createPost, deletePost, toggleReaction }` |
| `useMarketingStats()` | aggregated dashboard counts |
| `useSiteEditQuery(siteId, { include })` | site + selected related tables |
| `useSiteEditMutations(siteId)` | `{ savePaymentConfig }` |
| `useLinkInBioSiteQuery(siteId)` | `{ site, tokens, page, blocks, items, products }` |
| `useSinglePageSiteQuery(siteId)` | `{ site, tokens, page }` |
| `useDiscoverProduct(productId)` | `{ product, related, creatorProducts }` (calls `/api/discover/[id]`) |
| `useAuthSession()` | `{ isLoggedIn, userEmail, profile, isLoading }` — invalidate via `['auth','session']` |
| `useEarnings()` extended | adds `updateKyc(payload)` mutation |

- [ ] **Step 2: Re-run the offender grep**

Use Grep:
- pattern: `useEffect\([\s\S]{0,500}?(supabase|\.from\()`
- glob: `**/*.tsx`
- output_mode: `files_with_matches`
- multiline: `true`

Expected: **exactly 1 file** — `src/components/marketing/MarketingNav.tsx` (the `onAuthStateChange` subscription, which is the documented exception). If any other file appears, refactor it before continuing.

- [ ] **Step 3: Final type-check + lint**

```powershell
npx tsc --noEmit; if ($?) { npm run lint }
```
Expected: both pass.

- [ ] **Step 4: Final dev-server sanity sweep**

```powershell
npm run dev
```
In Chrome, walk every refactored route once more:
- `/dashboard/marketing` (stats)
- `/dashboard/marketing/services` (CRUD)
- `/dashboard/marketing/referrals` (CRUD)
- `/dashboard/marketing/community` (CRUD)
- `/dashboard/settings/profile`
- `/dashboard/settings/billing` (KYC submit)
- `/dashboard/settings/library`
- `/dashboard/sites/edit/main/<id>`
- `/dashboard/sites/edit/payment/<id>` (save)
- `/dashboard/sites/edit/linkinbio/<id>` (save)
- `/dashboard/sites/edit/singlepage/<id>` (save)
- `/account/profile`
- `/discover/<productId>`
- Header (marketing nav): logged-out → log in → log out

No console errors. No broken loading skeletons. No 500s in the Network tab.

- [ ] **Step 5: Commit docs**

```powershell
git add .claude/rules/hooks-reference.md
git commit -m "docs(hooks-reference): document new hooks and query key convention"
```

- [ ] **Step 6: Push branch (optional — wait for user direction before opening a PR)**

```powershell
git push -u origin refactor/useeffect-to-tanstack-query
```

Do NOT open a PR automatically — wait for user confirmation.

---

## Spec acceptance checklist

Tick after Step 4 of Task 14:

- [ ] Grep returns only `MarketingNav.tsx` (spec §9.1)
- [ ] All 10 new hooks exist in `src/hooks/` and are listed in `.claude/rules/hooks-reference.md` (spec §9.2)
- [ ] `useEarnings.updateKyc` mutation exists and is used by `settings/billing` (spec §9.3)
- [ ] `settings/library` consumes `useLibrary()` (spec §9.4)
- [ ] `npx tsc --noEmit` passes (spec §9.5)
- [ ] `npm run lint` passes (spec §9.6)
- [ ] Manual verification of all 16 routes — no UX regressions (spec §9.7)
