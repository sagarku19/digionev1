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
Abstracted React behavior for clean component files:
- State hooks (`useCreator.ts`, `useNotifications.ts`) tightly coupled with Zustand bounding global client state.
- Data fetching hooks (likely utilizing `@tanstack/react-query`) to seamlessly bind to Server Route Handlers without complex internal logic.

### 3. Lib & Utilities (`/src/lib`)
Essential integrations handling cross-app logic:
- **Supabase Client**: `lib/supabase/client.ts` initializes the singleton pattern for Supabase requests in the browser. *Rule: `createClient()` must only ever be imported from this file, never invoked directly within a component.*
- Integrations for formats (Date, Currency [INR format `₹X,XXX`]).

### 4. Database Types (`/src/types`)
- **`database.types.ts`**: The single source of truth auto-generated from the Supabase 72-table schema. All API responses, props, and client states must strictly bind to the types defined here. Never inject implicit `any` fallback.

## UI / Dev Rules implemented in `src`
- **Tailwind Native**: All files rely strictly on Tailwind functional CSS (`var(--bg-tertiary)`). Inline styles are implicitly banned unless piping dynamic variables.
- **Icons**: Globally utilizing `lucide-react` across the dashboard suite.
- **Strict Mode**: TypeScript is non-negotiable. 
