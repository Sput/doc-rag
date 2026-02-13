import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'SSP.docx');
    const buf = await fs.readFile(filePath);
    return new NextResponse(buf, {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'inline; filename="SSP.docx"',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'File read error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

