import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.redirect(new URL('/login?error=Email%20and%20password%20are%20required.', request.url), {
      status: 303,
    });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', error.message);
    return NextResponse.redirect(loginUrl, { status: 303 });
  }

  return NextResponse.redirect(new URL('/', request.url), { status: 303 });
}
