import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { getSupabaseBrowserEnv } from './env';

const PUBLIC_PATHS = ['/login', '/auth'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search);

  return NextResponse.redirect(url);
}

function safeRedirectUrl(value: string, requestUrl: string) {
  if (!value.startsWith('/') || value.startsWith('//')) {
    return new URL('/', requestUrl);
  }

  return new URL(value, requestUrl);
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { supabaseUrl, supabaseKey } = getSupabaseBrowserEnv();

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;

  if (!claims && !isPublicPath(request.nextUrl.pathname)) {
    if (request.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    return redirectToLogin(request);
  }

  if (claims && request.nextUrl.pathname === '/login') {
    const redirect = request.nextUrl.searchParams.get('redirect') || '/';
    return NextResponse.redirect(safeRedirectUrl(redirect, request.url));
  }

  return response;
}
