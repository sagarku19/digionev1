// Claims guest purchases keyed on the buyer's verified email into durable
// user_product_access. Retryable + idempotent. Email is read from the
// authenticated session (JWT), never from the request body.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { claimGuestEntitlements } from '@/lib/server/entitlements';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!user.email) {
    return NextResponse.json({ claimed: 0 });
  }

  try {
    const claimed = await claimGuestEntitlements(user.email, user.id);
    return NextResponse.json({ claimed });
  } catch (err) {
    console.error('[claim-entitlements]', err);
    return NextResponse.json({ error: 'Failed to claim entitlements' }, { status: 500 });
  }
}
