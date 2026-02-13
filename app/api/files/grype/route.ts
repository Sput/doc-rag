import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'grype-results.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    const json = JSON.parse(raw);
    return NextResponse.json(json, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'File read error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

