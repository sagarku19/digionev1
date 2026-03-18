---
description:  When schema changes, sync types and update all affected hooks/components
---

## Steps
### 1. Regenerate types
Run: npx supabase gen types typescript --local > src/types/database.types.ts

### 2. Find all usages of changed table
Search codebase for the table name across hooks, API routes, and components.

### 3. Update hooks
Fix any TypeScript errors in src/hooks/ caused by column name changes.

### 4. Update API routes
Fix any column references in app/api/ Route Handlers.

### 5. Run type check
Run: npx tsc --noEmit
Fix all errors before marking complete.