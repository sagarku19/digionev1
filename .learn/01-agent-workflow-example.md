---
noteId: "1ca62cd0551611f18f8473a35080aeae"
tags: []

---

# Agent Workflow Example — Referral Banner Feature

Full pipeline demo: Research → Plan → Implement → Review → Commit

---

## The Feature

Add a referral attribution banner to the storefront product page.
When a buyer lands on `/p/[productSlug]?ref=[affiliateCode]`, show:
> "You were referred by [affiliate name]"

---

## Step 1 — Rough idea → Precise prompt

```
/improve add referral banner on product page that shows "referred by [name]"
         when buyer arrives via affiliate link
```

**Output from `/improve`:**
```
Agent role: Storefront Agent

Add a referral attribution banner to the storefront product page.

When a buyer lands on /p/[productSlug] with ?ref=[affiliateCode] in the URL,
display a small banner: "You were referred by [affiliate name]"

Files to touch:
- app/(storefront)/p/[productSlug]/page.tsx
- src/components/storefront/ReferralBanner.tsx  ← create
- src/hooks/useAffiliate.ts  ← check if name lookup exists

Constraints:
- Use var(--creator-primary) for banner accent — no hex colors
- lucide-react icons only (Users icon)
- Do not touch checkout flow, payment routes, or dashboard files

Don't touch: app/api/, src/components/dashboard/, types/database.types.ts
```

---

## Step 2 — Research

```
/research storefront product page and affiliate system
```

**Output:**
```
Files Involved:
- app/(storefront)/p/[productSlug]/page.tsx  — product page entry (Server Component)
- src/hooks/useAffiliates.ts                 — affiliate data hook
- affiliates table: public read of active affiliates by code (safe)

Call Chain:
  URL /p/[slug]?ref=CODE
    → page.tsx reads searchParams.ref
    → server-side affiliates table lookup (code → name)
    → <ReferralBanner /> (display only, no writes)

Key insight: product page is a Server Component — fetch affiliate name
server-side, no client hook needed. Low-risk, 2-file change.
```

---

## Step 3 — Plan

```
/plan Add referral banner to storefront product page using ?ref= URL param
```

**Output:**
```
Implementation Plan: Referral Attribution Banner
Agent Role: Storefront Agent

Affected Files:
- src/components/storefront/ReferralBanner.tsx  CREATE
- app/(storefront)/p/[productSlug]/page.tsx     MODIFY

Step 1: Create ReferralBanner.tsx
  — props: { affiliateName: string | null }
  — renders null when affiliateName is null
  — var(--creator-primary) left border accent
  — lucide-react Users icon

Step 2: Modify product page
  — read searchParams.ref
  — server-side affiliates query WHERE code = ref AND active = true
  — pass name (or null) to <ReferralBanner />

Risks:
  - Spoofed ref param → only display, never write to DB here ✓
  - Inactive affiliate → filter WHERE active = true ✓

Waiting for approval. Reply "go step 1" to begin.
```

You reply: **"go step 1"**

---

## Step 4 — Implement (one step at a time)

```
/implement Create src/components/storefront/ReferralBanner.tsx
           — affiliateName prop, creator CSS vars, lucide Users icon,
             renders null when prop is null
```

**Agent reports after writing:**
```
Created: src/components/storefront/ReferralBanner.tsx (28 lines)
- Renders null when affiliateName is null
- var(--creator-primary) border, var(--creator-text) for text
- lucide-react Users icon

npx tsc --noEmit → PASSED

Next: Modify page.tsx to read searchParams.ref and query affiliates.
Waiting for approval.
```

Reply: **"go step 2"** → agent writes page.tsx change → `tsc` passes → stops.

---

## Step 5 — Review

```
/review
```

**Output:**
```
High risk:  none
Medium risk: none
Low risk:
  ✓ ReferralBanner.tsx — null-safe, creator vars correct
  ✓ page.tsx — server-side only, filters active=true, no client Supabase call
  ✓ No hex colors, no dashboard imports, no console.log
  ✓ TypeScript passes

Recommendation: approve
```

---

## Step 6 — Commit

```bash
git add src/components/storefront/ReferralBanner.tsx
git add app/(storefront)/p/[productSlug]/page.tsx
git commit -m "feat(storefront): add affiliate referral banner to product page"
```

---

## What Made This Work

| Principle | How it showed up |
|---|---|
| One agent, one job | Research read-only, Plan no code, Implement one step |
| Approval gates | Agent stopped and waited after plan, after each step |
| Scoped context | Only 2 files changed, rest explicitly off-limits |
| Verification built in | `tsc` run after every implement step |
| Small commits | One commit per completed feature, not per step |

---

## Key Takeaway

The pipeline is: `/improve` → `/research` → `/plan` → approval → `/implement` (repeat per step) → `/review` → `git commit`

Never skip the plan step. Never let an agent implement more than one step without approval.
