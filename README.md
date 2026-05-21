# DigiOne — Creator SaaS Platform

> **DigiOne** is a full-featured SaaS platform built for Indian digital creators. It provides the ecosystem required to manage digital products, assemble Link-in-Bio pages, configure automated DM marketing, and securely process payouts via Cashfree.

---

## 📚 Codebase Documentation (Directory Level)

Because of the scale of the DigiOne project, the core structure is heavily segmented. We have documented the internal logic, rules, and architecture inside dedicated `README.md` files localized to their respective domains. **Please read them before contributing to those specific zones:**

*   📂 **[`/app` Directory Documentation](./app/README.md)** 
    *   Covers Next.js 16 Routing, the Server/Client boundaries, API endpoints (Webhook & Checkout structures), the Public Storefront rendering Engine, and the protected `/dashboard` layout.
*   📂 **[`/src` Directory Documentation](./src/README.md)** 
    *   Covers Domain Components (`/storefront`, `/marketing`, `/ui`), Zustand Client State Management, TanStack Query server caching, Custom Hooks, and Utility singletons.

---

## 🚀 Tech Stack Highlights

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/) (strict mode)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/)
- **State Flow**: [Zustand](https://github.com/pmndrs/zustand) (Client UI), [TanStack Query v5](https://tanstack.com/query/v5/) (Server Cache)
- **Backend / BaaS**: [Supabase](https://supabase.com/) (Auth + Postgres + Storage Bucket)
- **Payments Platform**: [Cashfree](https://www.cashfree.com/) (`@cashfreepayments/cashfree-js`)
- **Charts**: recharts
- **Drag & Drop**: @dnd-kit
- **Image Crop**: react-easy-crop
- **Icons**: lucide-react

---

## 🚫 Non-Negotiable System Rules

All code merged into `main` must pass these static architectural rules (Derived from `AGENTS.md`):

### 1. Database & Supabase Interaction
*   **No Component Singletons**: You must NEVER run `createClient()` inside a React component. Always import instances directly from `lib/supabase/client.ts`.
*   **Security & Keys**: Hardcoding Supabase URL/Anon keys is strictly prohibited. Leverage `process.env.NEXT_PUBLIC_SUPABASE_URL` natively.
*   **Immutable Finances**: The browser client (and `/dashboard`) is **blocked** from writing to the `creator_balances`, `transaction_ledger`, or `orders` tables. There are zero client-write RLS policies. The UI must invoke `/api/*` Route Handlers running Secure Service Keys to execute these transactions.
*   **No Admin Invocations**: Refrain from using `supabase.auth.admin.*` inside client code. 
*   **Types**: Database column names derive strictly from `src/types/database.types.ts`. Extrapolating or forcing `any` types on database payloads is banned. 

### 2. Styling & UX Design
*   **Currency**: The entire platform operates in **INR (₹)**. Format currency strictly via `₹X,XXX` (Indian Number Formatting rules).
*   **Tailwind Exclusivity**: All visual components must utilize Tailwind utility classes exclusively. Inline style objects (`style={{...}}`) are only permitted when piping dynamic CSS Variables (`var(--bg-secondary)`) dictated by the global theme engine.

---

## 💻 Local Setup & Development

### 1. Installation
```bash
npm install
```

### 2. `.env.local` Requirements
Create your localized `.env` file to mount the external APIs required to run the local dev server:
```env
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

CASHFREE_APP_ID="your-cashfree-app-id"
CASHFREE_SECRET_KEY="your-cashfree-secret-key"
```

### 3. Execution
```bash
# Start Next.js Development Server (Port 3000)
npm run dev

# Production build
npm run build

# Run ESLint compliance evaluation prior to commits
npm run lint

# Regenerate Supabase types from schema (run after DB migrations)
npm run update-types
```
