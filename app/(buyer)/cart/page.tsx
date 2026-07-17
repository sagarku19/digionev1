'use client';

// Discover / cart checkout — buying happens right here (products + total on the
// left, buyer details + pay on the right). No hop to a separate checkout page.

import CheckoutExperience from '@/components/store/CheckoutExperience';

export default function CartPage() {
  return <CheckoutExperience kicker="/cart" />;
}
