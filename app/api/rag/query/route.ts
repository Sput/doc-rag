import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { embedTexts, chatComplete } from '@/lib/openai';

type SourceRow = {
  id: string;
  source_type: 'doc' | 'json' | 'db';
  source_id: string;
  chunk_index: number;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

const SOURCE_TYPES: SourceRow['source_type'][] = ['doc', 'json', 'db'];

function buildContext(sources: Record<string, SourceRow[]>) {
  const sections = SOURCE_TYPES.map((type) => {
    const rows = sources[type] || [];
    if (rows.length === 0) return '';

    const body = rows
      .map((row, idx) => {
        return [
          `Source ${idx + 1} (${type})`,
          `ID: ${row.source_id}`,
          `Content: ${row.content}`,
        ].join('\n');
      })
      .join('\n\n');

    return `=== ${type.toUpperCase()} SOURCES ===\n${body}`;
  })
    .filter(Boolean)
    .join('\n\n');

  return sections;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = (body?.query || '').trim();
    const topK = Number(body?.topK || 4);

    if (!query) {
      return NextResponse.json({ error: 'Missing query.' }, { status: 400 });
    }

    const [queryEmbedding] = await embedTexts([query]);

    const perSource = Math.min(Math.max(topK, 3), 8);
    const results = await Promise.all(
      SOURCE_TYPES.map(async (sourceType) => {
        const { data, error } = await supabaseAdmin.rpc('match_rag_chunks', {
          query_embedding: queryEmbedding,
          match_count: perSource,
          filter_source_type: sourceType,
        });

        if (error) throw error;
        return [sourceType, (data || []) as SourceRow[]] as const;
      })
    );

    const sources = Object.fromEntries(results) as Record<string, SourceRow[]>;
    const context = buildContext(sources);

    const systemPrompt =
      'You are a helpful assistant answering questions using retrieved context. ' +
      'Cite relevant sources in your response by referencing their source type and ID. ' +
      'If the context is insufficient, say so and explain what is missing.';

    const answer = await chatComplete([
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Question:\n${query}\n\nContext:\n${context}`,
      },
    ]);

    return NextResponse.json({
      answer,
      sources,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
