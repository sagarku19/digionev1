---
description: description: Scaffold a new DigiOne dashboard page with table, filters, and drawer
---

## Steps
### 1. Read the spec
Read docs/digione_dashboard_design.md and find the section for this page.
Extract: route, schema tables, columns needed, status pills, actions.

### 2. Create the page file
Path: app/dashboard/{pageName}/page.tsx
Include: PageHeader component, DataTable with correct columns, loading skeleton.

### 3. Create the hook
Path: src/hooks/use{Resource}.ts
Use React Query + Supabase. Handle error and loading states.
Column names must match src/types/database.types.ts exactly.

### 4. Add to sidebar
Update src/components/dashboard/Sidebar.tsx — add nav item with correct icon.

### 5. Verify
Open browser at localhost:3000/dashboard/{pageName}
Confirm: data loads, table renders, empty state shows when no data.