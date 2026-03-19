---
name: supabase-schema
description: Use when working with any Supabase table, query, RLS policy, or database type.
  Triggers on: "table", "query", "supabase", "RLS", "schema", "migration", "database"
---

# DigiOne Supabase Schema Reference

## Critical tables and their primary keys
- users: id (uuid, = auth.uid() via auth_provider_id)
- profiles: id (uuid), user_id FK → users.id
- sites: id, creator_id FK → profiles.id, slug (UNIQUE for main sites)
- products: id, creator_id FK → profiles.id
- orders: id, user_id FK → users.id (nullable for guest), guest_lead_id FK → guest_leads.id
- creator_balances: creator_id (UNIQUE) — server-write only
- transaction_ledger: bigserial id — append-only, never UPDATE or DELETE

## Auth pattern
```typescript
// Always use this pattern — never call auth.getUser() directly in components
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
// Then join to profiles via auth_provider_id = user.id
```

## RLS-aware queries
All queries are automatically scoped by RLS — no manual creator_id filter needed:
```typescript
// This returns only the current creator's products — RLS handles scoping
const { data, error } = await supabase.from('products').select('*')
```

## Service-role-only tables (Route Handlers only)
creator_balances, transaction_ledger, orders (INSERT), creator_revenue_shares
Use: import { createServiceClient } from '@/lib/supabase/service'