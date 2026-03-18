# DigiOne — Antigravity Overrides

## Manager View behaviour
When dispatching agents in Manager View:
- Each agent works in its own workspace tab
- Agent outputs an Artifact plan BEFORE writing any code — wait for approval
- Use Agent-Assisted mode for all payment/auth/KYC code (Review-Driven for those)
- Use Agent-Driven mode only for UI components and dashboard pages

## Browser agent instructions
When using browser to verify:
- Test at localhost:3000 (Next.js dev server)
- Verify mobile layout at 390px viewport width
- Check dark mode by toggling OS preference
- Verify Supabase RLS by testing as both creator and buyer sessions

## Knowledge Base
The following context is always available:
- DigiOne has 72 database tables — full schema in docs/digione_complete.sql
- Platform fee: Free=10%, Plus=7%, Pro=5%
- URL routing: /:slug (main store), /:slug/:childSlug (child sites), see docs/digione_public_pages_design.md §23
- Cashfree webhook HMAC must be verified before ANY order status update

## Artifact format
Every agent must produce an Artifact containing:
1. Files created/modified (list with paths)
2. DB tables read/written
3. Environment variables needed
4. Known gaps or TODOs
5. What to test manually