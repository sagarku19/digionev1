import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { isSafeInternalPath } from '@/lib/safe-redirect';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next');
  const next = isSafeInternalPath(nextParam) ? nextParam : '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Promote the signup-requested role into server-controlled app_metadata.
      // user_metadata is client-editable and must never open the dashboard gate.
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !user.app_metadata?.role) {
        const requested = user.user_metadata?.role;
        const role = requested === 'creator' ? 'creator' : 'buyer'; // 'user'/absent → buyer
        try {
          const admin = createServiceClient();
          await admin.auth.admin.updateUserById(user.id, { app_metadata: { role } });
          // Re-mint the JWT so proxy.ts sees the new app_metadata immediately
          await supabase.auth.refreshSession();
        } catch (promoteErr) {
          console.error('[auth/callback] role promotion failed:', promoteErr);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error('Callback error exchanging code:', error);
  }

  return NextResponse.redirect(
    `${origin}/login?error=Could not verify email. Try signing up again or disabling Email Confirmations locally.`
  );
}
