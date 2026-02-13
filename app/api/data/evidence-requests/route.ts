import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('v_evidence_requests_with_context')
      .select('*')
      .limit(200);

    if (error) throw error;
    return NextResponse.json({ rows: data || [] }, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Fetch error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

