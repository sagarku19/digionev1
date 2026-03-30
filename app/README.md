# App Directory (`/app`)

This directory contains the entire Next.js 15 App Router routing structure for **DigiOne**. It separates the application into server components, client components (where required for interactivity), and backend API route handlers.

## Architecture & Layout

The app is functionally segmented horizontally by purpose:

### Route Groups
- **`/(auth)`**: Contains the Supabase Authentication UI flows. Everything needed for a creator to login, signup, or manage their session.
- **`/(marketing)`**: The public-facing splash/landing pages of DigiOne designed to convert incoming creators to signups.
- **`/(storefront)`**: The dynamic public rendering engine for creators' customized pages. 
    - E.g. `/link/[username]` represents a Link-In-Bio page. Waitlists (`/w`), products (`/p`), upsells (`/s`), and blogs (`/blog`) are constructed here relying heavily on `generateStaticParams` or Server-Side Rendering (SSR).
- **`/(buyer)`**: The isolated checkout and post-purchase (success) experiences for end-users interacting with creator stores.

### Private Dashboards
- **`/dashboard`**: The secure CRM space. All subdirectories (`/analytics`, `/products`, `/autodm`, `/earnings`, etc.) are heavily gated by middleware.
    - **`/sites`**: Houses the visual builder environment, including `/sites/new` and `/sites/edit`, which control the Link-in-Bio and Storefront generation.

### Route Handlers (APIs)
- **`/api`**: Secure Server-Side logical handlers that interact directly with the database or external SDKs.
    - **`/auth`**: Custom backend hooks for sessions.
    - **`/checkout`**: Integrates with the Cashfree Node SDK to invoke Payment Gateways and create link instances (`/create`, `/payment-link`).
    - **`/upload`**: Supabase Storage bucket handling.
    - **`/webhook`**: Cashfree Webhook listeners ensuring async payment confirmation securely mutates the `transaction_ledger` without client exposure.

## Key Rules for `/app`
1. **Never write `createClient()` inside a client component.** Always import the pre-configured instance.
2. No database mutations affecting revenue (`creator_balances`, `orders`) should occur in the client interface inside `/dashboard`. Instead, the client must trigger a fetch command to `/api/*` which securely executes the database write via Server Role or constrained RLS.
