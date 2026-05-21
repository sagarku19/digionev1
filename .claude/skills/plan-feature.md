---
noteId: "08a63320551511f18f8473a35080aeae"
tags: []
name: "Plan Feature"
description: "Graph-powered implementation planning for DigiOne — explore first, output structured plan, wait for approval before any code"

---

## Plan Feature

Full planning pipeline for DigiOne features. Never writes code. Produces a structured, approval-gated plan.

### Phase 1 — Architecture Discovery

1. `get_architecture_overview` — understand which community (storefront / dashboard / API / lib) owns this area.
2. `semantic_search_nodes <feature keywords>` — locate relevant components, hooks, route handlers, types.
3. `query_graph imports_of <entry file>` — map the dependency chain outward.
4. `query_graph callers_of <key function>` — find all consumers of anything you plan to change.
5. `get_impact_radius <file>` — for every file you plan to touch, assess blast radius before committing to a change.
6. `detect_changes` — check if the area was recently modified (avoids merge conflicts and duplicate work).

### Phase 2 — DB & RLS Analysis

For any feature touching Supabase:
- Identify which tables are read or written
- Check existing RLS policies (read migration files in `supabase/` if needed)
- Flag any case where a client component could inadvertently write to `orders`, `creator_balances`, or `transaction_ledger` — this is always a blocker

### Phase 3 — Output Plan (this exact format)

```
## Implementation Plan: [Feature Name]

**Agent Role:** [Dashboard / Storefront / Backend / Frontend]

### Affected Files
| File | Change | Why |
|------|--------|-----|
| path/to/file.tsx | Modify / Create / Delete | reason |

### DB Tables
| Table | Access | RLS Risk |
|-------|--------|----------|
| table_name | Read / Write | Yes/No — details |

### New Files to Create
- `src/hooks/useXxx.ts` — TanStack Query hook for [what]
- `app/api/xxx/route.ts` — Route handler for [what]
- `src/components/dashboard/Xxx.tsx` — [what component does]

### Implementation Steps
**Step 1:** [atomic change — one file/concern]
**Step 2:** [atomic change — one file/concern]
**Step 3:** [atomic change — one file/concern]

### Risks
- [risk] → [mitigation]

### CLAUDE.md Rules That Apply
- [specific rules relevant to this plan]

### Do Not Touch
- [exact files and areas that must stay unchanged]

### Verification Checklist
- [ ] npx tsc --noEmit passes
- [ ] Dashboard: CSS vars used (no hardcoded hex)
- [ ] Storefront: creator CSS vars used (no dashboard vars)
- [ ] No console.log
- [ ] No raw Supabase in client components (hooks only)
- [ ] No useEffect for data fetching
- [ ] Prices formatted as ₹X,XXX
- [ ] No new packages added without asking
```

### Phase 4 — Stop

Output the plan above and then stop completely. Do not begin implementation. State explicitly:

> **Waiting for your approval. Reply "go" or "go step 1" to begin implementation.**

### DigiOne-specific planning rules

- If the feature touches the payment flow (`/api/checkout`, `/api/webhook`), mark every step as high-risk and add a note that Cashfree must never be called from the browser.
- If the feature adds a dashboard page, the plan must include a Sidebar nav entry (`src/components/dashboard/Sidebar.tsx`) as its own step.
- If the feature adds a storefront section, the plan must include registering it in `section-defs.ts` and `SectionRenderer.tsx`.
- If any new DB table access is needed, the plan must include a migration file step and RLS policy step before any UI step.
- Currency formatting: always ₹ with Indian number system — include in the verification checklist any time prices are displayed.
