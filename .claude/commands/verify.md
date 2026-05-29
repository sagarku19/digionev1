---
noteId: "157e86d05b9e11f183978dfe119e58b2"
tags: []
description: "Run the local verification gauntlet on changed files since the last commit"

---

You are a Backend Agent verifying that recent changes don't break anything. **Do not edit code** — report only. At the end, summarize and ask if the user wants you to fix any failures.

Run these checks in order:

### 1. What changed
- `git status --short` and `git diff --stat HEAD` — list files touched since the last commit.
- For each touched `.ts/.tsx` file, list which agent owns it (Frontend / Dashboard / Storefront / Backend per `.claude/rules/agent-roles.md`).

### 2. Type check — `npx tsc --noEmit`
- Report errors with `file:line`. Group by file. If clean, say so.

### 3. Lint — `npm run lint`
- Report errors AND warnings. Distinguish autofixable (rule names) from manual.

### 4. Rule scan on changed files only
For each changed `.ts/.tsx` file, grep for:
- `: any`, `as any`, `<any>` — strict-mode violations
- `console\.log` — **suppress matches inside JSX `placeholder=` strings or comments**
- `useEffect` patterns that fetch data (look for `useEffect(...) { ... supabase|fetch|await }`)
- Direct imports from `@supabase/supabase-js` or `@supabase/ssr` (allowed only via `@/lib/supabase/*` wrapper)
- Imports from icon libraries other than `lucide-react`
- Hardcoded hex colors in dashboard components (`#[0-9A-Fa-f]{3,8}`) — should use `var(--...)` instead

Report violations with `file:line`.

### 5. Affected user flows
From the file list, infer which user-facing flows are touched. Reference table:

| If a file is in… | Flow it affects |
|---|---|
| `app/(auth)/` or `app/api/auth/` | Signup / login / password reset |
| `app/(buyer)/checkout/` or `app/api/checkout/` | Buyer checkout |
| `app/api/webhook/cashfree/` | Payment confirmation (source of truth) |
| `app/(storefront)/link/` | Link-in-bio public page |
| `app/(storefront)/site/` or `app/(storefront)/store/` | Storefront sales page |
| `app/(storefront)/pay/` | Hosted payment links |
| `app/dashboard/products/` | Product CRUD |
| `app/dashboard/sites/` or `src/components/dashboard/site-edit/` | Site builder |
| `app/dashboard/earnings/` or `app/dashboard/payouts/` | Creator payouts |
| `src/components/storefront/sections/` | Storefront section rendering (check 3-way wiring) |

Print a manual smoke-test checklist: 3–5 things the user should click through in `npm run dev` before merging.

### 6. Build (optional — only if user opts in)
After the above, ask: **"Run `npm run build` too? (slow, ~30s — y/n)"**
If yes, run it and report any compilation errors.

---

## Output format

```
VERIFY REPORT
============================================
1. CHANGED FILES (N files)
   [grouped list with owner agent]

2. TYPECHECK
   ✅ clean   OR   ❌ N errors
   [details]

3. LINT
   ✅ clean   OR   ⚠️ N warnings, ❌ N errors
   [details]

4. RULE VIOLATIONS
   ✅ none   OR   ❌ N items
   [details with file:line]

5. SMOKE TEST CHECKLIST
   Affects: [flow1, flow2]
   [ ] [item 1]
   [ ] [item 2]
   ...

============================================
VERDICT: SAFE TO COMMIT  /  FIX BEFORE COMMIT  /  REVIEW MANUALLY
```

After the report, ask: **"Want me to fix the auto-fixable items? (y/n)"**

**Never run `git commit`, `git push`, or `git reset` — this command is read-only verification.**
