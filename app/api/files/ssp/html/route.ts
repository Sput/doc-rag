import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'SSP.docx');
    const buffer = await fs.readFile(filePath);
    const { value: html } = await mammoth.convertToHtml({ buffer });

    const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SSP Preview</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, "Apple Color Emoji", "Segoe UI Emoji"; line-height: 1.55; padding: 16px; color: #111827; }
    h1, h2, h3 { line-height: 1.2; margin-top: 1.2em; }
    p { margin: 0.6em 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
    code, pre { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 2px 4px; }
    img { max-width: 100%; height: auto; }
    a { color: #2563eb; }
  </style>
  </head>
<body>${html}</body>
</html>`;

    return new NextResponse(page, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to render SSP.html';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

