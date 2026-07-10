-- Align payment_submissions.payment_status CHECK with the code's vocabulary.
--
-- The app writes/reads 'pending' | 'completed' | 'failed' | 'refunded'
-- (src/lib/server/fulfillment.ts fulfillPaymentLinkSubmission → 'completed';
--  app/api/webhook/cashfree/route.ts + app/payment/status/page.tsx read
--  'completed'/'refunded', write 'failed'), but the constraint only allowed
-- 'pending' | 'paid' | 'failed'. The claim UPDATE to 'completed' therefore threw a
-- check-constraint violation, the webhook returned 500, Cashfree retried forever,
-- and the creator was NEVER credited for payment-link (custom-amount) sales.
-- 'paid' is retired — the code never writes it.
--
-- Idempotent.

alter table public.payment_submissions
  drop constraint if exists payment_submissions_payment_status_check;

-- Migrate any legacy 'paid' rows to the code's terminal value.
update public.payment_submissions
   set payment_status = 'completed'
 where payment_status = 'paid';

alter table public.payment_submissions
  add constraint payment_submissions_payment_status_check
  check (payment_status = any (array['pending', 'completed', 'failed', 'refunded']));
