import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

function redirectTo(path: string) {
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: path,
    },
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || typeof password !== 'string') {
    return redirectTo('/login?error=Email%20and%20password%20are%20required.');
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return redirectTo(`/login?error=${encodeURIComponent(error.message)}`);
  }

  return redirectTo('/');
}
