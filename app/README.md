# App Directory (`/app`)

This directory contains the entire Next.js 16 App Router routing structure for **DigiOne**. It separates the application into server components, client components (where required for interactivity), and backend API route handlers.

## Architecture & Layout

The app is functionally segmented horizontally by purpose:

### Route Groups
- **`/(auth)`**: Supabase Authentication UI flows — login, signup, and password reset.
- **`/(marketing)`**: Public-facing landing pages of DigiOne designed to convert visitors to creator signups.
- **`/(storefront)`**: Dynamic public rendering engine for creators' customized pages.
    - `/link/[username]` — Link-in-Bio page
    - `/site/[slug]` — Single-page sales site
    - `/store/[slug]` — Product grid store
- **`/(buyer)`**: Isolated checkout and post-purchase (success) experiences for buyers interacting with creator stores.

### Private Dashboards
- **`/dashboard`**: The secure CRM space. All subdirectories are gated by middleware.
    - `/analytics`, `/products`, `/earnings`, `/customers`, `/orders` — core creator management
    - `/marketing` — coupons, affiliates, leads, and referrals
    - `/automation` — email, WhatsApp, Telegram, and Google Sheets integrations
    - `/sites` — visual storefront builder (Link-in-Bio, Single Page, Store)
    - `/settings` — profile, billing, and subscription

### Route Handlers (APIs)
- **`/api`**: Secure Server-Side logical handlers that interact directly with the database or external SDKs.
    - **`/auth`**: Custom backend hooks for sessions.
    - **`/checkout`**: Integrates with the Cashfree Node SDK to invoke Payment Gateways and create link instances (`/create`, `/payment-link`).
    - **`/upload`**: Supabase Storage bucket handling.
    - **`/webhook`**: Cashfree Webhook listeners ensuring async payment confirmation securely mutates the `transaction_ledger` without client exposure.

## Key Rules for `/app`
1. **Never write `createClient()` inside a client component.** Always import the pre-configured instance.
2. No database mutations affecting revenue (`creator_balances`, `orders`) should occur in the client interface inside `/dashboard`. Instead, the client must trigger a fetch command to `/api/*` which securely executes the database write via Server Role or constrained RLS.
