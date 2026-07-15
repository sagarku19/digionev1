import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database.types';

const GUARDED_PREFIXES = ['/dashboard', '/account'];

const SHORTLINK_DOMAIN = (process.env.NEXT_PUBLIC_SHORTLINK_DOMAIN || '')
  .toLowerCase()
  .split(':')[0];
const SHORTLINK_RESERVED = new Set(['robots.txt', 'sitemap.xml', 'report', 'favicon.ico']);

function isMainHost(hostHeader: string): boolean {
  const host = hostHeader.toLowerCase().split(':')[0];
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000')
    .toLowerCase()
    .split(':')[0];

  if (host === root || host.endsWith(`.${root}`)) return true;
  if (host === 'digione.ai' || host.endsWith('.digione.ai')) return true;
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (host.endsWith('.vercel.app')) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return false;
}

export default async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get('host') || '';

  // 0. Dedicated short-link domain — bare-root {shortdomain}/{code}.
  //    Match BOTH the apex and the `www.` host, so it works no matter which one
  //    Vercel makes primary (an apex↔www redirect lands real traffic on either).
  const bareHost = hostname.toLowerCase().split(':')[0];
  const isShortlinkHost =
    !!SHORTLINK_DOMAIN &&
    (bareHost === SHORTLINK_DOMAIN || bareHost === `www.${SHORTLINK_DOMAIN}`);
  if (isShortlinkHost) {
    if (url.pathname === '/') {
      // Branded short-domain landing page (CTA → the DigiOne app). Rewrite (not
      // redirect) so the page renders on the short domain itself.
      url.pathname = '/link-home';
      return NextResponse.rewrite(url);
    }
    const code = url.pathname.slice(1);
    if (SHORTLINK_RESERVED.has(code) || code.includes('/')) {
      return NextResponse.next();
    }
    url.pathname = `/api/s/${code}`;
    return NextResponse.rewrite(url);
  }

  // 1. Custom-domain rewrite — exact host matching, no Supabase client
  if (!isMainHost(hostname)) {
    url.pathname = `/_custom/${hostname}${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // 2. Unguarded paths (marketing, storefronts, discover, checkout) — zero auth work
  const isGuarded = GUARDED_PREFIXES.some((p) => url.pathname.startsWith(p));
  if (!isGuarded) {
    return NextResponse.next();
  }

  // 3. Guarded path, no Supabase auth cookie — redirect without a network call
  const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-'));
  if (!hasAuthCookie) {
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('returnUrl', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // 4. Guarded path with a cookie — verify the JWT and refresh the session
  let supabaseResponse = NextResponse.next({ request: { headers: request.headers } });
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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('returnUrl', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (url.pathname.startsWith('/dashboard')) {
    // Server-controlled app_metadata only — user_metadata is client-editable
    const role = user.app_metadata?.role;
    if (role !== 'creator' && role !== 'super_admin') {
      url.pathname = '/account/library';
      url.search = '';
      return NextResponse.redirect(url);
    }
    // Admin surfaces are super_admin-only (defense-in-depth on top of RLS + per-route DB role checks).
    if (url.pathname.startsWith('/dashboard/admin') && role !== 'super_admin') {
      url.pathname = '/dashboard';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Everything except: /api/* (routes do their own auth and return 401 inline),
     * Next.js internals, and static assets.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
