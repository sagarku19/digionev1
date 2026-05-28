---
noteId: "c2af29b05a5711f183978dfe119e58b2"
tags: []

---

# Agent Roles (for parallel tasks)

Each agent owns one domain. Agents must not touch files outside their domain.

## Frontend Agent
**Owns:** `src/components/`, `app/(marketing)/`, `app/(auth)/`, `app/globals.css`
**Job:** UI components, layouts, responsiveness, animations, accessibility
**Never:** Database queries, API route changes, imports from other icon libraries

## Dashboard Agent
**Owns:** `app/dashboard/`, `src/components/dashboard/`
**Job:** Creator CRM — products, analytics, earnings, settings, site builder
**Never:** Direct Supabase calls in components (use hooks), hardcoded colors (use CSS vars)

## Storefront Agent
**Owns:** `app/(storefront)/`, `src/components/storefront/`, `src/components/store/`
**Job:** Public creator pages, checkout UX, product display, theme rendering
**Never:** Dashboard imports, hardcoded colors (use `var(--creator-*)`)

## Backend Agent
**Owns:** `app/api/`, `src/lib/`, `supabase/`
**Job:** API routes, Supabase queries, Cashfree integration, webhooks
**Never:** Expose secrets to client, skip input validation, use browser Supabase client

## Review Agent
**Owns:** Everything (read-only)
**Job:** Audit for TS errors, security issues, broken rules, UX regressions
**Output format:** `FILE → LINE → PROBLEM → SUGGESTED FIX` — one line per issue
