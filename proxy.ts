import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

export default async function proxy(request: NextRequest) {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getSession() validates the JWT locally from the cookie — no Supabase
  // network call on every navigation. Only hits the network when the refresh
  // token actually needs to be used (~once per hour). For routing decisions
  // this is sufficient and much faster than getUser().
  // API routes handling sensitive operations (orders, payments) should call
  // getUser() independently for server-side verification.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const url = request.nextUrl.clone();

  // Custom domain interception
  const hostname = request.headers.get('host') || '';
  // Check if the current hostname is our root domain or localhost
  const isMainDomain =
    hostname.includes('digione.ai') ||
    hostname.includes('localhost') ||
    hostname.includes('vercel.app') ||            // ✅ Vercel preview deployments
    hostname.startsWith('192.168.') ||            // ✅ Local network
    hostname.startsWith('10.') ||                 // ✅ Local network (optional)
    hostname.includes(process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000');


  // If this is a custom domain, rewrite the request to /_custom/[domain]/[path]
  // Provide an escape hatch for /api paths and static files natively supported by Next.js
  if (!isMainDomain && !url.pathname.startsWith('/api')) {
    url.pathname = `/_custom/${hostname}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // Auth guard logic for main domain paths
  // 1. If hitting /dashboard/*
  if (url.pathname.startsWith('/dashboard')) {
    if (!user) {
      // Unauthenticated -> redirect to /login
      url.pathname = '/login';
      url.searchParams.set('returnUrl', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    // Check if user is creator directly from the encrypted auth session JWT
    const role = user.user_metadata?.role;

    if (role !== 'creator' && role !== 'super_admin') {
      // Buyer trying to access dashboard -> redirect to /account/library
      url.pathname = '/account/library';
      return NextResponse.redirect(url);
    }
  }

  // 2. If hitting /account/*
  if (url.pathname.startsWith('/account')) {
    if (!user) {
      url.pathname = '/login';
      url.searchParams.set('returnUrl', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
