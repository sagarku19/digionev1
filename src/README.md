# Source Directory (`/src`)

The `/src` directory houses the core business logic, user interface components, data-fetching layers, and global types for **DigiOne**. While the `/app` directory manages the Routing and API endpoints, `/src` handles the actual execution, display, and state management of the application.

## Directory Structure & Patterns

### 1. Components (`/src/components`)
Components are domain-driven and explicitly segregated to prevent UI contamination across different user flows:
- **`/dashboard`**: Components exclusively used in the authenticated SaaS portal. Highly dependent on Zustand local state (e.g. `useCreator`, `useNotifications`). Heavily features CSS variable theming like `var(--bg-secondary)`. Examples include the complex `Sidebar.tsx` rendering Workspace, Money, and Grow segments.
- **`/storefront`**: Public-facing components representing the customized Link-in-Bio, upsell funnels, products, and checkout wrappers. Focuses purely on display logic and conversion performance.
- **`/marketing`**: High-conversion landing components (Hero sections, FAQs, pricing tables) focused purely on driving creator sign-ups.
- **`/store`**: Reusable generic store elements that span multiple storefront archetypes.
- **`/ui`**: Foundational, atomic, and strictly reusable primitives (Buttons, Inputs, Modals, Spinners).

### 2. Custom Hooks (`/src/hooks`)
All data fetching goes through TanStack Query hooks — never raw Supabase calls in components:

| Hook | Returns |
|---|---|
| `useCreator()` | `{ profile }` — authenticated creator's profile |
| `useProducts()` | `{ products }` — creator's product list |
| `useNotifications()` | `{ unreadCount, notifications }` |
| `useOrders()` | `{ orders }` |
| `useEarnings()` | `{ earnings, stats }` |
| `useCustomers()` | `{ customers }` |
| `useSites()` | `{ sites }` — creator's storefront sites |
| `useStorefront(slug)` | Storefront data for a given slug |
| `useCart()` | Cart state for buyer checkout |
| `useAnalytics()` | Analytics data |
| `useCoupons()` | Coupon management |
| `useAffiliates()` | Affiliate program data |

### 3. Lib & Utilities (`/src/lib`)
Essential integrations handling cross-app logic:
- **Supabase Client**: `lib/supabase/client.ts` initializes the singleton pattern for Supabase requests in the browser. *Rule: `createClient()` must only ever be imported from this file, never invoked directly within a component.*
- Integrations for formats (Date, Currency [INR format `₹X,XXX`]).

### 4. Contexts (`/src/contexts`)
- **`DashboardThemeContext.tsx`**: Provides `useTheme()` → `{ theme, setTheme }`. Persists selection in `localStorage` as `'dashboard-theme'`. Applied as `.dark` class on `#dashboard-root`. CSS variables for both modes are defined in `globals.css`.

### 5. Database Types (`/src/types`)
- **`database.types.ts`**: The single source of truth auto-generated from the Supabase schema. All API responses, props, and client states must strictly bind to the types defined here. Never use `any` for database rows. Run `npm run update-types` after schema migrations — never edit this file manually.

## UI / Dev Rules implemented in `src`
- **Tailwind Native**: All styling uses Tailwind utility classes. Inline `style={{}}` is permitted only for injecting dynamic CSS variables (e.g. `var(--bg-secondary)`) — not for arbitrary values.
- **Dashboard theming**: Use `var(--bg-primary)`, `var(--bg-secondary)`, `var(--border)` CSS variables — never hardcode hex colors in dashboard components.
- **Storefront theming**: Use `var(--creator-primary)`, `var(--creator-text)`, `var(--creator-bg)` — never import dashboard variables into storefront components.
- **Icons**: `lucide-react` only across the entire codebase. Any other icon library is a hard no.
- **Strict Mode**: TypeScript strict mode is non-negotiable. Zero `any` without a documented reason.
