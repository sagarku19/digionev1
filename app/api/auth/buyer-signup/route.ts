// Frictionless buyer signup: creates a confirmed account with NO verification
// email. Role goes in user_metadata at create time (the handle_new_user trigger
// reads it), then is promoted to server-controlled app_metadata separately.
// The client signs in afterward; claiming runs once a session exists.

import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { rateLimit } from '@/lib/server/rate-limit';
import { normalizeEmail, isValidEmail } from '@/lib/shared/email';

export async function POST(req: Request) {
  if (!(await rateLimit(req, 'buyer-signup', { max: 10, windowSeconds: 60 }))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let body: { email?: string; password?: string; fullName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? normalizeEmail(body.email) : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const admin = createServiceClient();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName || email.split('@')[0], role: 'buyer' },
  });

  if (error || !data.user) {
    const already = (error?.message ?? '').toLowerCase().includes('already');
    return NextResponse.json(
      { error: already ? 'An account with this email already exists' : 'Could not create account' },
      { status: already ? 409 : 500 }
    );
  }

  // Promote role into server-controlled app_metadata (proxy.ts reads this).
  const { error: promoteErr } = await admin.auth.admin.updateUserById(data.user.id, {
    app_metadata: { role: 'buyer' },
  });
  if (promoteErr) {
    console.error('[buyer-signup] role promotion failed:', promoteErr.message);
  }

  return NextResponse.json({ ok: true });
}
