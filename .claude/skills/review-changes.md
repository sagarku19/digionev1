---
name: Review Changes
description: Risk-aware code review for DigiOne changes using the knowledge graph
---

## Review Changes

Structured review flow for this Next.js + Supabase codebase.

### Steps

1. `detect_changes` — get risk-scored analysis of all modified files.
2. `get_affected_flows` — find which storefront / dashboard / API paths are impacted.
3. For each high-risk function, `query_graph pattern="tests_for"` — check test coverage.
4. `get_impact_radius` on any changed `lib/` file — shared utils can break both halves of the app.
5. Flag untested high-risk changes; suggest specific test cases.

### Output format

Group findings by risk level:

**High risk** — data mutations, auth/session logic, Supabase RLS policies, shared lib utils  
**Medium risk** — UI components with side effects, API route handlers, dynamic route params  
**Low risk** — presentational components, style-only changes, static pages

For each finding:
- What changed and why it matters
- Whether it has test coverage
- Suggested improvement or test case
- Final merge recommendation (approve / request changes / needs discussion)

### DigiOne-specific review checklist

- [ ] Supabase queries use server client (not browser client) in server components / route handlers
- [ ] Dynamic route params are validated before use (no raw `params.slug` without type check)
- [ ] New dashboard components respect the brand theme token system (CSS vars, not hardcoded colors)
- [ ] No `console.log` left in production paths
- [ ] `npx tsc --noEmit` passes with no new errors
