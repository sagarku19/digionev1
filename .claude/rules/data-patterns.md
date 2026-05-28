---
noteId: "c2eafa305a5711f183978dfe119e58b2"
tags: []

---

# Data Fetching Patterns

## Client Components (dashboard)
```typescript
// Always use TanStack Query via custom hooks — never raw Supabase in components
const { products } = useProducts();
const { profile } = useCreator();
const { unreadCount } = useNotifications();
```

## Server Components (storefront, marketing)
```typescript
// Server supabase client is correct here
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();
```

## Route Handlers (API)
```typescript
import { createClient } from '@/lib/supabase/server';
// server client only — never browser client in route handlers
```
