'use client';

// Creator-site checkout (single-page sales sites, store sites) — same self-
// contained buy experience as /cart. Storefront "Buy Now" adds to the cart then
// routes here; the buyer completes payment on this page.

import CheckoutExperience from '@/components/store/CheckoutExperience';

export default function CheckoutPage() {
  return <CheckoutExperience kicker="/checkout" />;
}
