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

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  return redirectTo('/login');
}
