---
name: cashfree-payments
description: Use when working with payments, checkout, orders, webhooks, or payouts.
  Triggers on: "payment", "checkout", "order", "cashfree", "webhook", "payout", "UPI"
---

# Cashfree Integration — DigiOne

## Order creation flow
1. POST /api/checkout/create — validate cart, create Cashfree order, INSERT orders (pending)
2. Return payment_session_id to client
3. Client loads Cashfree JS SDK, opens payment modal
4. User pays → Cashfree sends webhook to /api/webhook/cashfree

## Webhook handler — ALL 11 side effects must run atomically
1. Verify HMAC: crypto.createHmac('sha256', CASHFREE_SECRET).update(rawBody).digest('hex')
2. UPDATE orders SET status='completed'
3. INSERT creator_revenue_shares (per order_item, per creator)
4. UPDATE creator_balances (total_earnings += , pending_payout +=)
5. INSERT transaction_ledger (sale_earning, direction: credit, with prev_hash chain)
6. INSERT user_product_access (if user_id not null)
7. INSERT product_licenses (if products.is_licensable = true)
8. INSERT notifications (type: 'sale') for creator
9. UPDATE coupons.current_uses += 1 (if coupon applied)
10. INSERT order_referrals (if referral code used)
11. Trigger email via Resend

## Environment variables needed
CASHFREE_APP_ID, CASHFREE_SECRET_KEY, CASHFREE_WEBHOOK_SECRET
NEXT_PUBLIC_CASHFREE_ENV: 'sandbox' | 'production'