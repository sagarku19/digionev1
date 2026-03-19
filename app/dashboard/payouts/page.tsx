// Payouts page — redirects to earnings page which has payout management built in.
// DB tables: none
import { redirect } from 'next/navigation';

export default function PayoutsPage() {
  redirect('/dashboard/earnings');
}
